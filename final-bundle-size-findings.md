# MUI X Bundle Size Optimization Findings

> **Scope:** 12 MUI X packages (~3,074 source files)
> **Target:** Gzip compression savings
> **Deliverable:** Findings and suggested fixes only -- no code changes implemented

## Summary

| Category | Estimated Gzip Savings | # of Instances |
|----------|----------------------|----------------|
| 1. TypeScript Enums → const Objects | ~3–5 KB | 43 enums |
| 2. Duplicate Enum Definitions | ~200 B | 3 packages |
| 3. Dual PinnedColumnPosition Definitions | ~100 B | 2 files |
| 4. Unguarded Warning String Allocation | ~2–4 KB | 51 call sites |
| 5. Verbose Error Messages in Production | ~1–2 KB | 80+ throw sites |
| 6. Large Barrel Export Files | variable | 296+ `export *` |
| 7. Inline Style Objects Every Render | ~500 B | 15+ components |
| 8. gridClasses String Duplication | ~300 B | 2 files |
| 9. Large Material UI Slots File | ~500 B | 1 file (827 lines) |
| 10. Repeated `'MUI X: '` Prefixes | ~200 B | 50+ messages |
| 11. Duplicate Code Patterns (charts) | ~2–3 KB | 20+ files |
| 12. Redundant Nullish Coalescing with New Objects | ~200 B | 20+ instances |
| 13. Duplicate Code Patterns (data grid) | ~1–2 KB | 10+ files |
| 14. Repeated `(theme.vars \|\| theme)` (date pickers) | ~200–400 B | 97 occurrences |
| 15. Scheduler Color Token Repetition | ~800–1200 B | 1 file |
| 16. Polyfill / Compatibility Code | ~160 B | 2 files |
| **Total** | **~12–20 KB** | |

---

## Category 1: TypeScript Enums → const Objects

**Impact: ~3–5 KB gzip savings total (43 enums)**

Each TypeScript `enum` compiles to an IIFE with a runtime object. Numeric enums also generate reverse-mappings, making them the worst offenders. Replacing with `as const` objects + type unions avoids this overhead entirely.

**Fix pattern for each:**
```ts
// Before
export enum Foo { A = 'val', B = 'other' }

// After
export const Foo = { A: 'val', B: 'other' } as const;
export type Foo = (typeof Foo)[keyof typeof Foo];
```

### 1.1 x-data-grid (15 enums, ~1,060 B gzip)

| File | Line | Enum Name | Est. Savings |
|------|------|-----------|-------------|
| `packages/x-data-grid/src/constants/signature.ts` | 5 | `GridSignature` | ~80 B |
| `packages/x-data-grid/src/internals/constants.ts` | 4 | `PinnedColumnPosition` (numeric) | ~100 B |
| `packages/x-data-grid/src/hooks/features/columns/gridColumnsInterfaces.ts` | 4 | `GridPinnedColumnPosition` | ~60 B |
| `packages/x-data-grid/src/hooks/core/strategyProcessing/gridStrategyProcessingApi.ts` | 24 | `GridStrategyGroup` | ~60 B |
| `packages/x-data-grid/src/hooks/features/dataSource/utils.ts` | 3 | `DataSourceRowsUpdateStrategy` | ~80 B |
| `packages/x-data-grid/src/models/gridEditRowModel.ts` | 17, 22, 27 | `GridEditModes`, `GridCellModes`, `GridRowModes` | ~180 B |
| `packages/x-data-grid/src/models/gridFilterItem.ts` | 52 | `GridLogicOperator` | ~60 B |
| `packages/x-data-grid/src/models/params/gridEditCellParams.ts` | 30, 57 | `GridCellEditStartReasons`, `GridCellEditStopReasons` | ~160 B |
| `packages/x-data-grid/src/models/params/gridRowParams.ts` | 63, 91 | `GridRowEditStartReasons`, `GridRowEditStopReasons` | ~160 B |
| `packages/x-data-grid/src/hooks/features/preferencesPanel/gridPreferencePanelsValue.ts` | 1 | `GridPreferencePanelsValue` | ~60 B |
| `packages/x-data-grid/src/components/columnHeaders/GridColumnHeaderSeparator.tsx` | 9 | `GridColumnHeaderSeparatorSides` | ~60 B |

### 1.2 x-data-grid-pro (4 enums, ~190–240 B gzip)

| File | Line | Enum Name | Est. Savings |
|------|------|-----------|-------------|
| `packages/x-data-grid-pro/src/hooks/features/dataSource/utils.ts` | 13 | `RequestStatus` (numeric) | ~60–80 B |
| `packages/x-data-grid-pro/src/hooks/features/treeData/gridTreeDataUtils.ts` | 26 | `TreeDataStrategy` | ~40–50 B |
| `packages/x-data-grid-pro/src/hooks/features/serverSideLazyLoader/useGridDataSourceLazyLoader.ts` | 35 | `LoadingTrigger` (numeric) | ~40–50 B |
| `packages/x-data-grid-pro/src/internals/index.ts` | 79 | `RowGroupingStrategy` | ~50–60 B |

### 1.3 x-data-grid-premium (1 enum, ~60 B gzip)

| File | Line | Enum Name | Est. Savings |
|------|------|-----------|-------------|
| `packages/x-data-grid-premium/src/hooks/features/sidebar/gridSidebarInterfaces.ts` | 1 | `GridSidebarValue` | ~60 B |

### 1.4 x-license (1 enum, ~80 B gzip)

| File | Line | Enum Name | Est. Savings |
|------|------|-----------|-------------|
| `packages/x-license/src/utils/licenseStatus.ts` | 2 | `LICENSE_STATUS` | ~80 B |

