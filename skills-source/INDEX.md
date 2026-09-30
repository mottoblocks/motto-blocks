# Skills Index (Motto Blocks)

Use this file as the quick entrypoint for shared WordPress skills in this repository.

## Recommended order

1. Start with `wp-project-triage` when context is unclear.
2. Pick one primary skill for the task.
3. Run repo-local checks/build before finalizing.

## Skill usage

### `wp-project-triage`
Use when you need deterministic repo detection (plugin/theme/site/tooling/tests/versions).

Typical use:
- beginning of a new task
- when the assistant is unsure about structure or available tooling

### `wp-plugin-development`
Use for plugin architecture and lifecycle work.

Typical use:
- hooks/actions/filters
- activation/deactivation/uninstall
- settings pages and options
- sanitization/escaping/capabilities/nonces

### `wp-block-development`
Use for block editor development.

Typical use:
- `block.json` changes
- attribute persistence and serialization
- dynamic block rendering and deprecations
- invalid block migrations

### `wp-rest-api`
Use for REST routes/endpoints and permission handling.

Typical use:
- route registration
- schema/args validation
- `permission_callback` design
- response shaping and error contracts

### `wp-performance`
Use for profiling and performance bottlenecks.

Typical use:
- expensive queries
- avoid repeated heavy computation
- request/response performance checks

### `wp-plugin-directory-guidelines`
Use before release or when auditing compliance.

Typical use:
- readme/compliance review
- security/privacy checks
- distribution readiness for plugin directory expectations

## Local precedence rule

These skills are baseline WordPress guidance.
For this repository, local instructions remain authoritative:

1. `AGENTS.md`
2. `CONVENTIONS.md` and `docs/conventions/*`
3. then these shared WordPress skills

When rules conflict, follow repo-local rules first.
