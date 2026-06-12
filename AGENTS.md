# Agent Instructions

Read `CLAUDE.md` in this directory — it is the canonical agent guide for this repo (architecture, layout, conventions, gotchas, testing).

Critical points for any agent working here:

- **Run `npx vitest run` before every `git commit`.** The pre-commit hook rejects commits unless tests were written and run in the session. Never bypass with `--no-verify` — if the hook blocks you, stop and report back instead.
- **`setTint` is a no-op on the Canvas renderer.** Anything that must be visible in headless/Canvas contexts needs baked textures, not tints.
- TypeScript must stay clean: `npx tsc --noEmit` after changes.
- Procedural textures defined but never invoked from `PreloadScene.create()` are silently invisible — wiring the call is part of the task.