### 1.5 x-tree-view-pro (1 enum, ~60 B gzip)

| File | Line | Enum Name | Est. Savings |
|------|------|-----------|-------------|
| `packages/x-tree-view-pro/src/internals/plugins/lazyLoading/utils.ts` | 6 | `RequestStatus` | ~60 B |

### 1.6 x-virtualizer (1 enum, ~60 B gzip)

| File | Line | Enum Name | Est. Savings |
|------|------|-----------|-------------|
| `packages/x-virtualizer/src/models/core.ts` | 70 | `ScrollDirection` | ~60 B |

### 1.7 x-scheduler-headless (13 enums, ~800 B gzip)

| File | Line | Enum Name |
|------|------|-----------|
| `packages/x-scheduler-headless/src/calendar-grid/time-event-placeholder/CalendarGridTimeEventPlaceholderDataAttributes.ts` | 1 | `CalendarGridTimeEventPlaceholderDataAttributes` |
| `packages/x-scheduler-headless/src/calendar-grid/time-event-placeholder/CalendarGridTimeEventPlaceholderCssVars.ts` | 1 | `CalendarGridTimeEventPlaceholderCssVars` |
| `packages/x-scheduler-headless/src/calendar-grid/time-event/CalendarGridTimeEventDataAttributes.ts` | 1 | `CalendarGridTimeEventDataAttributes` |
| `packages/x-scheduler-headless/src/calendar-grid/time-event/CalendarGridTimeEventCssVars.ts` | 1 | `CalendarGridTimeEventCssVars` |
| `packages/x-scheduler-headless/src/calendar-grid/time-column/CalendarGridTimeColumnDataAttributes.ts` | 1 | `CalendarGridTimeColumnDataAttributes` |
| `packages/x-scheduler-headless/src/calendar-grid/root/CalendarGridRootDataAttributes.ts` | 1 | `CalendarGridRootDataAttributes` |
| `packages/x-scheduler-headless/src/calendar-grid/header-cell/CalendarGridHeaderCellDataAttributes.ts` | 1 | `CalendarGridHeaderCellDataAttributes` |
| `packages/x-scheduler-headless/src/calendar-grid/day-row/CalendarGridDayRowDataAttributes.ts` | 1 | `CalendarGridDayRowDataAttributes` |
| `packages/x-scheduler-headless/src/calendar-grid/day-event-placeholder/CalendarGridDayEventPlaceholderDataAttributes.ts` | 1 | `CalendarGridDayEventPlaceholderDataAttributes` |
| `packages/x-scheduler-headless/src/calendar-grid/day-event/CalendarGridDayEventDataAttributes.ts` | 1 | `CalendarGridDayEventDataAttributes` |
| `packages/x-scheduler-headless/src/calendar-grid/day-event/CalendarGridDayEventCssVars.ts` | 1 | `CalendarGridDayEventCssVars` |
| `packages/x-scheduler-headless/src/calendar-grid/day-cell/CalendarGridDayCellDataAttributes.ts` | 1 | `CalendarGridDayCellDataAttributes` |
| `packages/x-scheduler-headless/src/calendar-grid/current-time-indicator/CalendarGridCurrentTimeIndicatorCssVars.ts` | 1 | `CalendarGridCurrentTimeIndicatorCssVars` |
| `packages/x-scheduler-headless/src/base-ui-copy/composite/list/useCompositeListItem.ts` | 22 | `IndexGuessBehavior` |

### 1.8 x-scheduler-headless-premium (6 enums, ~360 B gzip)

| File | Line | Enum Name |
|------|------|-----------|
| `packages/x-scheduler-headless-premium/src/internals/utils/queue.ts` | 9 | `RequestStatus` |
| `packages/x-scheduler-headless-premium/src/event-timeline-premium/root/EventTimelinePremiumRootCssVars.ts` | 1 | `EventTimelinePremiumRootCssVars` |
| `packages/x-scheduler-headless-premium/src/event-timeline-premium/event-placeholder/EventTimelinePremiumEventPlaceholderDataAttributes.ts` | 1 | `EventTimelinePremiumEventPlaceholderDataAttributes` |
| `packages/x-scheduler-headless-premium/src/event-timeline-premium/event-placeholder/EventTimelinePremiumEventPlaceholderCssVars.ts` | 1 | `EventTimelinePremiumEventPlaceholderCssVars` |
| `packages/x-scheduler-headless-premium/src/event-timeline-premium/event/EventTimelinePremiumEventDataAttributes.ts` | 1 | `EventTimelinePremiumEventDataAttributes` |
| `packages/x-scheduler-headless-premium/src/event-timeline-premium/event/EventTimelinePremiumEventCssVars.ts` | 1 | `EventTimelinePremiumEventCssVars` |

---

## Category 2: Duplicate Enum Definitions

**Impact: ~200 B gzip savings**

Identical `RequestStatus` enum defined in 3 separate packages with identical values (`QUEUED`, `PENDING`, `SETTLED`, `UNKNOWN`):

| File | Line |
|------|------|
| `packages/x-data-grid-pro/src/hooks/features/dataSource/utils.ts` | 13 |
| `packages/x-tree-view-pro/src/internals/plugins/lazyLoading/utils.ts` | 6 |
| `packages/x-scheduler-headless-premium/src/internals/utils/queue.ts` | 9 |

**Fix:** Extract to `@mui/x-internals` as a shared constant, or at minimum consolidate within each package family.

---

## Category 3: Dual PinnedColumnPosition Definitions

**Impact: ~100 B gzip savings**

Two separate representations of the same concept:

