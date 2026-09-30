/**
 * MottoStyler presets.
 *
 * Data lives in motto-css-presets.json (plain JSON) so entries can be
 * copy/pasted straight from a block.json's "mottoDefaults" object.
 *
 * Shape:
 * { label, slug, category, icon, description, mottoStyler }
 *
 * mottoStyler.css          → { desktop: [], tablet: [], landscapePhone: [], phone: [] }
 * mottoStyler.blockSelectors → [{ selector, css: { desktop: [], tablet: [], landscapePhone: [], phone: [] } }]
 */
import PRESETS_DATA from "./motto-css-presets.json";

export const PRESETS = PRESETS_DATA;
