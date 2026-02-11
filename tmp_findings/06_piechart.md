# PieChart Bundle Size Optimization Findings

Scope: All `.ts` and `.tsx` files in `packages/x-charts/src/PieChart/`

---

## Finding 1: Duplicate `attributesOverride` Pattern with `additionalRadius: 0`

**Files affected:**
- `packages/x-charts/src/PieChart/dataTransform/useTransformData.ts` (lines 66-69)
- `packages/x-charts/src/PieChart/dataTransform/getModifiedArcProperties.ts` (lines 27-30)

**Current code in useTransformData.ts:**
```typescript
const attributesOverride = {
  additionalRadius: 0,
  ...((isFaded && faded) || (isHighlighted && highlighted) || {}),
};
```

**Current code in getModifiedArcProperties.ts:**
```typescript
const attributesOverride = {
  additionalRadius: 0,
  ...((isFaded && faded) || (isHighlighted && highlighted) || {}),
};
```

**Issue:** Identical pattern repeated in two files. The same logic for computing highlight/fade attribute overrides appears in both places.

**Suggested fix:** Extract to a shared utility function:
```typescript
export const getAttributesOverride = (
  isFaded: boolean,
  faded: object | undefined,
  isHighlighted: boolean,
  highlighted: object | undefined,
) => ({
  additionalRadius: 0,
  ...((isFaded && faded) || (isHighlighted && highlighted) || {}),
});
```

**Estimated gzip savings:** 12-15 bytes

---

## Finding 2: Verbose Ternary for Cursor CSS Property

**File:** `packages/x-charts/src/PieChart/PieArc.tsx` (line 155)

**Current code:**
```typescript
cursor={onClick ? 'pointer' : 'unset'}
```

**Issue:** The string `'unset'` is 5 characters. Using `undefined` lets the browser ignore the property entirely and is more idiomatic in React.

**Suggested fix:**
```typescript
cursor={onClick ? 'pointer' : undefined}
```

**Estimated gzip savings:** 4-6 bytes

---

## Finding 3: Verbose Data Attribute Patterns Using `|| undefined`

**File:** `packages/x-charts/src/PieChart/PieArc.tsx` (lines 164-165)

**Current code:**
```typescript
data-highlighted={ownerState.isHighlighted || undefined}
data-faded={ownerState.isFaded || undefined}
```

**Issue:** The `|| undefined` suffix is 14 bytes per attribute (28 bytes total). Since `false || undefined` evaluates to `undefined`, this works but is verbose. A shorter approach exists.

**Suggested fix:**
```typescript
data-highlighted={ownerState.isHighlighted || undefined}
data-faded={ownerState.isFaded || undefined}
```
Could become:
```typescript
{...(ownerState.isHighlighted && { 'data-highlighted': true })}
{...(ownerState.isFaded && { 'data-faded': true })}
```
Or more simply, since the value is boolean and only `true` matters:
```typescript
data-highlighted={ownerState.isHighlighted ? '' : undefined}
data-faded={ownerState.isFaded ? '' : undefined}
```

**Estimated gzip savings:** 12-14 bytes

---

## Finding 4: Duplicate `skipAnimation ?? false` Pattern

**Files affected:**
- `packages/x-charts/src/PieChart/PieArcPlot.tsx` (line 110)
- `packages/x-charts/src/PieChart/PieArcLabelPlot.tsx` (line 146)

**Current code (PieArcPlot.tsx line 110):**
```typescript
skipAnimation={skipAnimation ?? false}
```

**Current code (PieArcLabelPlot.tsx line 146):**
```typescript
skipAnimation={skipAnimation ?? false}
```

**Issue:** `?? false` is redundant when passing to a component that accepts `boolean`. The value `undefined ?? false` equals `false`, but `undefined` is already falsy and the receiving component could default it.