| File | Line | Name | Type |
|------|------|------|------|
| `packages/x-data-grid/src/internals/constants.ts` | 4 | `PinnedColumnPosition` | Numeric (NONE=0, LEFT=1, RIGHT=2, VIRTUAL=3) |
| `packages/x-data-grid/src/hooks/features/columns/gridColumnsInterfaces.ts` | 4 | `GridPinnedColumnPosition` | String (LEFT='left', RIGHT='right') |

This forces a lookup table in `packages/x-data-grid/src/components/cell/GridCell.tsx:41` (`gridPinnedColumnPositionLookup`) to map between them.

**Fix:** Unify to a single representation.

---

## Category 4: Unguarded Warning String Allocation

**Impact: ~2–4 KB gzip savings (51 call sites across 43 files)**

`warnOnce()` (in `packages/x-internals/src/warning/warning.ts`) has an internal `process.env.NODE_ENV === 'production'` guard that short-circuits console output. However, callers still **allocate string arguments** and **create arrays** in production before the guard is checked.

**Key examples:**

| File | Line | Description |
|------|------|-------------|
| `packages/x-data-grid/src/hooks/utils/useGridSelector.ts` | 63 | Array `['MUI X: useGridSelector...', '...']` allocated every call |
| `packages/x-data-grid/src/hooks/features/filter/gridFilterUtils.ts` | 89, 105, 112 | 3 warning strings |
| `packages/x-data-grid/src/hooks/features/editing/useGridRowEditing.ts` | 581 | Error warning string |
| `packages/x-data-grid/src/hooks/features/editing/useGridCellEditing.ts` | 460 | Error warning string |
| `packages/x-data-grid/src/hooks/features/export/serializers/csvSerializer.ts` | 114 | Array warning |
| `packages/x-data-grid/src/hooks/features/listView/useGridListView.tsx` | 80 | Array warning |
| `packages/x-data-grid/src/hooks/features/dataSource/useGridDataSourceBase.ts` | 165, 255 | 2 warnings |
| `packages/x-data-grid/src/components/cell/GridActionsCell.tsx` | 121 | Template literal warning |
| `packages/x-charts/src/internals/geometry.ts` | 17 | Array of 3 warning strings |
| `packages/x-charts/src/ChartsReferenceLine/*.tsx` | various | Warning strings |
| `packages/x-charts/src/BarChart/checkBarChartScaleErrors.ts` | various | Warning strings |

**Fix:** Wrap all `warnOnce()` call sites in `if (process.env.NODE_ENV !== 'production')` blocks so that string allocation and array creation are DCE'd (Dead Code Eliminated) by bundlers in production:

```ts
// Before
warnOnce(['MUI X: useGridSelector was called with...', '...']);

// After
if (process.env.NODE_ENV !== 'production') {
  warnOnce(['MUI X: useGridSelector was called with...', '...']);
}
```

---

## Category 5: Verbose Error Messages in Production

**Impact: ~1–2 KB gzip savings (80+ throw sites)**

`throw new Error(...)` calls with verbose multi-line messages that remain in production bundles. Many use the `.join('\n')` array pattern which adds additional overhead.

### 5.1 x-data-grid

| File | Line(s) | Description |
|------|---------|-------------|
| `packages/x-data-grid/src/hooks/features/rows/gridRowsUtils.ts` | 56–69 | Multi-line error about unique `id` property |
| `packages/x-data-grid/src/hooks/features/rows/gridRowsUtils.ts` | 458–466 | Duplicated "default value" warning text |
| `packages/x-data-grid/src/hooks/features/rows/useGridRowsOverridableMethods.ts` | various | 8 Error instances |
| `packages/x-data-grid/src/hooks/features/rows/useGridRows.ts` | various | 5 Error instances |
| `packages/x-data-grid/src/hooks/features/columnGrouping/gridColumnGroupsUtils.ts` | various | 3 Error instances |
| `packages/x-data-grid/src/hooks/core/strategyProcessing/useGridStrategyProcessing.ts` | various | 2 Errors |
| `packages/x-data-grid/src/hooks/features/filter/gridFilterUtils.ts` | various | 2 Errors |

### 5.2 x-date-pickers (~300–500 B gzip)

| File | Line(s) | Description |
|------|---------|-------------|
| `packages/x-date-pickers/src/internals/hooks/useField/useField.utils.ts` | 29–34 | Multi-line error with URL |
| `packages/x-date-pickers/src/internals/hooks/useField/useField.utils.ts` | 315 | `'Invalid section type'` |
| `packages/x-date-pickers/src/internals/hooks/useField/buildSectionsFromFormat.ts` | 35–37, 131, 157–159 | 3 unguarded throws |
| `packages/x-date-pickers/src/internals/utils/views.ts` | 34 | Unguarded throw |
| `packages/x-date-pickers/src/hooks/usePickerContext.ts` | 19 | Unguarded throw |
| `packages/x-date-pickers/src/hooks/usePickerAdapter.ts` | 15, 25 | 2 unguarded throws |

### 5.3 x-data-grid-premium (~80–100 B gzip)

| File | Line(s) | Description |
|------|---------|-------------|
| `packages/x-data-grid-premium/src/hooks/features/dataSource/useGridDataSourcePremium.tsx` | 149–153 | ~290-char error not behind production guard |

### 5.4 x-charts (~300–500 B gzip)

