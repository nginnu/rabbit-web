// The one line scripts/bump-marker.sh rewrites.
//
// It lives in its own file so the script never has to edit page.tsx: a sed
// against JSX breaks the moment the markup is reformatted, and a broken home
// page looks exactly like a broken deploy.
export const DEPLOY_MARKER = "2026-08-26 20:15:33 +0700 · 28fd5d16";
export const DEPLOY_TINT = 2;