**Suggested fix:** Use `!!skipAnimation` or coerce once at the parent (`PiePlot`) level and pass down:
```typescript
skipAnimation={!!skipAnimation}
```
Or default in the parent:
```typescript
// In PiePlot:
const skip = skipAnimation ?? false;
// Then pass `skip` directly
```

**Estimated gzip savings:** 6-8 bytes

---

## Finding 5: Duplicate Transform String Template in PiePlot

**File:** `packages/x-charts/src/PieChart/PiePlot.tsx` (lines 67 and 94)

**Current code (line 67):**
```typescript
transform={`translate(${seriesLayout[seriesId].center.x}, ${seriesLayout[seriesId].center.y})`}
```

**Current code (line 94):**
```typescript
transform={`translate(${seriesLayout[seriesId].center.x}, ${seriesLayout[seriesId].center.y})`}
```

**Issue:** The identical transform string template is repeated in both `.map()` loops. Also, `seriesLayout[seriesId]` is accessed 4 times per seriesId in each loop (`.center.x`, `.center.y`, `.radius.inner`, `.radius.outer`).

**Suggested fix:** Destructure the layout once per iteration:
```typescript
const layout = seriesLayout[seriesId];
const { center, radius } = layout;
// ...
transform={`translate(${center.x}, ${center.y})`}
```

**Estimated gzip savings:** 8-12 bytes

---

## Finding 6: Repeated `seriesLayout[seriesId]` Access in PiePlot

**File:** `packages/x-charts/src/PieChart/PiePlot.tsx` (lines 67-72 and 94-100)

**Current code (first loop, lines 67-72):**
```typescript
transform={`translate(${seriesLayout[seriesId].center.x}, ${seriesLayout[seriesId].center.y})`}
// ...
innerRadius={seriesLayout[seriesId].radius.inner}
outerRadius={seriesLayout[seriesId].radius.outer}
```

**Current code (second loop, lines 94-100):**
```typescript
transform={`translate(${seriesLayout[seriesId].center.x}, ${seriesLayout[seriesId].center.y})`}
// ...
innerRadius={seriesLayout[seriesId].radius.inner}
outerRadius={seriesLayout[seriesId].radius.outer}
arcLabelRadius={seriesLayout[seriesId].radius.label}
```

**Issue:** `seriesLayout[seriesId]` is repeated 9 times total across both loops. Destructuring saves repeated property access strings.

**Suggested fix:**
```typescript
{seriesOrder.map((seriesId) => {
  const { cornerRadius, paddingAngle, data, highlighted, faded } = series[seriesId];
  const { center, radius } = seriesLayout[seriesId];

  return (
    <g
      key={seriesId}
      className={classes.series}
      transform={`translate(${center.x}, ${center.y})`}
      data-series={seriesId}
    >
      <PieArcPlot
        innerRadius={radius.inner}
        outerRadius={radius.outer}
        // ...
      />
    </g>
  );
})}
```

**Estimated gzip savings:** 15-25 bytes

---

## Finding 7: Inconsistent Auto-Generated ID String Patterns

**Files affected:**
- `packages/x-charts/src/PieChart/seriesConfig/getSeriesWithDefaultValues.ts` (line 10)
- `packages/x-charts/src/PieChart/seriesConfig/seriesProcessor.ts` (line 50)

**Current code (getSeriesWithDefaultValues.ts):**
```typescript
id: seriesData.id ?? `auto-generated-id-${seriesIndex}`,
```

**Current code (seriesProcessor.ts):**
```typescript
const itemId = item.id ?? `auto-generated-pie-id-${seriesId}-${index}`;
```

**Issue:** Two different prefixes (`auto-generated-id-` vs `auto-generated-pie-id-`) for auto-generated IDs. Inconsistent naming patterns hurt gzip compression since the compressor cannot reuse dictionary entries across different prefixes.

**Suggested fix:** Standardize on a shorter, consistent prefix:
```typescript
// getSeriesWithDefaultValues.ts
id: seriesData.id ?? `pie-series-${seriesIndex}`,

// seriesProcessor.ts
const itemId = item.id ?? `pie-item-${seriesId}-${index}`;
```