| File | Line(s) | Description |
|------|---------|-------------|
| `packages/x-charts/src/BarChart/seriesConfig/bar/seriesProcessor.ts` | 32–36, 44–49, 55–59 | 3 multi-line throws |
| `packages/x-charts/src/LineChart/seriesConfig/seriesProcessor.ts` | 33–38, 44–49, 57–60 | 3 multi-line throws |
| `packages/x-charts/src/ScatterChart/seriesConfig/seriesProcessor.ts` | 17–24 | Multi-line throw |
| `packages/x-charts/src/BarChart/checkBarChartScaleErrors.ts` | various | Multiple throws |
| `packages/x-charts/src/internals/getPercentageValue.ts` | various | Verbose throw |

### 5.5 x-scheduler-headless (~100–200 B gzip)

| File | Line(s) | Description |
|------|---------|-------------|
| `packages/x-scheduler-headless/src/internals/utils/recurring-events/internal-utils.ts` | 103, 122–124, 143–145, 234–239, 368–370, 397–399, 454–456 | 10+ throws |
| `packages/x-scheduler-headless/src/internals/utils/recurring-events/rRuleString.ts` | 44, 48, 55, 65, 78, 86, 94, 103 | 8 throws |
| `packages/x-scheduler-headless/src/internals/utils/recurring-events/getRecurringEventOccurrencesForVisibleDays.ts` | 127, 143–145, 161–163, 277–279 | 4 throws |

**Fix options:**
1. For development-only invariant checks, wrap in `process.env.NODE_ENV !== 'production'` guards
2. For production errors, use error codes: `new Error('MUI_X_ERR_001')` with a documentation URL
3. Replace `.join('\n')` array patterns with template literals

---

## Category 6: Large Barrel Export Files

**Impact: Variable -- potentially massive if tree-shaking fails**

Heavy barrel re-exports make tree-shaking harder for bundlers. Most impactful:

| File | Count | Description |
|------|-------|-------------|
| `packages/x-data-grid/src/index.ts` | 9 `export *` | Main entry point |
| `packages/x-data-grid/src/locales/index.ts` | 42 locale re-exports | All locales loaded if importing from barrel |
| `packages/x-data-grid/src/models/index.ts` | 23 `export *` | Model re-exports |
| `packages/x-data-grid/src/components/index.ts` | 25 `export *` | Component re-exports |
| `packages/x-data-grid/src/internals/index.ts` | 16 `export *` | Internal re-exports |
| `packages/x-data-grid/src/colDef/index.ts` | 14 `export *` | Column def re-exports |
| `packages/x-data-grid/src/models/params/index.ts` | 13 `export *` | Params re-exports |
| `packages/x-charts/src/index.ts` | 32 exports | Charts entry |
| `packages/x-date-pickers/src/index.ts` | 39 exports | Date pickers entry |

**Total:** 296 `export *` statements in x-data-grid alone.

**Fix:**
1. For locales specifically, document that users should import individual locales (e.g., `@mui/x-data-grid/locales/enUS`)
2. Ensure `sideEffects: false` is set in `package.json` for all packages
3. Consider named exports instead of `export *` where possible

---

## Category 7: Inline Style Objects Created Every Render

**Impact: ~500 B gzip savings (15+ components)**

### 7.1 x-data-grid

| File | Line(s) | Description |
|------|---------|-------------|
| `packages/x-data-grid/src/components/virtualization/GridVirtualScrollerFiller.tsx` | various | 2 inline styles |
| `packages/x-data-grid/src/components/GridLoadingOverlay.tsx` | various | 1 inline style |
| `packages/x-data-grid/src/components/GridRow.tsx` | 251–254 | Hidden row style `{ opacity: 0, width: 0, height: 0 }` |
| `packages/x-data-grid/src/components/cell/GridCell.tsx` | 317–324 | Hidden cell style `{ padding: 0, opacity: 0, width: 0, height: 0, border: 0 }` |
| `packages/x-data-grid/src/components/cell/GridSkeletonCell.tsx` | various | 1 inline style |
| `packages/x-data-grid/src/components/cell/GridEditLongTextCell.tsx` | various | 1 inline style |
| `packages/x-data-grid/src/components/columnHeaders/GridColumnHeaderSeparator.tsx` | various | 1 inline style |
| `packages/x-data-grid/src/components/columnHeaders/GridGenericColumnHeaderItem.tsx` | various | 1 inline style |
| `packages/x-data-grid/src/hooks/features/columnHeaders/useGridColumnHeaders.tsx` | various | 3 inline styles |

### 7.2 x-charts (~150–250 B gzip)

| File | Line(s) | Description |
|------|---------|-------------|
| `packages/x-charts/src/Gauge/GaugeValueText.tsx` | 38 | `{ textAnchor: 'middle', dominantBaseline: 'central' }` |
| `packages/x-charts/src/BarChart/BatchBarPlot/BarGroup.tsx` | 87–128 | 4 inline styles with `transformOrigin` |
| `packages/x-charts/src/LineChart/MarkElement.tsx` | 101–105 | Transform style |

### 7.3 x-scheduler (~20–40 B gzip)

| File | Line(s) | Description |
|------|---------|-------------|
| `packages/x-scheduler/src/internals/components/event/event-item/EventItem.tsx` | 182, 208, 235 | `{ '--number-of-lines': 1 }` created 3 times |

**Fix:** Extract static style objects as module-level constants. For dynamic styles, use `useMemo` or CSS variables.

```ts
// Before
style={{ padding: 0, opacity: 0, width: 0, height: 0, border: 0 }}

// After
const HIDDEN_STYLE = { padding: 0, opacity: 0, width: 0, height: 0, border: 0 } as const;
// ...
style={HIDDEN_STYLE}
```

---

## Category 8: gridClasses String Duplication

**Impact: ~300 B gzip savings**

