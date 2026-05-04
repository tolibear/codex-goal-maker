# T001: Extension Model Map

Task: `T001`
Kind: `scout`
Status: `done`

## Summary

The scalable frame is `extend`: optional extension folders live at the repo root under `extend/`, and catalog metadata lives at `extend/catalog.json`. The npm CLI should read the GitHub-hosted catalog so extension discovery can change without publishing a new npm version.

Board publishing is the first likely extension family, but the extension surface should also support unrelated add-ons such as role guidance, reports, intake tools, and external channel publishing.

## Recommended Vocabulary

- Repo surface: `extend/`
- Items inside `extend/`: extensions
- Catalog file: `extend/catalog.json`
- Public action for external surfaces: publish
- Avoid umbrella words: export, sync, capabilities

## Architecture Notes

Core should own:

- skill installation;
- agent installation;
- board checker scripts;
- extension catalog discovery;
- checksum-verified extension installation;
- extension doctor checks.

Extensions should own:

- provider-specific behavior;
- provider docs;
- auth requirements;
- fixtures and tests;
- optional role or reporting guidance.

No extension may define a second meaning of `state.yaml`.

## Candidate Tasks

- Add a catalog-backed `goal-maker extend` command.
- Add root `extend/` documentation.
- Keep package-only CLI/tests out of the installable skill folder.
- Add repo agent guidance so future improvements consider docs, skill instructions, CLI, tests, examples, and extensions together.
