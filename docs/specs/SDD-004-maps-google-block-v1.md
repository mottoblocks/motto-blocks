# Feature Spec: SDD-004 — Maps Google Block v1
Version: 0.1
Status: Approved
Owner: Blocks
Last Updated: 2026-03-11

## 1. Goal
Introduce a new `motto/maps` block backed by Google Maps, with editor-first setup guidance when the API key is missing and a stable data contract for map settings and multiple pins.

## 2. Scope
In scope:
- New `motto/maps` block registration and editor UI.
- Editor warning state when Google Maps API key is missing, with direct link to settings API tab.
- Map settings: height, center coordinates, zoom, map type, and basic controls.
- Pins list with stable row IDs and per-pin fields (`lat`, `lng`, `title`, `description`, `url`, `iconType`, `iconValue`).
- Pin icon sources: SVG library, inline SVG markup, and uploaded image URL.
- Frontend runtime initialization for Google Maps and marker rendering.

Out of scope:
- Marker clustering.
- Geocoding/search/autocomplete.
- Rich popup cards or templates beyond basic title/description/link.
- Advanced map styling JSON presets.

## 3. Current Behavior
The plugin has no dedicated map block. API key storage exists in admin settings, but no editor/runtime integration currently consumes it for block behavior.

## 4. Target Behavior
1. The inserter exposes a new block named `Motto Maps` (`motto/maps`).
2. If no API key is configured, the editor shows a warning and a link to settings API tab.
3. If API key exists, editor renders an interactive map preview.
4. Map viewport updates support both manual field edits and direct map interaction.
5. Pins are managed as an ordered list with stable `id`; marker drag updates coordinates.
6. Pin icon behavior:
- `svg-library`: icon name string from SVG gallery.
- `svg-inline`: sanitized inline SVG.
- `image`: media object URL.
7. Frontend renders the map and markers from block attributes without requiring editor context.

## 5. Data Contract
- Inputs:
  - Google Maps API key from option `motto_blocks_google_maps_api_key`.
  - Block attributes `height`, `centerLat`, `centerLng`, `zoom`, `mapType`, `controls`, `pins`.
- Persistence:
  - Block attributes under `motto/maps`.
  - `pins[]` entries use stable `id` and explicit coordinate/icon fields.
- Outputs:
  - Editor: warning state or interactive map preview.
  - Frontend: rendered map canvas and marker set initialized by runtime script.

## 6. Acceptance Criteria
- [ ] `motto/maps` can be inserted and saved without validation errors.
- [ ] Missing API key shows editor-only warning with link to settings API tab.
- [ ] Height, center, zoom, type, and controls persist and affect rendered map.
- [ ] Pins support add/remove/edit with stable IDs and coordinate validation.
- [ ] Marker drag updates pin coordinates in attributes.
- [ ] Pin icon types `svg-library`, `svg-inline`, and `image` render on frontend.

## 7. Risks and Mitigations
- Risk: malformed pin/icon payloads break marker rendering.
  - Mitigation: normalize/sanitize attributes in editor and PHP render callback.
- Risk: API script load race conditions across multiple map instances.
  - Mitigation: use single shared script-loader promise in editor and frontend runtime.

## 8. Test Plan
Automated:
- `npm run validate:value-options`
- `npm run build`

Manual:
- Insert block with and without API key configured.
- Verify settings link opens API tab.
- Add multiple pins; edit coordinates manually and by dragging marker.
- Test each icon mode and confirm marker renders.
- Verify frontend map behavior with multiple map blocks on a single page.

## 9. Rollout Plan
Phase A:
- Ship block with core map settings and pin/icon contract.

Phase B:
- Add richer marker popups and optional map style presets.

Rollback:
- Keep render callback defensive; if runtime fails, block outputs empty map container without fatal errors.

## 10. Change Log
- v0.1: Initial spec for `motto/maps` MVP.
