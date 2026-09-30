# Feature Spec: SDD-005 — Composite Selector Input v1
Version: 0.4
Status: Approved
Owner: Styler Core
Last Updated: 2026-03-16

## 1. Goal

Reemplazar el panel de edición de selectores (ToggleGroup state/inner + campo único) por un input compuesto de dos campos separados por un badge no editable `&{block}`. El campo izquierdo (`before`) permite escribir un selector padre/contexto; el campo derecho (`after`) cubre los casos estado e inner actuales. Esto elimina el tipo explícito y agrega soporte nativo para selectores de contexto sin romper datos existentes.

Como parte de este cambio, el atributo de bloque se renombra de `mottoStyler.innerSelectors` a `mottoStyler.blockSelectors`. El nombre `innerSelectors` era adecuado cuando solo existían selectores hijos/estado; con el soporte de contexto (selectores padre), el nombre ya no es representativo.

## 2. Scope

In scope:
- Renombrar atributo de bloque `mottoStyler.innerSelectors` → `mottoStyler.blockSelectors`
- Nuevo modelo de datos `{ before, after }` en lugar de `{ selector, selectorType }`
- Función de migración centralizada `migrateEntryToComposite(entry)` en `block-selectors-shape.js`
- UI del modal de edición: dos campos + badge `&{block}`
- Actualización de `joinInnerSelector` en `style-engine.jsx`
- Nuevo grupo `context` en presets (`motto-inner-selector-presets.json`)
- Compatibilidad backward con datos guardados en formato legado (tanto `innerSelectors` como `{ selector, selectorType }`)
- Tests mínimos para migración y generación CSS

Out of scope:
- Cambios en el sistema de breakpoints
- Cambios en `StylerCssList` o `StylerPanel`
- Migración retroactiva de datos ya guardados en base de datos (la migración es on-the-fly en lectura)

## 3. Current Behavior

El modal de edición muestra:
- Un `ToggleGroupControl` con opciones `state` / `inner`
- Un campo de texto único para el selector

El tipo controla cómo se concatena con el selector base:
- `state`: `baseSelector + selector` → `.block:hover` (sin espacio — el selector se pega directamente)
- `inner`: `baseSelector + " " + selector` → `.block .child` (con espacio — crea un selector descendente)

**La única diferencia entre `state` e `inner` es el espacio previo.** El toggle existe únicamente como atajo para que el usuario no tenga que escribir ese espacio a mano. No hay otra lógica diferencial entre los dos tipos.

No existe forma de agregar un selector padre/contexto que preceda al selector base.

## 4. Target Behavior

El modal de edición muestra:
- Campo `Before` (izquierda) — selector que va *antes* del badge
- Badge no editable `&{block}` — representa el selector de instancia del bloque
- Campo `After` (derecha) — selector que va *después* del badge

CSS generado: `${before} ${baseSelector}${after}` (con espacio automático entre `before` y `baseSelector` solo cuando `before` no está vacío).

El usuario controla los strings exactamente como los escribe — no se normalizan ni modifican espacios. Esto reemplaza el toggle state/inner: si el usuario quiere un selector descendente escribe el espacio en `after` (ej. ` .child`); si quiere un pseudo-estado lo escribe sin espacio (ej. `:hover`). El campo `after` es agnóstico al tipo — el espacio es semántica del usuario, no del sistema.

## 5. Data Contract

- **Inputs:**
  - `editState.before: string` — selector contexto/padre
  - `editState.after: string` — selector estado/inner
- **Persistence:**
  - `mottoStyler.blockSelectors[].before: string` ← nuevo nombre del atributo
  - `mottoStyler.blockSelectors[].after: string`
  - `mottoStyler.innerSelectors` (legado) sigue siendo leído on-the-fly y su contenido migrado a `blockSelectors` en memoria; no se re-escribe en base de datos hasta que el usuario guarde el bloque
  - Campos `selector` y `selectorType` del formato legado siguen siendo leídos vía `migrateEntryToComposite` pero no se escriben en datos nuevos
- **Outputs:**
  - CSS generado: `joinInnerSelector(baseSelector, before, after)`
  - Ejemplos:
    - `("", ":hover")` → `.block:hover`
    - `("", " .child")` → `.block .child`
    - `(".is-active", "")` → `.is-active .block`
    - `(".parent", ":hover")` → `.parent .block:hover`

## 6. Acceptance Criteria