`packages/x-data-grid/src/constants/gridClasses.ts` (1208 lines) defines all class name strings via `generateUtilityClasses`. The same strings appear again in `packages/x-data-grid/src/components/containers/GridRootStyles.ts` in the `elementOverrides` object (lines 37–175).

**Fix:** Reference `gridClasses` keys directly or use `Object.keys(gridClasses)` to build the overrides list instead of duplicating the strings.

---

## Category 9: Large Material UI Slots File

**Impact: ~500 B gzip savings (code splitting opportunity)**

`packages/x-data-grid/src/material/index.tsx` (827 lines) bundles ALL Material UI slot implementations in a single file. Every DataGrid user pays the cost even if they only use a few slots.

**Fix:** Split into separate files per slot component (e.g., `material/BasePagination.tsx`, `material/BaseCheckbox.tsx`, etc.) so unused slots can be tree-shaken.

---

## Category 10: Repeated `'MUI X: '` and Related Prefixes

**Impact: ~200 B gzip savings**

Nearly all warning and error messages start with `'MUI X: '` or `'MUI X Charts: '`. These 7–15 character prefixes appear 50+ times.

**Fix:** Extract to a constant:
```ts
const P = 'MUI X: ';
// or
const MX = 'MUI X: ';
const MXC = 'MUI X Charts: ';
```

---

## Category 11: Duplicate Code Patterns (Charts)

**Impact: ~2–3 KB gzip savings total**

### 11.1 Duplicate keyboardFocusHandler (6 files, ~400–600 B gzip)

Six nearly-identical files with the same `switch(event.key)` pattern:

| File |
|------|
| `packages/x-charts/src/BarChart/seriesConfig/bar/keyboardFocusHandler.ts` |
| `packages/x-charts/src/LineChart/seriesConfig/keyboardFocusHandler.ts` |
| `packages/x-charts/src/ScatterChart/seriesConfig/keyboardFocusHandler.ts` |
| `packages/x-charts/src/PieChart/seriesConfig/keyboardFocusHandler.ts` |
| `packages/x-charts/src/RadarChart/seriesConfig/keyboardFocusHandler.ts` |
| `packages/x-charts-pro/src/FunnelChart/seriesConfig/keyboardFocusHandler.ts` |

Bar, line, and scatter are byte-for-byte identical.

**Fix:** Create a shared factory: `createKeyboardFocusHandler(outSeriesTypes, wrapAround?)`.

### 11.2 Duplicate Stacked Series Processor (bar/line, ~500–800 B gzip)

| File | Lines |
|------|-------|
| `packages/x-charts/src/BarChart/seriesConfig/bar/seriesProcessor.ts` | 14–138 |
| `packages/x-charts/src/LineChart/seriesConfig/seriesProcessor.ts` | 16–133 |

~90% structurally identical -- d3 dataset creation, stacking, validation, error messages.

**Fix:** Extract `createStackedSeriesProcessor(type, defaultMarkType, extraDefaults?)`.

### 11.3 Duplicate Reference Line Components (~300–400 B gzip)

| File | Lines |
|------|-------|
| `packages/x-charts/src/ChartsReferenceLine/ChartsXReferenceLine.tsx` | 196 lines |
| `packages/x-charts/src/ChartsReferenceLine/ChartsYReferenceLine.tsx` | 196 lines |

Structural mirrors with identical `getTextParams` switch/case, component structure, and PropTypes.

**Fix:** Create shared `ReferenceLineBase` component or `useReferenceLine(orientation)` hook.

### 11.4 Duplicate Animation Interpolator Patterns (~300–400 B gzip)

| File | Lines |
|------|-------|
| `packages/x-charts/src/hooks/animation/useAnimatePieArc.ts` | 28–44 |
| `packages/x-charts/src/hooks/animation/useAnimatePieArcLabel.ts` | 36–52 |
| `packages/x-charts/src/hooks/animation/useAnimateGaugeValueArc.ts` | 30–44 |
| `packages/x-charts/src/hooks/animation/useAnimateBar.ts` | 17–31 |
| `packages/x-charts/src/hooks/animation/useAnimateBarLabel.ts` | 17–28 |
| `packages/x-charts/src/BarChart/BarClipPath.tsx` | 26–45 |

Six files with the same `interpolateNumber` for each property, `(t) => ({...})` pattern.

**Fix:** Create generic `createObjectInterpolator(from, to, keys)` utility.

### 11.5 Duplicate Tooltip Getter Functions (~200–300 B gzip)

| File | Lines |
|------|-------|
| `packages/x-charts/src/BarChart/seriesConfig/bar/tooltip.ts` | 7–31 |
| `packages/x-charts/src/LineChart/seriesConfig/tooltip.ts` | 7–26 |
| `packages/x-charts/src/ScatterChart/seriesConfig/tooltip.ts` | 4–23 |
| `packages/x-charts/src/PieChart/seriesConfig/tooltip.ts` | 4–31 |

**Fix:** Create `createSimpleTooltipGetter()` factory.

### 11.6 Duplicate getColor Processors (~200–300 B gzip)

| File | Lines |
|------|-------|
| `packages/x-charts/src/BarChart/seriesConfig/bar/getColor.ts` | 4–57 |
| `packages/x-charts/src/LineChart/seriesConfig/getColor.ts` | 4–51 |

Bar and line getColor processors are structurally identical.

**Fix:** Create shared `createCartesianColorProcessor()`.

### 11.7 Duplicate Axis Highlight Components (~200–300 B gzip)

| File | Lines |
|------|-------|
| `packages/x-charts/src/ChartsAxisHighlight/ChartsXAxisHighlight.tsx` | 81 lines |
| `packages/x-charts/src/ChartsAxisHighlight/ChartsYAxisHighlight.tsx` | 80 lines |

