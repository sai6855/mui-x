# Bundle Size Reduction Findings

Opportunities identified across `x-data-grid`, `x-charts`, and `x-date-pickers` packages.

**Estimated total savings: ~32,000 bytes (~20,000-25,000 bytes minified)**

---

## Summary Table

| # | Area | Finding | Est. Savings |
|---|------|---------|-------------|
| 1 | Data Grid | `warnOnce` strings survive production bundle | ~3,000B |
| 2 | Data Grid | `propValidation.ts` validator string messages | ~1,500B |
| 3 | Data Grid | `GridRootStyles.ts` overridesResolver repetition | ~4,000B |
| 4 | Data Grid | Premium-only locale keys in community package | ~3,000B |
| 5 | Data Grid | Duplicate warning messages in editing hooks | ~500B |
| 6 | Charts | Flatbush.ts inlined spatial index library | ~8,000B |
| 7 | Charts | `getCurve.ts` eagerly imports all 10 d3 curve types | ~2,000B |
| 8 | Charts | X/Y ReferenceLine code duplication | ~3,000B |
| 9 | Charts | `warnOnce` strings survive production bundle | ~2,000B |
| 10 | Pickers | `useFieldV6TextField.ts` backward-compat layer | ~3,000B |
| 11 | Pickers | Locale barrel re-export tree-shaking | ~2,000B |
| | | **TOTAL** | **~32,000B** |

---

## Data Grid (~14,500 bytes saveable)

### 1. Warning strings survive production bundle (~3,000 bytes)

`warnOnce()` in `x-internals/src/warning/warning.ts` has the `NODE_ENV` guard inside the function body, not at call sites. This means the verbose multi-line string arguments passed at 12+ call sites are **not** dead-code-eliminated by bundlers.

Affected files:
- `useGridSelector.ts`
- `gridFilterUtils.ts`
- `gridSortingUtils.ts`
- `csvSerializer.ts`
- `GridActionsCell.tsx`
- `useGridRowEditing.ts`
- `useGridCellEditing.ts`
- `useGridDataSourceBase.ts`
- `useGridListView.tsx`

**Fix:** Add `process.env.NODE_ENV !== 'production'` guard at each call site, or restructure `warnOnce` to accept error codes instead of full strings.

### 2. propValidation.ts validator string messages (~1,500 bytes)

**File:** `x-data-grid/src/internals/utils/propValidation.ts`

4 validators build multi-line error strings with `.join('\n')` that are evaluated and passed to `warnOnce()`, surviving in production.

**Fix:** Wrap validator logic in `NODE_ENV` checks or move to error-code-based approach.

### 3. GridRootStyles.ts overridesResolver repetition (~4,000 bytes)

**File:** `x-data-grid/src/components/containers/GridRootStyles.ts` (33KB)

Lines 41-156 contain ~120 entries each following the pattern:

```ts
{ [`& .${c['class-name']}`]: styles['class-name'] }
```

**Fix:** Generate these programmatically with a loop over the class names array, replacing ~120 literal object entries with a single loop construct.

### 4. Premium-only locale keys in community package (~3,000 bytes)

**File:** `x-data-grid/src/constants/localeTextConstants.ts` (12KB)

Contains ~60 premium-only locale keys (AI Assistant, Pivot, Charts panel) that community-tier users bundle but never use.

**Fix:** Move premium-only keys to the premium package and merge them at the premium entry point.

### 5. Duplicate warning messages in editing hooks (~500 bytes)

- `useGridCellEditing.ts:461` and `useGridRowEditing.ts:583` contain an identical 3-line warning string.
- `useGridDataSourceBase.ts` has two near-identical warning blocks (lines 165-170 and 255-260).

**Fix:** Extract shared warning strings into a single constant, or deduplicate with error codes.

---

## Charts (~15,000 bytes saveable)

### 6. Flatbush.ts inlined spatial index library (~8,000 bytes minified)

**File:** `x-charts/src/internals/Flatbush.ts` (16KB source)

A complete R-tree implementation with Hilbert curve sorting, quicksort, and binary search is inlined. It is only used by scatter charts for nearest-neighbor point finding, but all chart types (bar, line, pie) pay the bundle cost.

**Fix:** Lazy-load or code-split Flatbush so it is only included when scatter charts are used.

### 7. getCurve.ts eagerly imports all 10 d3 curve types (~2,000 bytes)

**File:** `x-charts/src/internals/getCurve.ts`

Eagerly imports all 10 curve functions:
- `curveCatmullRom`, `curveLinear`, `curveMonotoneX`, `curveMonotoneY`, `curveNatural`
- `curveStep`, `curveStepAfter`, `curveStepBefore`, `curveBumpX`, `curveBumpY`

Most users use only 1-2 curve types (the default is `monotoneX`).

**Fix:** Use a lazy map pattern or dynamic imports so unused curve types are tree-shaken.

### 8. ChartsXReferenceLine / ChartsYReferenceLine duplication (~3,000 bytes)

- `ChartsReferenceLine/ChartsXReferenceLine.tsx` (5,121 bytes)
- `ChartsReferenceLine/ChartsYReferenceLine.tsx` (5,121 bytes)

These two files are ~85% identical, differing only in which coordinate axis is used.

**Fix:** Extract shared logic into a parameterized base function that accepts axis direction as a parameter.

### 9. Charts warnOnce strings in production (~2,000 bytes)

14 `warnOnce` call sites across the charts package pass verbose template literal messages. Same root cause as finding #1: the `NODE_ENV` check is inside `warnOnce()`, so string arguments are not eliminated.

**Fix:** Same as finding #1 -- guard call sites or use error codes.

---

## Pickers (~5,000 bytes saveable)

### 10. useFieldV6TextField.ts backward-compat layer (~3,000 bytes minified)

**File:** `x-date-pickers/src/internals/hooks/useField/useFieldV6TextField.ts` (19KB source)

V6 backward-compatibility TextField integration code is always bundled even when users are on V7+.

**Fix:** Lazy-load this module only when a V6 TextField is detected at runtime.

### 11. Locale barrel re-export pattern (~2,000 bytes overhead)

**File:** `x-date-pickers/src/locales/index.ts`

Re-exports all 43 locales. Each locale is ~3,500 bytes; importing all = ~144KB. Bundlers should tree-shake unused locales, but the barrel pattern can interfere depending on the bundler configuration.

**Fix:** Verify that all major bundlers (webpack, esbuild, Rollup) properly tree-shake individual locale imports through this barrel file. Consider adding `"sideEffects": false` annotations if not already present.

---

## Cross-Cutting: warnOnce Production Stripping (~7,000 bytes total)

The single highest-impact change spans all three packages:

**Root cause:** `x-internals/src/warning/warning.ts` line 15 -- the `process.env.NODE_ENV` check is **inside** the `warnOnce` function body. All ~40 call sites across data-grid (12), charts (14), and pickers (4) pass string arguments that survive minification because the bundler cannot prove the function has no side effects before evaluating arguments.

**Recommended fix (choose one):**
1. Add `process.env.NODE_ENV !== 'production' &&` guard at each call site
2. Restructure `warnOnce` to accept numeric error codes, with a dev-only lookup table
3. Use a babel/SWC plugin to strip `warnOnce` calls in production builds
