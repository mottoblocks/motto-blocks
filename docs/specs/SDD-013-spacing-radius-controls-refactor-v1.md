# SDD-013 — Spacing & Border Radius Controls: Refactor

**Status:** Active
**Scope:** `SpacingControl`, `BorderRadiusControl`, `StylerCssList` (draft row)

---

**Note (2026-07-12):** core refactor mechanics confirmed in code — `commitDraftIfNeeded` + synchronous `rowsRef` in `StylerCssList.jsx`, no `schedulePatch`/`pendingPatchRef`/`frameRef`/`draftIsCommitted`/`draftAppendedRef` remnants in `SpacingControl.jsx` / `BorderRadiusControl.jsx`. Status set to `Active` rather than `Approved`: these same files carry uncommitted working-tree changes at time of this audit, so treat as still in flight. Was also missing from `docs/specs/INDEX.md` — added.

---

## 1. Problema

Los controles actuales acumulan parches sobre parches. El resultado es:

- Race conditions entre el draft row y el store de atributos del bloque
- Closures viejos en el RAF de SpacingControl que emiten valores incorrectos
- Lógica de detección de vista mezclada con lógica de slot, difícil de razonar

Esta refactorización reescribe los tres módulos con una lógica coherente desde cero.

---

## 2. Principios de diseño

1. **Cada unidad vive sola.** 10px se guarda como `"10px"` en el slot `px`. 1rem se guarda en `rem`. No hay transformación al cambiar de vista — si el slot de destino no tiene valor, el input/slider espera vacío.
2. **Pristine es null.** Una regla sin valor definido no tiene una vista forzada; cae en la vista por defecto del control.
3. **El valor actual determina la vista inicial.** Cuando el popup abre, se inspecciona el valor CSS activo y se selecciona la vista que mejor lo representa.
4. **Cada regla vive en su propio media query.** El aislamiento por breakpoint ya existe vía `key={mode}` en `StylerCssList`; no se altera.
5. **El draft row se limpia de forma síncrona.** Eliminar el mecanismo `draftIsCommitted` (asíncrono y frágil) y reemplazarlo por una limpieza inmediata protegida por `rowsRef`.

---

## 3. Modelo de slots

Cada lado (SpacingControl) o esquina (BorderRadiusControl) tiene un mapa de slots independiente:

```
SlotMap = {
  px?:     string,   // "16px"
  rem?:    string,   // "1rem"
  em?:     string,   // "1em"
  vw?:     string,   // etc. — cualquier unidad CSS numérica
  css?:    string,   // "var(--algo)", "calc(100% - 8px)"
  preset?: string,   // "var:preset|spacing|40"
}
```

- Al cambiar de unidad/vista → leer el slot de destino (puede ser `undefined`).
- Al escribir un valor → guardar en el slot de la unidad activa.
- **Nunca** se transforma un valor de un slot al otro.

### Slot "css"

El slot `css` es **por eje** y acepta cualquier valor libre: expresiones CSS (`var()`, `calc()`), palabras clave globales (`inherit`, `initial`, `unset`), o cualquier string que no encaje en preset ni en unidad numérica. Es el slot de "todo lo demás" — no existe un slot "raw" separado.

---

## 4. Vistas disponibles

Para Spacing y Border Radius existen exactamente tres vistas por eje:

| Vista | Cuándo aplica | Input |
|-------|--------------|-------|
| **preset** | Valor es un preset token de WordPress | Slider de presets |
| **unit** (px/rem/em/…) | Valor es numérico + unidad | Input numérico + slider |
| **css** | Todo lo demás: `var()`, `calc()`, `inherit`, `initial`, cualquier texto libre | Input de texto libre |

**No existe una vista "raw" separada.** La vista `css` lo cubre todo — es simplemente un input de texto que acepta cualquier valor CSS válido, incluyendo palabras clave globales.

## 5. Detección de vista al abrir

```
detectInitialView(cssValue):
  si cssValue está vacío / null     → vista "unit" con la unidad por defecto (pristine)
  si cssValue es preset token/var   → "preset"
  si cssValue es numérico + unidad  → "unit" con la unidad correspondiente
  si cualquier otro caso            → "css"
```

`categorizeSpacingValue` ya implementa esta lógica correctamente (chequea preset ANTES que CSS expression para evitar falsos positivos). Solo necesita ser usada limpiamente en ambos controles.

**Auto**: si el control tiene `hasAutoValue=true` y el valor es `"auto"`, se activa el toggle Auto — es ortogonal a la vista (puede coexistir con cualquier vista).

---

## 5. APIs de los controles

### SpacingControl

