#!/usr/bin/env bash
#
# Rewrite the deploy marker on the home page and commit it.
#
#   scripts/bump-marker.sh                 timestamp + random token
#   scripts/bump-marker.sh "any text"      that text instead
#   scripts/bump-marker.sh --dry-run       show the diff, commit nothing
#
# Push is deliberately not here. The commit is the trigger for everything
# downstream — image build, promote, ArgoCD sync — and that should start when a
# person decides it starts, not as a side effect of running a script.

set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
marker_file="$repo/app/deploy-marker.ts"

dry_run=0
text=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=1 ;;
    *) text="$arg" ;;
  esac
done

# Taken from the script's own location rather than $PWD, so it works from any
# directory. A bare relative path would silently edit nothing when run from the
# repo root's parent, and the commit that follows would be empty.
[ -f "$marker_file" ] || {
  echo "no marker file at $marker_file" >&2
  exit 1
}

backup="$(mktemp)"
cp "$marker_file" "$backup"
restore_on_dry_run() {
  [ "$dry_run" -eq 1 ] && cp "$backup" "$marker_file"
  rm -f "$backup"
}
trap restore_on_dry_run EXIT

if [ -z "$text" ]; then
  # Local time with offset, not UTC: the number is read next to a wall clock
  # while watching a pod roll, and a UTC stamp seven hours behind reads as a
  # deploy that did not happen.
  stamp="$(date '+%Y-%m-%d %H:%M:%S %z')"
  # Four bytes of randomness so two bumps inside the same second are still
  # distinguishable — the case that happens when a rollout is being retried.
  token="$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"
  text="$stamp · $token"
fi

# A double quote or backslash in the argument would end the TypeScript string
# early and the build fails on a syntax error nobody typed.
escaped="$(printf '%s' "$text" | sed 's/[\\"]/\\&/g')"

python3 - "$marker_file" "$escaped" <<'PY'
import pathlib, re, sys
path, value = pathlib.Path(sys.argv[1]), sys.argv[2]
src = path.read_text()
new, n = re.subn(
    r'(export const DEPLOY_MARKER = ").*(";)',
    lambda m: m.group(1) + value + m.group(2),
    src,
)
# The regex not matching means the file was renamed or reformatted. Writing the
# file back unchanged and committing it would report success on a deploy marker
# that never moved.
if n != 1:
    sys.exit(f"DEPLOY_MARKER not found in {path} — {n} matches")
path.write_text(new)
PY

echo "marker: $text"

if [ "$dry_run" -eq 1 ]; then
  diff -u "$backup" "$marker_file" || true
  echo "dry run — file restored, nothing committed"
  exit 0
fi

# Only this path is staged. Anything else in the tree is somebody's work in
# progress, and sweeping it into a marker commit is how unrelated changes ship
# without being reviewed.
git -C "$repo" add app/deploy-marker.ts

if git -C "$repo" diff --cached --quiet -- app/deploy-marker.ts; then
  echo "marker unchanged — nothing to commit"
  exit 0
fi

git -C "$repo" commit -q -m "chore(web): bump deploy marker to $text"
git -C "$repo" --no-pager log --oneline -1
echo
echo "not pushed. when you are ready:  git -C $repo push"
