# Shared Skills Source (SSOT)

This directory is the single source of truth for agent skills in this repository.

Agent-specific paths are symlinked to this directory:

- `.codex/skills` -> `../skills-source`
- `.claude/skills` -> `../skills-source`
- `.cursor/skills` -> `../skills-source`
- `.github/skills` -> `../skills-source`

Add/update skills only in `skills-source/`.
