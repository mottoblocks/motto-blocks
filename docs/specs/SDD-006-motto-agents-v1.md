# Feature Spec: SDD-006 — Motto Agents v1 (AI Layout Generator)
Version: 0.1
Status: Superseded
Owner: Architecture
Last Updated: 2026-07-12

> **Superseded (2026-07-12):** The plugin that actually got built is `motto-ai` (`_dev/motto-ai/`), not `motto-agents`, and it diverges from this spec well beyond naming: REST namespace is `motto-ai/v1` (not `motto-agents/v1`); the block catalog is dynamic (scanned from `block.json` files declaring a `mottoAI` field) instead of 6 hardcoded patterns; there is no summary/confirm step or multi-turn `clarifications` flow — generation inserts directly; full `mottoStyler` attribute population and existing-block modification (`modifyMode`) are already implemented, both explicitly out of scope here. See `SDD-015-motto-ai-v1.md` for the spec matching the current implementation. This document is kept for historical reference only — do not use it to describe current behavior.

> **Repo note:** This spec describes a new sibling plugin `motto-agents`. It lives temporarily in `motto-blocks/docs/specs/` until the `motto-agents` repo is created, at which point it moves to `motto-agents/docs/specs/`.

---

## 1. Goal

Provide non-technical WordPress users with a conversational interface inside the Gutenberg editor that generates ready-to-use block layouts from natural language descriptions. The agent asks clarifying questions, constructs a valid Motto block tree, applies basic visual styles (font size, background color, spacing), and inserts the result directly into the editor — no manual block assembly required.

---

## 2. Scope

**In scope (Phase A — Layout + Basic Styles):**
- Modal/panel UI embedded in the Gutenberg editor toolbar
- Intent detection from free-text user input (e.g. "I need a contact section with a title, short description, and a button")
- Pattern catalog: CTA, Hero section, 2-column layout, 3-column layout, FAQ (accordion), Contact section
- Basic style application at generation time: `font-size`, `background-color`, `color`, `padding`, `border-radius`
- Block tree output using only `motto-blocks` blocks (Container, Button, Buttons, Accordion, Accordion Item, Tabs, Slider)
- Secure PHP proxy for all AI API calls (API key never exposed to the browser)
- Insertion via `wp.blocks.createBlock()` + `wp.data.dispatch("core/block-editor").insertBlocks()`
- WP admin settings page: AI provider (Claude / OpenAI), API key, model selection

**Out of scope (Phase A):**
- Styler panel integration (`mottoStyler` attribute population from agent output)
- Free CSS generation or arbitrary class injection
- Support for third-party blocks (Stackable, Qubely, Greenshift, etc.)
- Editing or modifying existing blocks already in the editor
- Undo/redo agent actions beyond Gutenberg's native history
- Multi-turn conversation with persistent memory across editor sessions

---

## 3. Current Behavior

There is no AI-assisted block generation in the Motto ecosystem. Users must manually select, nest, and configure blocks to build common layouts. For non-technical users this creates high friction: knowing which blocks to combine, in what hierarchy, with what attributes, requires familiarity with the block system. Common patterns (CTA, hero, FAQ) must be rebuilt from scratch each time.

---

## 4. Target Behavior

**User flow:**
1. User opens the Motto Agents panel (toolbar button or sidebar) in the Gutenberg editor.
2. User types a free-text description ("I want a hero section with a background image, big title, subtitle, and a call-to-action button").
3. The agent optionally asks 1–2 clarifying questions ("What tone? Light or dark background?").
4. The agent selects the closest pattern from the catalog and customizes it with the user's intent.
5. A preview summary is shown ("I'll insert: Container > [Title, Paragraph, Button]"). User confirms.
6. The block tree is inserted into the editor at the current cursor position, with basic styles applied.

**Agent output contract (block tree JSON):**
```json
{
  "name": "motto-blocks/container",
  "attributes": {
    "style": { "background": { "color": "#1a1a2e" } }
  },
  "innerBlocks": [
    {
      "name": "core/heading",
      "attributes": { "level": 1, "content": "Your Headline Here", "style": { "typography": { "fontSize": "3rem" } } },
      "innerBlocks": []
    },
    {
      "name": "core/paragraph",
      "attributes": { "content": "A short supporting sentence that explains your offer." },
      "innerBlocks": []
    },
    {
      "name": "motto-blocks/button",
      "attributes": { "label": "Get Started" },
      "innerBlocks": []
    }
  ]
}
```

**Insertion mechanism (JS):**
```js
function treeToBlock(node) {
  return wp.blocks.createBlock(
    node.name,
    node.attributes,
    (node.innerBlocks ?? []).map(treeToBlock)
  );
}
const blocks = response.blocks.map(treeToBlock);
wp.data.dispatch("core/block-editor").insertBlocks(blocks);
```