**Estimated gzip savings:** 4-8 bytes

---

## Finding 8: Verbose Switch Statement with Redundant Default Case

**File:** `packages/x-charts/src/PieChart/seriesConfig/seriesProcessor.ts` (lines 9-23)

**Current code:**
```typescript
const getSortingComparator = (comparator: ChartsPieSorting = 'none') => {
  if (typeof comparator === 'function') {
    return comparator;
  }
  switch (comparator) {
    case 'none':
      return null;
    case 'desc':
      return (a: number, b: number) => b - a;
    case 'asc':
      return (a: number, b: number) => a - b;
    default:
      return null;
  }
};
```

**Issue:** The `switch` with `case 'none'` and `default` both return `null`, making the `default` case redundant. Additionally, the parameter defaults to `'none'`, making the explicit `'none'` case also partially redundant. The entire block can be simplified.

**Suggested fix:**
```typescript
const getSortingComparator = (comparator: ChartsPieSorting = 'none') => {
  if (typeof comparator === 'function') return comparator;
  if (comparator === 'desc') return (a: number, b: number) => b - a;
  if (comparator === 'asc') return (a: number, b: number) => a - b;
  return null;
};
```

**Estimated gzip savings:** 8-12 bytes

---

## Finding 9: Magic Number and String in CSS Ternaries

**File:** `packages/x-charts/src/PieChart/PieArc.tsx` (lines 159-160)

**Current code:**
```typescript
opacity={ownerState.isFaded ? 0.3 : 1}
filter={ownerState.isHighlighted ? 'brightness(120%)' : 'none'}
```

**Issue:** `0.3` can be written as `.3` saving 1 byte in uncompressed. The string `'none'` could be replaced with an empty string `''` which is equivalent for the CSS `filter` property, saving 4 bytes.

**Suggested fix:**
```typescript
opacity={ownerState.isFaded ? .3 : 1}
filter={ownerState.isHighlighted ? 'brightness(120%)' : ''}
```

**Estimated gzip savings:** 4-6 bytes (minifier may already handle `0.3` -> `.3`)

---

## Finding 10: Verbose Null Check Patterns

**Files affected:**
- `packages/x-charts/src/PieChart/seriesConfig/tooltip.ts` (lines 7-9, 13-15)
- `packages/x-charts/src/PieChart/seriesConfig/tooltipPosition.ts` (lines 7-9, 13-15)

**Current code (tooltip.ts):**
```typescript
if (!identifier || identifier.dataIndex === undefined) {
  return null;
}
// ...
if (point == null) {
  return null;
}
```

**Current code (tooltipPosition.ts):**
```typescript
if (!identifier || identifier.dataIndex === undefined) {
  return null;
}
// ...
if (itemSeries == null || layout == null) {
  return null;
}
```

**Issue:** The `=== undefined` check is more verbose than necessary. Also, the pattern `if (x == null)` with block braces is verbose.

**Suggested fix:**
```typescript
// tooltip.ts
if (!identifier || identifier.dataIndex == null) return null;
if (!point) return null;

// tooltipPosition.ts
if (!identifier || identifier.dataIndex == null) return null;
if (!itemSeries || !layout) return null;
```

**Estimated gzip savings:** 6-10 bytes

---

## Finding 11: Redundant Optional Chaining After Null Check

**File:** `packages/x-charts/src/PieChart/FocusedPieArc.tsx` (line 34)

**Current code:**
```typescript
if (focusedItem === null || focusedItem.type !== 'pie' || !pieSeries) {
  return null;
}

const series = pieSeries?.series[focusedItem.seriesId];
```

**Issue:** On line 34, `pieSeries?.series` uses optional chaining, but `pieSeries` is guaranteed to be truthy at this point because the null check on line 31 already returns if `!pieSeries`. The `?.` is unnecessary.

