# T004: Root Extend Folder

Task: `T004`
Kind: `pm`
Status: `done`

## Summary

Added a visible root `extend/` folder with documentation so GitHub shows the extension surface even before real extensions exist.

Commit:

- `17c65c9 Document extension folder`

## Files Touched

- `README.md`
- `extend/README.md`

## Receipt Notes

The folder intentionally contains only documentation for now. Git cannot track an empty directory, and the product decision was to avoid bundling sample extensions until a real extension is ready.

The README now says extensions live under `extend/` and move through the GitHub-hosted `extend/catalog.json`.
