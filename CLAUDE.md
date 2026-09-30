# motto-blocks

WordPress Gutenberg plugin. See `AGENTS.md` for operational rules, `CONVENTIONS.md` for the full architecture playbook + Quick Reference (naming, data contracts), and the `motto-visual-system` skill for editor UI/design-system rules (panels, control naming, SCSS, icon sizing).

## Build

```
npm run dev       # watch mode (vite + SCSS)
npm run build     # production build
npm run lint      # eslint src/
npm run format    # prettier src/
```

Build artifacts (`build/`, `assets/css/`, `assets/js/`) are tracked in git — needed for WordPress deployment without a build step. After editing source files, run `npm run build`.

## Key files

- `src/styler/runtime/register-panel.jsx` — core Styler runtime
- `src/shared/index.js` — shared component exports
- `docs/specs/INDEX.md` — approved specs (SDD-001 onward)
- `TODO.md` — project tasks (English only)
- `NOTAS.md` — personal scratch notes (untracked, any language)

---

# Behavioral Guidelines

## 1. Think Before Coding

State assumptions explicitly. If multiple interpretations exist, present them. If something is unclear, stop and ask — don't pick silently.

## 2. Simplicity First

Minimum code that solves the problem. No speculative features, abstractions for single-use code, or error handling for impossible scenarios. If it could be 50 lines, don't write 200.

## 3. Surgical Changes

Touch only what the task requires. Don't improve adjacent code, refactor things that aren't broken, or delete pre-existing dead code unless asked. Remove only imports/vars/functions that YOUR changes made unused.

## 4. Goal-Driven Execution

For multi-step tasks, state a brief plan with verifiable success criteria before starting. Weak criteria ("make it work") require constant clarification — define what done looks like first.

## Related docs

- Operational rules and “what to read”: `AGENTS.md`
- Conventions index (open only relevant topics): `CONVENTIONS.md`