**Suggested fix:**
```typescript
const series = pieSeries.series[focusedItem.seriesId];
```

**Estimated gzip savings:** 1-2 bytes

---

## Finding 12: Repeated `pieSeriesLayout[focusedItem.seriesId]` Access

**File:** `packages/x-charts/src/PieChart/FocusedPieArc.tsx` (lines 36, 46, 53)

**Current code:**
```typescript
const { center, radius } = pieSeriesLayout[focusedItem.seriesId];  // line 36

const { arcLabelRadius, ...arcSizes } = getModifiedArcProperties(
  series,
  pieSeriesLayout[focusedItem.seriesId],  // line 46
  isHighlighted,
  isFaded,
);

// ...
transform={`translate(${pieSeriesLayout[series.id].center.x}, ${pieSeriesLayout[series.id].center.y})`}  // line 53
```

**Issue:** `pieSeriesLayout[focusedItem.seriesId]` is accessed 3 times (lines 36, 46, 53 via `series.id`). Line 36 already destructures `center` and `radius`, yet line 53 re-accesses the full path.

**Suggested fix:**
```typescript
const layout = pieSeriesLayout[focusedItem.seriesId];
const { center, radius } = layout;

const { arcLabelRadius, ...arcSizes } = getModifiedArcProperties(
  series,
  layout,
  isHighlighted,
  isFaded,
);

// ...
transform={`translate(${center.x}, ${center.y})`}
```

**Estimated gzip savings:** 15-20 bytes

---

## Finding 13: Repeated PropTypes `type: PropTypes.oneOf(['pie']).isRequired`

**File:** `packages/x-charts/src/PieChart/PieChart.tsx` (lines 227, 272, 359)

**Current code (appears 3 times):**
```typescript
type: PropTypes.oneOf(['pie']).isRequired,
```

**Issue:** The array `['pie']` is created 3 separate times. While PropTypes are stripped in production builds, if they are included, this is redundant.

**Suggested fix:**
```typescript
const PIE_TYPE_PROP = PropTypes.oneOf(['pie']).isRequired;
// Then use:
type: PIE_TYPE_PROP,
```

**Estimated gzip savings:** 2-4 bytes (only relevant if PropTypes are not stripped)

---

## Finding 14: Duplicate PropTypes Shape for `faded` and `highlighted`

**Files affected:**
- `packages/x-charts/src/PieChart/PieArcPlot.tsx` (lines 166-174, 178-186)
- `packages/x-charts/src/PieChart/PieArcLabelPlot.tsx` (lines 202-210, 214-222)

**Current code (identical block appears 4 times across both files):**
```typescript
PropTypes.shape({
  additionalRadius: PropTypes.number,
  arcLabelRadius: PropTypes.number,
  color: PropTypes.string,
  cornerRadius: PropTypes.number,
  innerRadius: PropTypes.number,
  outerRadius: PropTypes.number,
  paddingAngle: PropTypes.number,
})
```

**Issue:** The exact same PropTypes shape definition for `faded` and `highlighted` appears 4 times (2 per file, 2 files). Extraction to a shared variable reduces repetition.

**Suggested fix:**
```typescript
const arcOverrideShape = PropTypes.shape({
  additionalRadius: PropTypes.number,
  arcLabelRadius: PropTypes.number,
  color: PropTypes.string,
  cornerRadius: PropTypes.number,
  innerRadius: PropTypes.number,
  outerRadius: PropTypes.number,
  paddingAngle: PropTypes.number,
});

// Then:
faded: arcOverrideShape,
highlighted: arcOverrideShape,
```

**Estimated gzip savings:** 10-18 bytes (only relevant if PropTypes are not stripped)

---

## Finding 15: Duplicate PropTypes `data` Shape

**Files affected:**
- `packages/x-charts/src/PieChart/PieArcPlot.tsx` (lines 145-161)
- `packages/x-charts/src/PieChart/PieArcLabelPlot.tsx` (lines 181-197)

