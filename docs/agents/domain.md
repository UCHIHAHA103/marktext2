# Domain Docs

Single-context repo. Before exploring, read:

- **`CONTEXT.md`** at the repo root (created lazily by `grill-with-docs` when needed)
- **`docs/adr/`** — architectural decision records for past design choices

If either doesn't exist yet, proceed silently.

## File structure

```
/
├── AGENTS.md
├── CONTEXT.md          ← domain glossary + architecture overview
├── docs/
│   ├── agents/         ← skill configuration (this folder)
│   ├── adr/            ← architectural decisions
│   ├── dev/            ← developer guides (BUILD.md, ARCHITECTURE.md, IPC.md…)
│   └── end-user/       ← end-user documentation
└── src/
    ├── main/           ← Electron main process
    ├── renderer/       ← Vue 3 renderer
    └── muya/           ← editor core
```

## Use the glossary's vocabulary

When writing issue titles, refactor proposals, or test names, use terms as defined in `CONTEXT.md`.