- [ ] Atributo `mottoStyler.blockSelectors` reemplaza a `mottoStyler.innerSelectors` en todos los bloques nuevos
- [ ] Bloques con `mottoStyler.innerSelectors` en formato legado se leen y migran on-the-fly sin errores
- [ ] Bloques con selectores guardados en formato legado (`selector`/`selectorType`) se cargan correctamente: `before` vacío, `after` igual al valor del selector viejo
- [ ] Agregar selector de contexto (`before` con valor) genera CSS con prefijo padre correcto
- [ ] Agregar selector de estado (`after` con valor) genera CSS idéntico al comportamiento actual
- [ ] Combinar `before` + `after` genera CSS con ambos concatenados correctamente
- [ ] Tab "Context" aparece en el modal de presets; al aplicar un preset de contexto, llena solo el campo `before`
- [ ] Si no hay `label`, la cabecera del item muestra el fallback compuesto `${before} &{block}${after}`
- [ ] No se escriben campos `selector`/`selectorType` en datos nuevos
- [ ] Tests mínimos pasan (ver §8)

## 7. Risks and Mitigations

- Risk: Datos legados con `selector` que contienen espacios semánticos (ej. ` .child`) podrían verse afectados si se aplica trim
  - Mitigation: `migrateEntryToComposite` no modifica el string; sanitización en runtime es mínima (solo null/undefined → "")
- Risk: Colisiones en deduplicación con keys literales `before|after`
  - Mitigation: Usar `JSON.stringify([before, after])` como clave en `buildSelectorEntryKey`
- Risk: Rollback — si la UI vuelve al toggle, los datos nuevos con `before`/`after` no se leerían
  - Mitigation: `migrateEntryToComposite` hace pass-through cuando `before`/`after` existen; el runtime siempre migra on-the-fly antes de generar CSS
- Risk: Renombre `innerSelectors` → `blockSelectors` rompe bloques ya guardados si el runtime no lee el key legado
  - Mitigation: el runtime lee primero `mottoStyler.blockSelectors`; si está vacío o ausente, lee `mottoStyler.innerSelectors` como fallback antes de generar CSS

## 8. Test Plan

Automated:
- `migrateEntryToComposite({ selector: ":hover", selectorType: "state" })` → `{ before: "", after: ":hover" }`
- `migrateEntryToComposite({ selector: ".child", selectorType: "inner" })` → `{ before: "", after: " .child" }` (espacio reconstruido desde selectorType)
- `migrateEntryToComposite({ selector: " .child", selectorType: "inner" })` → `{ before: "", after: " .child" }` (espacio ya presente, preservado)
- `migrateEntryToComposite({ selector: ":hover" })` (sin selectorType) → `{ before: "", after: ":hover" }` (inferido por primer char)
- `migrateEntryToComposite({ selector: ".child" })` (sin selectorType) → `{ before: "", after: " .child" }` (inferido por primer char)
- `migrateEntryToComposite({ before: ".parent", after: ":hover" })` → pass-through sin cambios
- `migrateEntryToComposite({})` → `{ before: "", after: "" }`
- `joinInnerSelector(".block", "", ":hover")` → `".block:hover"`
- `joinInnerSelector(".block", "", " .child")` → `".block .child"`
- `joinInnerSelector(".block", ".parent", "")` → `".parent .block"`
- `joinInnerSelector(".block", ".parent", ":hover")` → `".parent .block:hover"`
- `joinInnerSelector(".block", "", "")` → `""`
- Deduplicación: `key({ before: ".a", after: "" }) !== key({ before: "", after: ".a" })`

Manual:
- Abrir bloque con selector `:hover` guardado en formato legado → verificar que se muestra en campo `after`
- Crear selector nuevo con `.is-active` en `before` y `:hover` en `after` → verificar CSS resultante
- Aplicar preset del tab "Context" → verificar que llena solo `before`

## 9. Rollout Plan

Phase A — Migración centralizada y runtime:
- Agregar `migrateEntryToComposite` a `block-selectors-shape.js`
- Actualizar runtime en `style-engine.jsx`: leer `blockSelectors` con fallback a `innerSelectors`; actualizar `joinInnerSelector` y `buildInnerSelectorRulesForBp`
- Tests unitarios

Phase B — UI:
- Reemplazar modal de edición en `InnerSelectorsList.jsx`; escribir siempre en `blockSelectors`
- Actualizar preset picker y presets JSON
- Renombrar componente `InnerSelectorsList` → `BlockSelectorsList` y archivo asociado (si aplica)

Rollback:
- Revertir `InnerSelectorsList.jsx` al ToggleGroupControl + campo único
- El runtime sigue funcionando porque `migrateEntryToComposite` es backward-compatible en ambas direcciones

## 10. Change Log

- v0.1: Initial draft. 2026-03-15.
- v0.2: Agregar renombre `innerSelectors` → `blockSelectors`: scope, data contract, acceptance criteria, risks, rollout. 2026-03-16.
- v0.3: Documentar explícitamente que la única diferencia entre state/inner era el espacio previo; el campo `after` lo reemplaza sin lógica de tipo. 2026-03-16.
- v0.4: Descubrimiento durante Phase A — datos legados almacenan selector SIN espacio; el espacio era responsabilidad del engine vía selectorType. `migrateEntryToComposite` reconstruye el espacio usando selectorType o inferencia por primer carácter. Test cases de migración actualizados. 2026-03-16.