```
Props:
  value: string              // CSS shorthand actual ("16px 0", "var(--...)", "")
  onChange: (patch) => void  // patch: { top?, right?, bottom?, left? }
  sides: string[]
  spacingSizes: object[]
  units: string[]
  hasAutoValue: boolean
  allowNegativeValue: boolean
  label: string

Emite onChange solo cuando el usuario interactúa.
No emite en mount ni en cambio de unit sin valor.
```

### BorderRadiusControl

```
Props:
  value: string              // CSS shorthand de border-radius actual
  onChange: (cssValue) => void
  spacingSizes: object[]
  units: string[]
  label: string

Emite onChange solo cuando el usuario interactúa.
```

### SpacingMultipleControl (wrapper)

Mismo rol que hoy: recibe `value` (CSS string), parsea, pasa sides a SpacingControl, serializa el patch de vuelta a CSS string con `mergeSpacingPatchToCss`.

---

## 6. Emisión de valores — sin RAF

El RAF actual genera closures viejos que emiten valores incorrectos.

**Nuevo comportamiento:**
- Slider de preset → `onChange` inmediato en cada posición (Gutenberg maneja debounce interno)
- Input numérico → `onChange` en cada keystroke (mismo razonamiento)
- Cambio de unidad sin valor → **no emite** (slot vacío = no hay nada que emitir)
- Cambio de modo (preset ↔ custom ↔ css) → emite el valor del slot de destino, o no emite si está vacío
- **`onBlur` del popup** → flush del último valor (safety net, no primera línea de emisión)

Esto elimina `schedulePatch`, `pendingPatchRef`, `frameRef`, `flushScheduledPatch`, y el `useEffect([emitChange])` con su cleanup.

---

## 7. Draft row en StylerCssList

### Problema actual

`draftIsCommitted` espera que `resolvedRows` (asíncrono, viene del store) incluya el ID del draft antes de llamar `setDraftRow(null)`. El efecto auto-create usa `resolvedRows.length` como guardia. Cuando el draft se clearece pero `resolvedRows` todavía está vacío, el auto-create crea un draft nuevo → regla fantasma.

### Solución

```
commitDraftIfNeeded(nextDraft):
  si está vacío → setDraftRow(nextDraft); return false
  
  rowsRef.current = [...rows sin draft, nextDraft]  // actualización síncrona
  persistRows(rowsRef.current)
  setDraftRow(null)                                  // limpiar INMEDIATO
  return true
```

```
// Auto-create: guardia síncrona
useEffect(() => {
  if (draftRow?.id) return
  if (rowsRef.current.length > 0) return   // síncrono — siempre actualizado
  handleAddRule({ shouldFocus: false })
}, [draftRow?.id, handleAddRule])
// Sin dependencia de resolvedRows.length
```

El efecto `[resolvedRows]` que actualiza `rowsRef` se simplifica: siempre actualiza (ya no necesita el guard `draftAppendedRef`).

Eliminar: `draftIsCommitted`, `draftAppendedRef`, el effect `[draftIsCommitted]`.

---

## 8. Criterios de done

| # | Criterio | Cómo verificar |
|---|----------|----------------|
| 1 | Setear un valor de spacing en un draft → puedo agregar otra regla | Manual |
| 2 | Cerrar y reabrir el popup → vista correcta (preset si era preset, px si era px) | Manual |
| 3 | Cambiar de px a rem sin valor en rem → input vacío, no emite nada | Manual |
| 4 | Cambiar de breakpoint → cada breakpoint independiente | Manual |
| 5 | Borrar todas las reglas → aparece draft vacío automáticamente | Manual |
| 6 | `npm run build` sin errores | CI |

---

## 9. Qué se toca y qué NO se toca

### Se mantiene sin cambios
- Lógica de separación de ejes: `VIEW_AXIAL`, `VIEW_SIDES`, single-side, `getInitialView`, `hasAxisSupport`, `normalizeSides` — está funcionando correctamente.
- `SpacingMultipleControl.jsx` — wrapper sin cambios o mínimos.
- `spacing-value-utils.js` — `categorizeSpacingValue` ya es correcto.

### Se reescribe
| Archivo | Qué cambia |
|---------|------------|
| `SpacingControl.jsx` | Eliminar RAF, limpiar slot model, usar `categorizeSpacingValue` para vista inicial |
| `BorderRadiusControl.jsx` | Mismo patrón que el nuevo SpacingControl |
| `StylerCssList.jsx` | Simplificar draft row: eliminar `draftIsCommitted`, limpiar inmediato |

---

## 10. Branch

`refactor/spacing-radius-controls`