Including identical 3-line error message string.

**Fix:** Merge into `AxisHighlightBase` with orientation prop.

### 11.8 Duplicate Tooltip Position Switch Blocks (~150–200 B gzip)

Eight occurrences across 6 files of the same placement-to-coordinates switch:

| File | Lines |
|------|-------|
| `packages/x-charts/src/BarChart/seriesConfig/bar/tooltipPosition.ts` | 35–45 |
| `packages/x-charts/src/PieChart/seriesConfig/tooltipPosition.ts` | 40–50 |
| `packages/x-charts/src/RadarChart/seriesConfig/tooltipPosition.ts` | 47–57, 66–76 |
| `packages/x-charts-pro/src/Heatmap/seriesConfig/tooltipPosition.ts` | 36–46 |
| `packages/x-charts-pro/src/FunnelChart/seriesConfig/tooltipPosition.ts` | 50–60 |
| `packages/x-charts-pro/src/SankeyChart/seriesConfig/tooltipPosition.ts` | 25–35, 54–64 |

**Fix:** Extract shared `getTooltipPositionFromBounds(placement, x0, y0, x1, y1)`.

### 11.9 Repeated CSS Transition Patterns (~100–150 B gzip)

Eight styled components repeat the same transition properties:

| File |
|------|
| `packages/x-charts/src/BarChart/BarPlot.tsx` |
| `packages/x-charts/src/BarChart/BarLabel/BarLabel.tsx` |
| `packages/x-charts/src/LineChart/MarkElement.tsx` |
| `packages/x-charts/src/LineChart/CircleMarkElement.tsx` |
| `packages/x-charts/src/LineChart/LinePlot.tsx` |
| `packages/x-charts/src/LineChart/AreaPlot.tsx` |
| `packages/x-charts/src/PieChart/PieArcLabel.tsx` |
| `packages/x-charts/src/PieChart/PieArc.tsx` |

**Fix:** Create shared `ANIMATION_TRANSITION_STYLES` mixin.

---

## Category 12: Redundant Nullish Coalescing with New Objects

**Impact: ~200 B gzip savings (20+ instances)**

Pattern `value ?? []` or `value ?? {}` creates a new array/object on every call when value is nullish, causing both bundle bloat and unnecessary React re-renders from referential inequality.

**Key examples:**

| File | Line(s) | Pattern |
|------|---------|---------|
| `packages/x-data-grid/src/hooks/features/columnGrouping/useGridColumnGrouping.ts` | various | 8+ `?? []` instances |
| `packages/x-data-grid/src/hooks/features/columns/useGridColumns.tsx` | 59 | `?? {}` |
| `packages/x-data-grid/src/hooks/features/sorting/useGridSorting.ts` | 40 | `?? []` |
| `packages/x-data-grid/src/hooks/features/pagination/useGridPagination.ts` | 37 | `?? {}` |
| `packages/x-data-grid/src/hooks/features/rows/useGridRows.ts` | 247, 271 | `?? []` / `?? {}` |

**Fix:** Extract empty arrays/objects as module-level constants:
```ts
const EMPTY_ARRAY: readonly never[] = [];
const EMPTY_OBJECT: Record<string, never> = {};
```

---

## Category 13: Duplicate Code Patterns (Data Grid)

**Impact: ~1–2 KB gzip savings total**

### 13.1 Class-based Reorder Operations (x-data-grid-pro, ~200–400 B gzip)

**File:** `packages/x-data-grid-pro/src/hooks/features/treeData/treeDataReorderExecutor.ts`
**Lines:** 18–671

5 class definitions + `BaseReorderOperation` abstract class compile to verbose constructor/prototype code. These classes hold no mutable state.

**Fix:** Replace with plain objects implementing the same interface.

### 13.2 Repeated setState Spread Pattern (x-data-grid-pro, ~290–380 B gzip)

| File | Lines | Instances |
|------|-------|-----------|
| `packages/x-data-grid-pro/src/hooks/features/rowReorder/useGridRowReorder.tsx` | 264–655 | 8 instances |
| `packages/x-data-grid-pro/src/hooks/features/detailPanel/useGridDetailPanel.ts` | 167–277 | 4 instances |
| `packages/x-data-grid-pro/src/hooks/features/dataSource/useGridDataSourceBasePro.ts` | 242–295 | 3 instances |

**Fix:** Extract helper per hook: `const setXState = (patch) => apiRef.current.setState(...)`.

### 13.3 Duplicate createGroupingColDef Functions (x-data-grid-premium, ~200–300 B gzip)

**File:** `packages/x-data-grid-premium/src/hooks/features/rowGrouping/createGroupingColDef.tsx`
**Lines:** 209–320 (`OneGroupingCriteria`), 340–458 (`AllGroupingCriteria`)

~110 and ~120 lines with significant overlap in `renderCell`, `valueGetter`, property spreading.

**Fix:** Extract shared `createGroupingRenderCell(leafColDef, CriteriaCell, groupingCriteria?)`.

### 13.4 Near-Duplicate History Undo/Redo Handlers (x-data-grid-premium, ~150–250 B gzip)

**File:** `packages/x-data-grid-premium/src/hooks/features/history/defaultHistoryHandlers.ts`
**Lines:** 78–125 (cell edit), 181–226 (row edit), 278–353 (clipboard paste)

Three pairs of near-mirror-image undo/redo handlers.

**Fix:** Extract shared helpers: `applyCellValue()`, `applyRowEdit()`, `applyClipboardPaste()`.