The agent never generates raw HTML or block comment markup. All output passes through `createBlock()` so Gutenberg handles serialization and validation.

---

## 5. Data Contract

**Inputs:**
- User free-text prompt (string, max 500 chars in Phase A)
- Optional clarifying answers (key/value pairs)
- WP admin config: `motto_agents_provider` (`claude` | `openai`), `motto_agents_api_key`, `motto_agents_model`

**Persistence:**
- `wp_options`: `motto_agents_settings` (provider, model, encrypted/obscured API key)
- No per-post or per-block persistence in Phase A

**REST endpoint (PHP proxy):**
- `POST /wp-json/motto-agents/v1/generate`
- Request: `{ prompt: string, history: Message[] }`
- Response: `{ blocks: BlockTreeNode[], summary: string, clarifications?: string[] }`
- Auth: `edit_posts` capability required (nonce-protected)

**Outputs:**
- Block tree JSON array (array of `BlockTreeNode` — see contract above)
- Human-readable summary string shown in the UI before confirmation
- Optional clarifying questions array (triggers a follow-up turn)

---

## 6. Acceptance Criteria

- [ ] User can open the Motto Agents panel from the Gutenberg toolbar without page reload
- [ ] Typing "I need a CTA with a title and a button" inserts a valid Container > Heading + Button structure
- [ ] Inserted blocks pass Gutenberg block validation (no "invalid block" warnings)
- [ ] Basic styles (background-color, font-size) set via the agent are reflected visually in the editor immediately after insertion
- [ ] API key is never present in any JS bundle or browser network response body
- [ ] Submitting a prompt with no API key configured shows a clear error pointing to the settings page
- [ ] The PHP proxy returns a structured error (not a 500) if the AI API call fails
- [ ] All generated blocks use only registered block names (unknown names are rejected before insertion)

---

## 7. Risks and Mitigations

- **Risk:** AI returns a block name that is not registered in the current WP instance.
  - Mitigation: JS-side validator checks `wp.blocks.getBlockType(name)` before calling `createBlock()`; unknown blocks are skipped and reported in the summary.

- **Risk:** AI generates deeply nested structures that cause editor performance issues.
  - Mitigation: Cap tree depth at 3 levels and total block count at 20 in Phase A.

- **Risk:** API key stored in plain text in `wp_options`.
  - Mitigation: Store with basic obscuring (not encryption — document the limitation); recommend environment variables or a secrets plugin as a best practice.

- **Risk:** Non-technical users get outputs that look generic or unstyled.
  - Mitigation: Each pattern in the catalog ships with opinionated defaults (not blank): font sizes, padding, a readable color palette. The user sees something that "looks like a design" immediately.

- **Risk:** Users insert large blocks and regret it, can't easily undo.
  - Mitigation: Gutenberg's native undo covers the insert. Show the summary before inserting and require explicit confirmation.

---

## 8. Test Plan

**Automated:**
- Unit: block tree validator (unknown names, depth limit, count limit)
- Unit: PHP proxy — mocked AI response, auth failure, malformed response
- `npm run lint` passes in `motto-agents`

**Manual:**
- Insert a CTA pattern: confirm valid blocks, correct styles, no validation warnings
- Insert with an unregistered block name in response: confirm it is skipped, not inserted
- Submit with no API key: confirm error state in UI, no PHP 500
- Submit with a vague prompt ("make something nice"): confirm agent asks a clarifying question

---

## 9. Rollout Plan

**Phase A — Pattern Catalog + Basic Styles (this spec):**
- Scaffold `motto-agents` plugin repo (WP plugin + Vite build, same structure as `motto-dynamics`)
- Implement PHP REST proxy with WP admin settings
- Build pattern catalog (6 patterns, hard-coded JSON)
- Build Gutenberg panel UI (prompt input, summary, confirm/cancel)
- Wire AI call → block tree → `createBlock()` insertion
- Basic styles: `font-size`, `background-color`, `color`, `padding` only

**Phase B — Guided Free Generation:**
- Remove hard catalog dependency; agent builds arbitrary trees within Motto block set
- Add multi-turn clarification (2–3 turns max)
- Expand style surface: `border-radius`, `gap`, simple responsive variants

**Phase C — Editor Context Awareness:**
- Agent reads current post block structure via `wp.data.select("core/block-editor")`
- Can suggest completions or additions to existing layouts
- Styler integration exploration (`mottoStyler` attribute population)

**Rollback:**
- `motto-agents` is an independent plugin — deactivating it reverts the editor to default state with no data loss.

---

## 10. Change Log

- v0.1 (2026-04-12): Initial draft. Phase A scope defined. Block tree JSON contract and insertion mechanism established.
