// The one line scripts/bump-marker.sh rewrites.
//
// It lives in its own file so the script never has to edit page.tsx: a sed
// against JSX breaks the moment the markup is reformatted, and a broken home
// page looks exactly like a broken deploy.
export const DEPLOY_MARKER = "2026-08-24 19:46:22 +0700 · dde2fccd";
export const DEPLOY_TINT = 1;