**Current code (identical in both files):**
```typescript
data: PropTypes.arrayOf(
  PropTypes.shape({
    color: PropTypes.string.isRequired,
    endAngle: PropTypes.number.isRequired,
    formattedValue: PropTypes.string.isRequired,
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    index: PropTypes.number.isRequired,
    label: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
    labelMarkType: PropTypes.oneOfType([
      PropTypes.oneOf(['circle', 'line', 'square']),
      PropTypes.func,
    ]),
    padAngle: PropTypes.number.isRequired,
    startAngle: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
  }),
).isRequired,
```

**Issue:** Exact same PropTypes `data` shape duplicated across two files. These are auto-generated, so the fix would need to be at the generator level or a shared constant.

**Suggested fix:** Extract to shared constant (if PropTypes are not stripped):
```typescript
// pieSharedPropTypes.ts
export const pieDataPropType = PropTypes.arrayOf(
  PropTypes.shape({ /* ... */ })
).isRequired;
```

**Estimated gzip savings:** 12-20 bytes (only relevant if PropTypes are not stripped)

---

## Finding 16: `generateUtilityClass` and `generateUtilityClasses` Both Imported

**Files affected:**
- `packages/x-charts/src/PieChart/pieClasses.ts` (lines 1-3)
- `packages/x-charts/src/PieChart/PieArc.tsx` (lines 6-8)
- `packages/x-charts/src/PieChart/PieArcLabel.tsx` (lines 4-7)

**Current code (PieArc.tsx):**
```typescript
import composeClasses from '@mui/utils/composeClasses';
import generateUtilityClass from '@mui/utils/generateUtilityClass';
import generateUtilityClasses from '@mui/utils/generateUtilityClasses';
```

**Issue:** All three files import both `generateUtilityClass` (for single class) and `generateUtilityClasses` (for multiple classes). Both are needed but the import paths are verbose. This is a systemic pattern across MUI.

**Suggested fix:** This is a minor issue. A barrel re-export could simplify:
```typescript
import { composeClasses, generateUtilityClass, generateUtilityClasses } from '@mui/utils';
```

**Estimated gzip savings:** 3-5 bytes per file (9-15 bytes total, if tree-shaking supports it)

---

## Finding 17: Unused Destructured `arcLabelRadius` in FocusedPieArc

**File:** `packages/x-charts/src/PieChart/FocusedPieArc.tsx` (line 44)

**Current code:**
```typescript
const { arcLabelRadius, ...arcSizes } = getModifiedArcProperties(
  series,
  pieSeriesLayout[focusedItem.seriesId],
  isHighlighted,
  isFaded,
);
```

**Issue:** `arcLabelRadius` is destructured but never used in the rest of the component. It is only used to exclude it from `arcSizes` via rest spread. This is intentional but adds a named variable that minifiers must still track.

**Suggested fix:** Use underscore convention for unused destructured variables:
```typescript
const { arcLabelRadius: _, ...arcSizes } = getModifiedArcProperties(
  series,
  pieSeriesLayout[focusedItem.seriesId],
  isHighlighted,
  isFaded,
);
```

**Estimated gzip savings:** 8-10 bytes (shorter variable name after minification)

---

## Finding 18: `hideLegend ?? false` Redundant Default

**File:** `packages/x-charts/src/PieChart/PieChart.tsx` (line 156)

**Current code:**
```typescript
hideLegend={hideLegend ?? false}
```

**Issue:** `hideLegend` is an optional boolean prop. `undefined ?? false` equals `false`, but `undefined` is already falsy. The component receiving this prop likely treats `undefined` the same as `false`.

**Suggested fix:**
```typescript
hideLegend={!!hideLegend}
```
Or simply:
```typescript
hideLegend={hideLegend}
```

**Estimated gzip savings:** 3-5 bytes

---

