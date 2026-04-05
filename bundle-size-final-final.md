# Bundle Size Optimization Findings — MUI X Packages

## Methodology

- **Raw size**: `wc -c FILE`
- **Gzip size**: `gzip -c FILE | wc -c`
- Patterns: hoisting repeated property accessors, collapsing near-identical code into loops, extracting duplicate JSX
- All changes are mechanical — no public API, behavior, or type safety changes

---

## Baseline Measurements

| File | Raw (bytes) | Gzip (bytes) |
|---|---|---|
| `packages/x-scheduler/src/internals/utils/tokens.ts` | 13,565 | 2,245 |
| `packages/x-date-pickers-pro/src/DateRangePickerDay/DateRangePickerDay.tsx` | 22,995 | 5,391 |
| `packages/x-date-pickers/src/PickerDay/PickerDay.tsx` | 14,474 | 4,106 |
| `packages/x-charts/src/ChartsTooltip/ChartsTooltipTable.ts` | 2,596 | 820 |
| `packages/x-charts/src/ChartsLegend/ChartsLegend.tsx` | 8,038 | 2,343 |

---

## Proposed Changes

### P1: Loop-generate `getPaletteVariants` (x-scheduler) — est. ~800–1000 bytes raw saved

**File:** `packages/x-scheduler/src/internals/utils/tokens.ts` (lines 361–395)

**Problem:** 12 CSS property names are hardcoded twice each (light + dark) per palette = 24 manual assignments per palette iteration. Property names like `--event-surface-bold`, `--event-on-surface-bold` repeat as string literals.

**Fix:** Extract token keys into a `TOKEN_KEYS` array, loop over it to build both `lightStyles` and `darkStyles` objects dynamically instead of hand-writing 24 property assignments.

**Note:** The existing `|| 'color-mix(...)'` fallback on `surface-bold-hover` (line 369–370) is dead code — all 12 palettes define truthy values. Safe to remove.

**Verify:** `pnpm --filter "@mui/x-scheduler" run typescript`

---

### P2: Alias `(theme.vars || theme).palette` in DateRangePickerDay — est. ~500 bytes raw saved

**File:** `packages/x-date-pickers-pro/src/DateRangePickerDay/DateRangePickerDay.tsx`

**Problem:** `(theme.vars || theme).palette` appears **18 times** across 4 functions:
- `highlightStyles` (line 77): 2 occurrences
- `previewStyles` (line 88): 1 occurrence
- `selectedDayStyles` (line 99): 3 occurrences
- Main styled callback (line 148): 12 occurrences

**Fix:** Add `const p = (theme.vars || theme).palette;` at the top of each function that receives `theme`, replace all `.palette` accesses with `p`.

**Verify:** `pnpm --filter "@mui/x-date-pickers-pro" run typescript` + `pnpm test:unit --project "x-date-pickers-pro" --run`

---

### P3: Alias `(theme.vars || theme).palette` in PickerDay — est. ~300 bytes raw saved

**File:** `packages/x-date-pickers/src/PickerDay/PickerDay.tsx`

**Problem:** `(theme.vars || theme).palette` appears **11 times** in the styled callback (lines 64–143).

**Fix:** Add `const p = (theme.vars || theme).palette;` at the top of the styled callback, replace all 11 occurrences.

**Verify:** `pnpm --filter "@mui/x-date-pickers" run typescript` + `pnpm test:unit --project "x-date-pickers" --run`

---

### P4: Alias palette and spacing in ChartsTooltipTable — est. ~110 bytes raw saved

**File:** `packages/x-charts/src/ChartsTooltip/ChartsTooltipTable.ts`

**Problem:** `(theme.vars || theme).palette` appears **6 times** across 4 styled components. `theme.spacing` appears **11 times**.

**Fix:**
- In `ChartsTooltipPaper` (4 palette refs): alias `const p = (theme.vars || theme).palette;`
- In `ChartsTooltipCell` (2 palette refs + 6 spacing refs): alias both `const p = (theme.vars || theme).palette;` and `const s = theme.spacing;`

**Verify:** `pnpm --filter "@mui/x-charts" run typescript` + `pnpm test:unit --project "x-charts*" --run`

---

### P5: Extract duplicate JSX in ChartsLegend — est. ~200 bytes raw saved

**File:** `packages/x-charts/src/ChartsLegend/ChartsLegend.tsx` (lines 160–183)

**Problem:** The `<button>` / `<div>` render branches (lines 161–183) have identical inner content (`ChartsLabelMark` + `ChartsLabel`) and duplicate `className` expression.

**Fix:** Extract shared content into a local variable inside the `.map()` callback:

```tsx
const innerContent = (
  <React.Fragment>
    <ChartsLabelMark ... />
    <ChartsLabel ...>{item.label}</ChartsLabel>
  </React.Fragment>
);
const cn = clsx(classes?.series, !isVisible && classes?.hidden);
```

Then reference `{innerContent}` and `cn` in both branches.

**Verify:** `pnpm --filter "@mui/x-charts" run typescript` + `pnpm test:unit --project "x-charts*" --run`

---

## Estimated Total Savings

| Change | Est. raw saved | Gzip impact |
|---|---|---|
| P1 — tokens.ts loop | ~800–1000 B | ~200–300 B |
| P2 — DateRangePickerDay palette alias | ~500 B | ~50–80 B |
| P3 — PickerDay palette alias | ~300 B | ~30–50 B |
| P4 — ChartsTooltipTable aliases | ~110 B | ~15–25 B |
| P5 — ChartsLegend JSX dedup | ~200 B | ~30–50 B |
| **Total** | **~1,910–2,110 B** | **~325–505 B** |

> **Note:** Gzip estimates are conservative. Gzip already compresses repeated strings well, so raw savings are always larger than gzip savings. P1 has the highest gzip impact because it eliminates structurally different lines (property assignments), not just repeated substrings.

---

## Skipped Candidates (evaluated, not worth it)

| Candidate | Reason |
|---|---|
| `material/index.tsx` slot wrapper factory | Gzip already compresses the identical patterns well; factory adds indirection |
| `ChartsAxisZoomSliderActiveTrack` x/y unification | Math differs between branches, moderate risk, runtime code not CSS |
| `GridPrompt.tsx` styled component dedup | Repeated `name: 'MuiDataGrid'` already compresses to nothing |
| `GridRootStyles.ts` | Already well-optimized with CSS vars and factory functions |
| Resize handler dedup (DayGrid/TimeGrid) | Different base components, only ~15 lines each |
| `DateRangePickerDay` overridesResolver loop | Compound conditions make generic mapper complex; readability cost too high |

---

## Execution Notes

All 3 phases are independent and can run in parallel:

- **Phase 1 — x-scheduler:** P1 → typecheck
- **Phase 2 — x-date-pickers:** P2, P3 → typecheck + unit tests
- **Phase 3 — x-charts:** P4, P5 → typecheck + unit tests

**Final:** `pnpm typescript` (full monorepo typecheck)