### 13.5 Duplicated Navigation Context Code (x-data-grid, ~150–200 B gzip)

**File:** `packages/x-data-grid/src/hooks/features/keyboardNavigation/useGridKeyboardNavigation.ts`
**Lines:** 179–188, 354–362, 512–520

8-line block repeated in 3 handlers plus identical Tab early-return block.

**Fix:** Extract `getNavigationContext(field)` helper.

### 13.6 Repeated Pivoting State Update Pattern (x-data-grid-premium, ~100–150 B gzip)

**File:** `packages/x-data-grid-premium/src/hooks/features/pivoting/useGridPivoting.tsx`
**Lines:** 232–246, 278–296, 383–400, 465–478, 521–534

Five instances of the same `computePivotingState()` + state merge pattern.

**Fix:** Extract `mergePivotState(state, overrides)` helper.

---

## Category 14: Repeated `(theme.vars || theme)` Pattern (Date Pickers)

**Impact: ~200–400 B gzip savings (97 occurrences across 26 files)**

71 occurrences in `x-date-pickers`, 26 in `x-date-pickers-pro`. Most repeated in:

| File | Occurrences |
|------|-------------|
| `packages/x-date-pickers-pro/src/DateRangePickerDay2/DateRangePickerDay2.tsx` | 12 |
| `packages/x-date-pickers/src/PickersDay/PickersDay.tsx` | 8 |
| `packages/x-date-pickers/src/PickerDay2/PickerDay2.tsx` | 7 |
| `packages/x-date-pickers/src/PickersTextField/PickersOutlinedInput/PickersOutlinedInput.tsx` | 6 |
| `packages/x-date-pickers-pro/src/DateRangePickerDay/DateRangePickerDay.tsx` | 6 |

**Fix:** Destructure once per styled callback:
```ts
const styleArg = ({ theme }) => {
  const p = (theme.vars || theme).palette;
  return { color: p.text.primary, backgroundColor: p.primary.main, ... };
};
```

---

## Category 15: Scheduler Color Token Repetition

**Impact: ~800–1200 B gzip savings**

### 15.1 Large Color Token Object

**File:** `packages/x-scheduler/src/internals/utils/tokens.ts`
**Lines:** 22–353

The `eventColorTokens` object contains 12 palettes x 2 modes x 11 properties = 264 color values. The 11 property key strings (`'surface-bold'`, `'surface-bold-hover'`, etc.) are repeated 24 times each.

**Fix:** Use array-based format where keys are defined once:
```ts
const KEYS = ['main', 'surface-bold', 'surface-bold-hover', ...] as const;
const RAW: [string, string[], string[]][] = [
  ['red', [red[500], red[200], '#ED8D8D', ...], [red[600], '#821b1b', ...]],
  ...
];
```

### 15.2 `getPaletteVariants` Called in 9 Styled Components (~400–600 B gzip)

**File:** `packages/x-scheduler/src/internals/utils/tokens.ts:361–389`

Called in 9 styled components across 7 files, each generating 12 variant objects x 18 CSS variable assignments.

**Fix:** Apply palette CSS variables once on a shared ancestor wrapper.

### 15.3 Repeated Component Name Strings (~100–160 B gzip)

| String | Occurrences | Files |
|--------|-------------|-------|
| `'MuiEventCalendar'` | 103 | 19 files |
| `'MuiEventDraggableDialog'` | 19 | 6 files |

**Fix:** Extract to module-level constants per file.

---

## Category 16: Polyfill / Compatibility Code

**Impact: ~160 B gzip savings**

### 16.1 `doesSupportPreventScroll` (~120 B gzip)

**File:** `packages/x-data-grid/src/utils/doesSupportPreventScroll.ts` (entire file)

Runtime detection of `focus({ preventScroll })` -- supported in all modern browsers (Chrome 64+, Firefox 68+, Safari 15+).

**Fix:** Remove entirely; always pass `{ preventScroll: true }` directly.

### 16.2 `deepClone` with `structuredClone` Fallback (~40 B gzip)

**File:** `packages/x-data-grid/src/utils/utils.ts`
**Lines:** 69–74

`structuredClone` is available in all modern browsers (Chrome 98+, Firefox 94+, Safari 15.4+).

**Fix:** Use `structuredClone` directly.

---

## Additional Per-Package Findings

### x-data-grid: Additional Optimizations (~200 B gzip)

| Finding | File | Line(s) | Est. Savings |
|---------|------|---------|-------------|
| Repeated `InputComponentProps: { type: 'number' }` x6 | `packages/x-data-grid/src/colDef/gridNumericOperators.ts` | 44, 59, 75, 95, 113, 131 | ~30 B |
| Repeated `InputComponentProps` ternary x6 | `packages/x-data-grid/src/colDef/gridDateOperators.ts` | 62, 70, 84, 96, 104, 117 | ~40 B |
| Repeated null/NaN guard x6 | `packages/x-data-grid/src/colDef/gridNumericOperators.ts` | 36, 50, 66, 84, 100, 118 | ~50 B |
| `localStorageAvailable` 44-char magic key | `packages/x-data-grid/src/utils/utils.ts` | 13–25 | ~30 B |
| Near-identical `publishMouseUp`/`publishMouseDown` | `packages/x-data-grid/src/components/cell/GridCell.tsx` | 268–289 | ~40 B |
| `getDefaultColTypeDef` called 3x for same column | `packages/x-data-grid/src/hooks/features/columns/gridColumnsUtils.ts` | 363, 374, 392 | ~10 B |

### x-data-grid-pro: Additional Optimizations (~200 B gzip)

