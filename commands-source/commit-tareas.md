---
description: Stage current changes and create commits grouped by logical task
---

Stage the repo's current changes and create one or more commits, each grouped by logical task — don't lump unrelated changes into a single commit.

1. Run `git status` and `git diff` (staged + unstaged) to see everything pending.
2. For diff analysis, prioritize `src/`, `docs/`, `*.md`, `*.json`, `*.php`. Don't spend time deeply reading `build/` or `assets/css/` diffs, but still stage and commit them normally alongside the source changes that produced them.
3. Group changes into logical commits: unrelated features/fixes go in separate commits; a feature and the generated build artifacts it produced go in the same commit.
4. Follow this repo's commit message conventions and the global git commit instructions (concise summary line, `Co-Authored-By` trailer).
5. After committing, report the commit hash(es) and a short summary per commit.

If the session touched more than one repo (e.g. motto-blocks plus a consumer repo like motto-dynamics), apply this per-repo and report each repo's commits separately.