## Finding 19: Duplicate `direction ?? 'vertical'` Default

**File:** `packages/x-charts/src/PieChart/PieChart.tsx` (lines 154 and 161)

**Current code:**
```typescript
legendDirection={slotProps?.legend?.direction ?? 'vertical'}  // line 154
// ...
direction={slotProps?.legend?.direction ?? 'vertical'}  // line 161
```

**Issue:** The same optional chain with the same default value `'vertical'` is repeated twice.

**Suggested fix:**
```typescript
const legendDirection = slotProps?.legend?.direction ?? 'vertical';
// Then use `legendDirection` in both places
```

**Estimated gzip savings:** 8-12 bytes

---

## Finding 20: `seriesData === undefined` Verbose Check

**File:** `packages/x-charts/src/PieChart/PiePlot.tsx` (line 52)

**Current code:**
```typescript
if (seriesData === undefined) {
  return null;
}
```

**Issue:** Strict equality check against `undefined` is verbose. Since `seriesData` is the return value of a hook that returns either data or `undefined`, a falsy check is equivalent.

**Suggested fix:**
```typescript
if (!seriesData) {
  return null;
}
```

**Estimated gzip savings:** 4-6 bytes

---

## Summary

| # | Finding | File(s) | Est. Gzip Savings |
|---|---------|---------|-------------------|
| 1 | Duplicate attributesOverride pattern | useTransformData.ts, getModifiedArcProperties.ts | 12-15 bytes |
| 2 | Verbose cursor ternary `'unset'` | PieArc.tsx | 4-6 bytes |
| 3 | Verbose `\|\| undefined` data attributes | PieArc.tsx | 12-14 bytes |
| 4 | Duplicate `?? false` coercion | PieArcPlot.tsx, PieArcLabelPlot.tsx | 6-8 bytes |
| 5 | Duplicate transform template | PiePlot.tsx | 8-12 bytes |
| 6 | Repeated `seriesLayout[seriesId]` access | PiePlot.tsx | 15-25 bytes |
| 7 | Inconsistent auto-generated ID prefixes | getSeriesWithDefaultValues.ts, seriesProcessor.ts | 4-8 bytes |
| 8 | Verbose switch with redundant default | seriesProcessor.ts | 8-12 bytes |
| 9 | Magic number/string in CSS ternaries | PieArc.tsx | 4-6 bytes |
| 10 | Verbose null check patterns | tooltip.ts, tooltipPosition.ts | 6-10 bytes |
| 11 | Redundant optional chaining after guard | FocusedPieArc.tsx | 1-2 bytes |
| 12 | Repeated layout access in FocusedPieArc | FocusedPieArc.tsx | 15-20 bytes |
| 13 | Repeated PropTypes `['pie']` array | PieChart.tsx | 2-4 bytes |
| 14 | Duplicate PropTypes shape for faded/highlighted | PieArcPlot.tsx, PieArcLabelPlot.tsx | 10-18 bytes |
| 15 | Duplicate PropTypes data shape | PieArcPlot.tsx, PieArcLabelPlot.tsx | 12-20 bytes |
| 16 | Verbose utility class imports | pieClasses.ts, PieArc.tsx, PieArcLabel.tsx | 9-15 bytes |
| 17 | Unused destructured arcLabelRadius | FocusedPieArc.tsx | 8-10 bytes |
| 18 | Redundant `?? false` for hideLegend | PieChart.tsx | 3-5 bytes |
| 19 | Duplicate `direction ?? 'vertical'` | PieChart.tsx | 8-12 bytes |
| 20 | Verbose `=== undefined` check | PiePlot.tsx | 4-6 bytes |

**Total estimated gzip savings: ~142-228 bytes**

Note: PropTypes findings (13, 14, 15) only apply if PropTypes are included in the production bundle. Many projects strip PropTypes in production, in which case those savings would not apply. Without PropTypes findings, the estimate is ~118-186 bytes.