| Finding | File | Line(s) | Est. Savings |
|---------|------|---------|-------------|
| Verbose prop validation strings (5 strings, not prod-guarded) | `packages/x-data-grid-pro/src/internals/propValidation.ts` | 9–40 | ~100–150 B |
| Repeated identical dropTarget reset objects x4 | `packages/x-data-grid-pro/src/hooks/features/rowReorder/useGridRowReorder.tsx` | 117, 405, 460, 567 | ~30–40 B |
| Repeated `gridRowNodeSelector(apiRef, ...)` x16 | `packages/x-data-grid-pro/src/hooks/features/treeData/treeDataReorderExecutor.ts` | various | ~60–80 B |

### x-data-grid-premium: Additional Optimizations (~200 B gzip)

| Finding | File | Line(s) | Est. Savings |
|---------|------|---------|-------------|
| Triplicated `valueFormatter` function | `packages/x-data-grid-premium/src/hooks/features/aggregation/gridAggregationFunctions.ts` | 98–136 | ~40–60 B |
| Repeated `pivotModel.xxx.filter(!hidden)` x3 | `packages/x-data-grid-premium/src/hooks/features/pivoting/utils.ts` + `useGridPivoting.tsx` | 119, 166, 557 | ~60–80 B |
| Verbose inline style for clipboard input (9 `el.style.xxx` lines) | `packages/x-data-grid-premium/src/hooks/features/clipboard/useGridClipboardImport.ts` | 60–68 | ~40–50 B |
| Repeated `gridClasses['cell--rangeXxx']` lookups | `packages/x-data-grid-premium/src/hooks/features/cellSelection/useGridCellSelection.ts` | 509–543 | ~20–30 B |

### x-date-pickers: Additional Optimizations (~200 B gzip)

| Finding | File | Line(s) | Est. Savings |
|---------|------|---------|-------------|
| Large switch/case blocks convertible to lookups | `packages/x-date-pickers/src/internals/hooks/useField/useField.utils.ts` | 268–318, 516–579 | ~100–200 B |
| Duplicate `formatMeridiem()` calls same render | `packages/x-date-pickers/src/TimeClock/Clock.tsx` | 412, 415, 424, 427 | ~50–80 B |
| Deprecated `getSectionOrder` still exported (TODO v9) | `packages/x-date-pickers/src/internals/hooks/useField/useField.utils.ts` | 615 | ~50–100 B |

### x-scheduler: Additional Optimizations (~200 B gzip)

| Finding | File | Line(s) | Est. Savings |
|---------|------|---------|-------------|
| Duplicate `pushPlaceholder` function | `packages/x-scheduler/src/.../GeneralTab.tsx` + `FormContent.tsx` | 81–99 / 119–137 | ~80–120 B |
| Repeated positive-mod-7 pattern x6 | `packages/x-scheduler-headless/src/.../internal-utils.ts` | 76, 89, 183, 198, 270, 502 | ~40–60 B |
| Repeated `Math.max(1, rule.interval ?? 1)` x5 | `packages/x-scheduler-headless/src/.../internal-utils.ts` | 285, 310, 363, 449 | ~20–30 B |
| Gray scale tokens could be loop-generated | `packages/x-scheduler/src/internals/utils/tokens.ts` | 395–412 | ~30–50 B |
| Redundant template literal wrapping x10 | `packages/x-scheduler/src/.../RecurrenceTab.tsx` | 225–262 | ~10–20 B |

### x-charts: Additional Optimizations (~250 B gzip)

| Finding | File | Line(s) | Est. Savings |
|---------|------|---------|-------------|
| `getSymbol` switch-to-lookup conversion | `packages/x-charts/src/internals/getSymbol.ts` | 3–15 | ~80 B |
| Duplicate Object.keys(style).forEach pattern x2 | `packages/x-charts/src/internals/domUtils.ts` | 114–118, 173–177 | ~80–120 B |
| SVG namespace string `'http://www.w3.org/2000/svg'` x3 | `packages/x-charts/src/internals/domUtils.ts` | 110, 181, 236 | ~20–40 B |
| `shallowEqual` reimplementation (~40 lines) | `packages/x-charts/src/internals/shallowEqual.ts` | entire file | ~100 B |
| `drawingArea` properties not destructured (18 occurrences) | `packages/x-charts/src/BarChart/BatchBarPlot/BarGroup.tsx` | throughout | ~50–100 B |

---

## Priority Recommendations

### High Priority (Mechanical, Low Risk, High Impact)

1. **Convert all 43 TypeScript enums to const objects** (~3–5 KB gzip). Mechanical transformation with clear patterns. No runtime behavior change.

2. **Wrap all 51 `warnOnce()` call sites in `process.env.NODE_ENV` guards** (~2–4 KB gzip). Ensures string allocation is DCE'd in production.

3. **Extract shared chart code patterns** (~2–3 KB gzip). Factory functions for keyboard focus handlers, series processors, tooltip getters, animation interpolators.

### Medium Priority (Moderate Effort, Good Impact)

4. **Guard verbose error messages** (~1–2 KB gzip). Use error codes for production, verbose messages for dev.

5. **Restructure scheduler color tokens** (~800–1200 B gzip). Array-based format eliminates repeated key strings.

6. **Deduplicate data grid code patterns** (~1–2 KB gzip). setState helpers, navigation context, grouping col defs, history handlers.

### Low Priority (Small Savings, Good Practice)

7. **Extract inline style constants** (~500 B gzip)
8. **Extract `EMPTY_ARRAY`/`EMPTY_OBJECT` constants** (~200 B gzip)
9. **Remove browser polyfills** (~160 B gzip)
10. **Extract repeated string prefixes** (~200 B gzip)
