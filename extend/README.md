# Extend

Optional Goal Maker extensions live here as subfolders when they are ready to ship.

The npm package reads the GitHub-hosted catalog at `extend/catalog.json`, so adding or updating extension entries here does not require an npm release.

Each extension folder should contain the files referenced by `extend/catalog.json`. Keep catalog entries checksum-pinned so `goal-maker extend install <id>` can verify downloads before copying them into a local Codex install.
