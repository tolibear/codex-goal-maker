# T002: Architecture Decision

Task: `T002`
Kind: `judge`
Status: `done`

## Decision

Use `extend` as the high-level optional surface and call each item an extension. Keep the default catalog GitHub-hosted at:

```text
https://raw.githubusercontent.com/tolibear/goal-maker/main/extend/catalog.json
```

The npm package should contain the stable core and CLI. The catalog can change on GitHub without requiring users to update npm for every optional integration.

## CLI Shape

Use one top-level extension command instead of separate browse/list/show verbs:

```bash
goal-maker extend
goal-maker extend <extension-id>
goal-maker extend install <extension-id>
goal-maker extend doctor [extension-id]
```

This keeps the UX simple:

- no argument means "show the catalog";
- an id means "show this extension";
- `install` copies checksum-verified files into the local Goal Maker install;
- `doctor` verifies installed extension files and required environment.

## Repo Shape

Keep the root relatively clean:

```text
goal-maker/   # installable skill payload
internal/     # package/dev infrastructure
extend/       # optional extension folders
examples/     # completed sample runs
extend/catalog.json  # GitHub-hosted extension catalog
AGENTS.md     # repo-specific agent guidance
```

`goal-maker/scripts/` stays inside the skill because installed skill docs call those scripts directly.
