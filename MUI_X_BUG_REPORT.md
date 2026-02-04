# MUI X Bug Report

Verified bugs found across data-grid, date-pickers, and charts packages. Each entry includes the exact file path, line numbers, code snippets, explanations, and reproduction steps.

---

## Table of Contents

- [Data Grid - Package Bugs (7)](#data-grid---package-bugs)
- [Data Grid - Locale Bugs (6)](#data-grid---locale-bugs)
- [Data Grid - Documentation Bug (1)](#data-grid---documentation-bug)
- [Date Pickers - Package Bugs (2)](#date-pickers---package-bugs)
- [Charts - Package Bugs (2)](#charts---package-bugs)

---

## Data Grid - Package Bugs

### Bug 1: Average aggregation returns `null` for valid average of 0

**Severity:** High
**File:** `packages/x-data-grid-premium/src/hooks/features/aggregation/gridAggregationFunctions.ts:35`

**Code:**
```ts
// lines 27-39
for (let i = 0; i < values.length; i += 1) {
  const value = values[i];
  if (typeof value === 'number' && !Number.isNaN(value)) {
    valuesCount += 1;
    sum += value;
  }
}

if (sum === 0) {
  return null;
}

return sum / valuesCount;
```

**Explanation:** The guard `if (sum === 0) return null` is meant to handle the case where no valid numeric values were found (i.e., `valuesCount === 0`). However, it also triggers when the sum of valid values is legitimately zero. For example, averaging `[0, 0, 0]` or `[-1, 1]` would return `null` instead of the correct result (`0`).

**Fix:** Replace `if (sum === 0)` with `if (valuesCount === 0)`.

**Reproduction:**
1. Create a DataGrid with aggregation enabled and a number column.
2. Populate rows where all values are `0` (e.g., `[0, 0, 0]`).
3. Enable the `avg` aggregation function on that column.
4. Observe the aggregation row shows blank/null instead of `0`.

---

### Bug 2: Date filter displays wrong date in non-UTC timezones

**Severity:** Medium
**File:** `packages/x-data-grid/src/components/panel/filterPanel/GridFilterInputDate.tsx:26-27`

**Code:**
```tsx
// lines 26-35
if (inputType === 'date') {
  return dateCopy.toISOString().substring(0, 10);
}
if (inputType === 'datetime-local') {
  // The date picker expects the date to be in the local timezone.
  // But .toISOString() converts it to UTC with zero offset.
  // So we need to subtract the timezone offset.
  dateCopy.setMinutes(dateCopy.getMinutes() - dateCopy.getTimezoneOffset());
  return dateCopy.toISOString().substring(0, 19);
}
```

**Explanation:** For `inputType === 'date'`, the code calls `toISOString()` which converts to UTC. A date like `2024-01-15T01:00:00` in UTC+5 becomes `2024-01-14T20:00:00Z` in UTC, and `.substring(0, 10)` yields `"2024-01-14"` — the previous day. The `datetime-local` branch correctly adjusts for the timezone offset, but the `date` branch does not.

**Fix:** Apply the same timezone offset adjustment for the `date` branch as is done for `datetime-local`.

**Reproduction:**
1. Set your system timezone to a positive UTC offset (e.g., UTC+5).
2. Create a DataGrid with a date column.
3. Open the filter panel and filter by date.
4. Select a date that, when interpreted in UTC, falls on the previous day.
5. Observe the filter input displays the wrong date.

---

### Bug 3: Off-by-one in Q3 percentile calculation during column autosize

**Severity:** Low
**File:** `packages/x-data-grid/src/hooks/features/columnResize/useGridColumnResize.tsx:191`

**Code:**
```ts
// lines 190-191
const q1 = values[Math.floor(values.length * 0.25)];
const q3 = values[Math.floor(values.length * 0.75) - 1];
```

**Explanation:** The Q1 calculation uses `Math.floor(values.length * 0.25)` without subtracting 1, but the Q3 calculation subtracts 1 from the index. This asymmetry means Q3 selects an index one position lower than the standard percentile calculation. For example, with 8 sorted values, Q3 should be at index 6 (`Math.floor(8 * 0.75)`) but instead selects index 5. This can cause the IQR to be smaller than expected, leading to more aggressive outlier filtering during column autosize.

**Fix:** Remove the `- 1` from the Q3 index: `values[Math.floor(values.length * 0.75)]`.

**Reproduction:**
1. Create a DataGrid with a column containing cells of varying text lengths.
2. Call `apiRef.current.autosizeColumns({ includeOutliers: false })`.
3. Compare the resulting column width with the expected width based on correct Q3 calculation.

---

### Bug 4: `parseFloat` returns `NaN` on empty style string

**Severity:** Medium
**File:** `packages/x-data-grid/src/hooks/features/columnResize/useGridColumnResize.tsx:903`

**Code:**
```ts
// lines 895-903
function updateProperty(
  element: HTMLElement | undefined,
  property: 'right' | 'left' | 'width',
  delta: number,
) {
  if (!element) {
    return;
  }
  element.style[property] = `${Math.round(parseFloat(element.style[property])) + delta}px`;
}
```

**Explanation:** When `element.style[property]` is an empty string (e.g., the property hasn't been set inline), `parseFloat('')` returns `NaN`. Then `Math.round(NaN) + delta` is still `NaN`, and the style is set to `"NaNpx"`, which is an invalid CSS value.

**Fix:** Add a fallback: `parseFloat(element.style[property]) || 0`.

**Reproduction:**
1. Create a DataGrid where column separator elements don't have inline `left`/`right`/`width` styles set.
2. Trigger a column resize operation.
3. Inspect the element styles — they may contain `"NaNpx"` values.

---

### Bug 5: Missing `try/finally` around autosizing leaves CSS class stuck

**Severity:** Medium
**File:** `packages/x-data-grid/src/hooks/features/columnResize/useGridColumnResize.tsx:212,286`

**Code:**
```ts
// line 212
root.classList.add(gridClasses.autosizing);

// lines 217-284 (processing loop with no try/finally)
columns.forEach((column) => {
  // ... cell measurements, DOM operations that could throw ...
});

// line 286
root.classList.remove(gridClasses.autosizing);
```

**Explanation:** The function `extractColumnWidths` adds the `gridClasses.autosizing` CSS class at line 212 and removes it at line 286. However, the entire processing loop between these lines (including DOM operations like `getBoundingClientRect()`, `getComputedStyle()`, and `querySelector()`) is not wrapped in a `try/finally` block. If any of these operations throw an error, the `autosizing` class is never removed, and the grid remains in an autosizing visual state.

**Fix:** Wrap the processing loop in `try/finally`, with `root.classList.remove(gridClasses.autosizing)` in the `finally` block.

**Reproduction:**
1. Create a DataGrid where autosizing encounters a DOM error (e.g., a column references elements that no longer exist).
2. Call `autosizeColumns()`.
3. If the processing throws, the grid retains the `autosizing` class and may display incorrectly.

---

### Bug 6: Missing `|| 0` fallback for `paddingLeft` parsing

**Severity:** Low
**File:** `packages/x-data-grid/src/hooks/features/columnResize/useGridColumnResize.tsx:239-240`

**Code:**
```ts
// lines 235-240
const titleContainerStyle = window.getComputedStyle(titleContainer, null);
const gap = parseInt(titleContainerStyle.gap, 10) || 0;

const headerStyle = window.getComputedStyle(header, null);
const paddingWidth =
  parseInt(headerStyle.paddingLeft, 10) + parseInt(headerStyle.paddingRight, 10);
```

**Explanation:** Line 236 correctly uses `|| 0` as a fallback when parsing the `gap` style (in case `parseInt` returns `NaN`). However, lines 239-240 parse `paddingLeft` and `paddingRight` without the same `|| 0` fallback. If either computed style returns `"normal"`, `"auto"`, or an empty string, `parseInt` returns `NaN`, and `paddingWidth` becomes `NaN`, corrupting the column width calculation.

**Fix:** Add `|| 0` to both `parseInt` calls: `parseInt(headerStyle.paddingLeft, 10) || 0` and `parseInt(headerStyle.paddingRight, 10) || 0`.

**Reproduction:**
1. Create a DataGrid with custom header styling where `paddingLeft` or `paddingRight` resolves to a non-numeric computed value.
2. Call `autosizeColumns()` with `includeHeaders: true`.
3. The resulting column width may be `NaN` or incorrect.

---

### Bug 7: Array bounds issue in `expandMouseRowRangeSelection`

**Severity:** Low
**File:** `packages/x-data-grid/src/hooks/features/rowSelection/useGridRowSelection.ts:131-135`

**Code:**
```ts
// lines 125-135
const visibleRowIds = gridExpandedSortedRowIdsSelector(apiRef);
const startIndex = visibleRowIds.findIndex((rowId) => rowId === startId);
const endIndex = visibleRowIds.findIndex((rowId) => rowId === endId);
if (startIndex === endIndex) {
  return;
}
if (startIndex > endIndex) {
  endId = visibleRowIds[endIndex + 1];
} else {
  endId = visibleRowIds[endIndex - 1];
}
```

**Explanation:** When `endIndex` is the last index in the array, `visibleRowIds[endIndex + 1]` accesses an out-of-bounds index, returning `undefined`. Similarly, when `endIndex` is `0`, `visibleRowIds[endIndex - 1]` accesses index `-1`, also returning `undefined`. This causes `endId` to become `undefined`, which is then passed to `selectRowRange`, producing unexpected behavior.

**Fix:** Add bounds checks before accessing `endIndex + 1` and `endIndex - 1`.

**Reproduction:**
1. Create a DataGrid with row selection enabled.
2. Click to select the first row, then Shift+click on the second row (where `endIndex` is 0 and `startIndex > endIndex` triggers `endIndex + 1`), or perform the equivalent at the last row boundary.
3. Observe that the selection range may behave incorrectly.

---

## Data Grid - Locale Bugs

### Bug 8: Double space in Spanish locale `chartsDragToValues`

**Severity:** Low
**File:** `packages/x-data-grid/src/locales/esES.ts:280`

**Code:**
```ts
// lines 277-280
chartsDragToDimensions: (dimensionLabel: string) =>
  `Arrastrar aquí para utilizar la columna como ${dimensionLabel}`,
chartsDragToValues: (valuesLabel: string) =>
  `Arrastrar aquí para utilizar la columna como  ${valuesLabel}`,
//                                               ^^ double space
```

**Explanation:** The `chartsDragToValues` string has two spaces before `${valuesLabel}`, while the equivalent `chartsDragToDimensions` on line 278 correctly uses a single space. This is a typo.

**Fix:** Remove the extra space: `"como ${valuesLabel}"`.

**Reproduction:**
1. Use the DataGrid with charts in Spanish locale.
2. Observe the drag-to-values tooltip text has a double space.

---

### Bug 9: Spanish locale uses `count > 1` instead of `count !== 1` for pluralization

**Severity:** Medium
**File:** `packages/x-data-grid/src/locales/esES.ts:28-29,137-138,143-146`

**Code:**
```ts
// line 28-29
toolbarFiltersTooltipActive: (count) =>
  count > 1 ? `${count} filtros activos` : `${count} filtro activo`,

// line 137-138
columnHeaderFiltersTooltipActive: (count) =>
  count > 1 ? `${count} filtros activos` : `${count} filtro activo`,

// line 143-146
footerRowSelected: (count) =>
  count > 1
    ? `${count.toLocaleString()} filas seleccionadas`
    : `${count.toLocaleString()} fila seleccionada`,
```

**Explanation:** The condition `count > 1` means that when `count === 0`, the singular form is used (e.g., "0 filtro activo" instead of "0 filtros activos"). In Spanish (and most languages), zero takes the plural form. The correct check is `count !== 1`.

**Fix:** Replace `count > 1` with `count !== 1` in all three locations.

**Reproduction:**
1. Use the DataGrid in Spanish locale.
2. Set up filters so that `count === 0` active filters are shown.
3. Observe the tooltip incorrectly shows the singular form "0 filtro activo".

---

### Bug 10: French locale same `count > 1` pluralization bug

**Severity:** Medium
**File:** `packages/x-data-grid/src/locales/frFR.ts:28-29,137-138,143-146`

**Code:**
```ts
// line 28-29
toolbarFiltersTooltipActive: (count) =>
  count > 1 ? `${count} filtres actifs` : `${count} filtre actif`,

// line 137-138
columnHeaderFiltersTooltipActive: (count) =>
  count > 1 ? `${count} filtres actifs` : `${count} filtre actif`,

// line 143-146
footerRowSelected: (count) =>
  count > 1
    ? `${count.toLocaleString()} lignes sélectionnées`
    : `${count.toLocaleString()} ligne sélectionnée`,
```

**Explanation:** Same issue as Spanish. `count > 1` should be `count !== 1`. When `count === 0`, French uses the plural form.

**Fix:** Replace `count > 1` with `count !== 1` in all three locations.

---

### Bug 11: Italian locale same `count > 1` pluralization bug

**Severity:** Medium
**File:** `packages/x-data-grid/src/locales/itIT.ts:28-29,137-138,143-146`

**Code:**
```ts
// line 28-29
toolbarFiltersTooltipActive: (count) =>
  count > 1 ? `${count} filtri attivi` : `${count} filtro attivo`,

// line 137-138
columnHeaderFiltersTooltipActive: (count) =>
  count > 1 ? `${count} filtri attivi` : `${count} filtro attivo`,

// line 143-146
footerRowSelected: (count) =>
  count > 1
    ? `${count.toLocaleString()} record selezionati`
    : `${count.toLocaleString()} record selezionato`,
```

**Explanation:** Same issue as Spanish/French. `count > 1` should be `count !== 1`.

**Fix:** Replace `count > 1` with `count !== 1` in all three locations.

---

### Bug 12: Catalan locale same `count > 1` pluralization bug

**Severity:** Medium
**File:** `packages/x-data-grid/src/locales/caES.ts:28-29`

**Code:**
```ts
// line 28-29
toolbarFiltersTooltipActive: (count) =>
  count > 1 ? `${count} filtres actius` : `${count} filtre actiu`,
```

**Explanation:** Same `count > 1` pluralization issue. Catalan uses plural for zero.

**Fix:** Replace `count > 1` with `count !== 1`.

---

### Bug 13: Dutch locale same `count > 1` pluralization bug

**Severity:** Medium
**File:** `packages/x-data-grid/src/locales/nlNL.ts:28-29,137-138,143-146`

**Code:**
```ts
// line 28-29
toolbarFiltersTooltipActive: (count) =>
  count > 1 ? `${count} actieve filters` : `${count} filter actief`,

// line 137-138
columnHeaderFiltersTooltipActive: (count) =>
  count > 1 ? `${count} actieve filters` : `${count} filter actief`,

// line 143-146
footerRowSelected: (count) =>
  count > 1
    ? `${count.toLocaleString()} rijen geselecteerd`
    : `${count.toLocaleString()} rij geselecteerd`,
```

**Explanation:** Same `count > 1` pluralization issue. Dutch uses plural for zero.

**Fix:** Replace `count > 1` with `count !== 1` in all three locations.

---

## Data Grid - Documentation Bug

### Bug 14: State type mismatch in `CustomMultiValueOperator` example

**Severity:** Low
**File:** `docs/data/data-grid/filtering/CustomMultiValueOperator.tsx:19-20`

**Code:**
```tsx
// lines 19-20
const [filterValueState, setFilterValueState] = React.useState<[string, string]>(
  item.value ?? '',
);
```

**Explanation:** The state is typed as `[string, string]` (a tuple), but the fallback value `''` is a plain string, not a tuple. When `item.value` is `undefined` or `null`, the state is initialized to `''` instead of a valid tuple like `['', '']`. This type mismatch can cause runtime errors when code later tries to destructure or index into the state value expecting a two-element array.

**Fix:** Change the fallback to `item.value ?? ['', '']`.

**Reproduction:**
1. Open the Custom Multi-Value Operator demo.
2. If a filter item has no initial value, the state is initialized as a plain string.
3. Subsequent code that accesses `filterValueState[0]` or `filterValueState[1]` gets individual characters instead of the expected tuple elements.

---

## Date Pickers - Package Bugs

### Bug 15: `removeLastSeparator` sets non-existent `separator` property

**Severity:** High
**File:** `packages/x-date-pickers-pro/src/internals/utils/date-fields-utils.ts:20`

**Code:**
```ts
// lines 17-24
export const removeLastSeparator = (dateSections: FieldRangeSection[]) =>
  dateSections.map((section, sectionIndex) => {
    if (sectionIndex === dateSections.length - 1) {
      return { ...section, separator: null };
    }

    return section;
  });
```

**Explanation:** The `FieldSection` interface (and `FieldRangeSection` which extends it) does not have a `separator` property. The actual properties are `startSeparator` and `endSeparator`. By spreading and setting `separator: null`, the code adds a new unused property to the object but never modifies `endSeparator`, which was the intended target. The last separator is therefore never actually removed.

**Fix:** Change `{ ...section, separator: null }` to `{ ...section, endSeparator: '' }`.

**Reproduction:**
1. Use a date range picker with a multi-section field.
2. Inspect the field sections after `removeLastSeparator` is called.
3. Observe that the last section's `endSeparator` is unchanged, and a spurious `separator` property has been added.

---

### Bug 16: Empty cleanup function instead of clearing timeout

**Severity:** Medium
**File:** `packages/x-date-pickers/src/internals/hooks/useField/useFieldState.ts:494`

**Code:**
```ts
// lines 488-495
const cleanCharacterQueryTimeout = useTimeout();
React.useEffect(() => {
  if (state.characterQuery != null) {
    cleanCharacterQueryTimeout.start(QUERY_LIFE_DURATION_MS, () => setCharacterQuery(null));
  }

  return () => {};
}, [state.characterQuery, setCharacterQuery, cleanCharacterQueryTimeout]);
```

**Explanation:** The `useEffect` cleanup function is `() => {}` — an empty no-op. When the effect re-runs or the component unmounts, the previously scheduled timeout from `cleanCharacterQueryTimeout.start()` is not cleared. This means stale timeouts can fire after the component has unmounted or after the dependency values have changed, potentially calling `setCharacterQuery(null)` at unexpected times.

**Fix:** Replace `return () => {}` with `return () => { cleanCharacterQueryTimeout.clear(); }`.

**Reproduction:**
1. Use a date field component and type characters rapidly to trigger character queries.
2. Unmount the component or change `state.characterQuery` quickly before the timeout fires.
3. The stale timeout fires after cleanup, potentially causing state updates on unmounted components.

---

## Charts - Package Bugs

### Bug 17: `removeEventListener` missing `options` parameter

**Severity:** Medium
**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartInteractionListener/useChartInteractionListener.ts:149`

**Code:**
```ts
// lines 146-149
svg?.addEventListener(interaction, callback, options);

return {
  cleanup: () => svg?.removeEventListener(interaction, callback),
};
```

**Explanation:** The `addEventListener` call on line 146 passes `options` (which may include `capture`, `passive`, etc.), but the corresponding `removeEventListener` on line 149 does not. According to the DOM specification, if a listener was added with `{ capture: true }`, calling `removeEventListener` without `{ capture: true }` will not remove it. This causes event listener leaks — old listeners accumulate on the SVG element and are never cleaned up.

**Fix:** Pass `options` to `removeEventListener`: `svg?.removeEventListener(interaction, callback, options)`.

**Reproduction:**
1. Create a chart with interaction listeners that use `{ capture: true }` or `{ passive: true }`.
2. Trigger the cleanup function (e.g., by changing chart configuration).
3. Inspect the SVG element — the old event listeners are still attached.

---

### Bug 18: Sentinel value 0 conflicts with legitimate bar position x=0

**Severity:** Medium
**File:** `packages/x-charts/src/BarChart/useBarPlotData.ts:122-123`

**Code:**
```ts
// lines 112-123
xOrigin,
yOrigin,
x: 0,
y: 0,
};
}

const mask = masks[result.maskId];
mask.width = layout === 'vertical' ? result.width : mask.width + result.width;
mask.height = layout === 'vertical' ? mask.height + result.height : result.height;
mask.x = Math.min(mask.x === 0 ? Infinity : mask.x, result.x);
mask.y = Math.min(mask.y === 0 ? Infinity : mask.y, result.y);
```

**Explanation:** The mask is initialized with `x: 0` and `y: 0` (lines 114-115), and the code on lines 122-123 uses `mask.x === 0 ? Infinity : mask.x` to detect whether the mask position has been set yet. However, this sentinel value of `0` conflicts with bars that legitimately have `x=0` or `y=0` (e.g., the first bar in a horizontal chart). On the second iteration, a real position of `0` is treated as "unset", replaced with `Infinity`, and `Math.min(Infinity, result.x)` selects the second bar's position instead of the correct minimum.

**Fix:** Initialize `x` and `y` to `Infinity` instead of `0`, and remove the ternary check: `mask.x = Math.min(mask.x, result.x)`.

**Reproduction:**
1. Create a horizontal BarChart where the first bar starts at x=0.
2. Add multiple stacked bars with the same `maskId`.
3. Observe that the mask position does not correctly use x=0 from the first bar.

---

## Summary

| Package | Category | Count |
|---------|----------|-------|
| Data Grid | Package Bugs | 7 |
| Data Grid | Locale Bugs | 6 |
| Data Grid | Documentation Bugs | 1 |
| Date Pickers | Package Bugs | 2 |
| Charts | Package Bugs | 2 |
| **Total** | | **18** |
