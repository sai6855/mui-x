# RadarChart & RadarDataProvider -- Gzip Bundle Size Optimization Findings

Directories analyzed:
- `packages/x-charts/src/RadarChart/`
- `packages/x-charts/src/RadarChart/RadarDataProvider/` (nested within RadarChart)

---

## Finding 1: Repeated Theme Access Pattern Across Multiple Files

**Type:** Verbose pattern / shared constant opportunity

**Files affected:**
- `packages/x-charts/src/RadarChart/RadarAxis/RadarAxis.tsx` (lines 51, 59)
- `packages/x-charts/src/RadarChart/RadarAxisHighlight/RadarAxisHighlight.tsx` (line 62)
- `packages/x-charts/src/RadarChart/FocusedRadarMark.tsx` (line 21)
- `packages/x-charts/src/RadarChart/RadarGrid/RadarGrid.tsx` (lines 19, 47, 68)
- `packages/x-charts/src/RadarChart/RadarMetricLabels/RadarMetricLabels.tsx` (line 20)

**Current code (RadarAxis.tsx lines 51, 59):**
```tsx
stroke={(theme.vars ?? theme).palette.text.primary}
...
fill={(theme.vars ?? theme).palette.text.primary}
```

**RadarGrid.tsx lines 19, 47, 68:**
```tsx
stripeColor = (index) =>
  index % 2 === 1 ? (theme.vars || theme).palette.text.secondary : 'none',
...
strokeColor={(theme.vars || theme).palette.text.primary}
...
strokeColor={(theme.vars || theme).palette.text.primary}
```

**RadarAxisHighlight.tsx line 62:**
```tsx
stroke={(theme.vars || theme).palette.text.primary}
```

**RadarMetricLabels.tsx line 20:**
```tsx
fill={(theme.vars || theme).palette.text.primary}
```

**FocusedRadarMark.tsx line 21:**
```tsx
stroke={(theme.vars ?? theme).palette.text.primary}
```

**Suggested fix:** In each component, extract to a local variable once:
```tsx
const palette = (theme.vars ?? theme).palette;
// then use palette.text.primary, palette.text.secondary
```

**Estimated gzip savings:** ~15-20 bytes per occurrence, 8+ occurrences across files = **120-160 bytes**

---

## Finding 2: Inconsistent Theme Null-Coalescing Operators

**Type:** String repetition hurting gzip / inconsistent naming

**Files affected:**
- `packages/x-charts/src/RadarChart/RadarAxis/RadarAxis.tsx` (lines 51, 59) -- uses `??`
- `packages/x-charts/src/RadarChart/RadarAxisHighlight/RadarAxisHighlight.tsx` (line 62) -- uses `||`
- `packages/x-charts/src/RadarChart/FocusedRadarMark.tsx` (line 21) -- uses `??`
- `packages/x-charts/src/RadarChart/RadarGrid/RadarGrid.tsx` (lines 19, 47, 68) -- uses `||`
- `packages/x-charts/src/RadarChart/RadarMetricLabels/RadarMetricLabels.tsx` (line 20) -- uses `||`

**Current code:**
```tsx
// Some files use ??
(theme.vars ?? theme).palette.text.primary
// Some files use ||
(theme.vars || theme).palette.text.primary
```

**Suggested fix:** Standardize to one operator (`??`) across all files. Consistent strings compress better under gzip.

**Estimated gzip savings:** ~10-15 bytes (gzip deduplication improvement from consistent strings)

---

## Finding 3: Redundant Imports in Barrel File

**File:** `packages/x-charts/src/RadarChart/index.ts` (lines 1-2)

**Current code:**
```typescript
import { RadarChart } from './RadarChart';
import { RadarDataProvider } from './RadarDataProvider';

export { RadarChart } from './RadarChart';
// ...
export { RadarDataProvider } from './RadarDataProvider';
```

**Issue:** Lines 1-2 import `RadarChart` and `RadarDataProvider` solely for use in the deprecated alias assignments on lines 9 and 16. However, the re-exports on lines 4 and 11 are separate `export { X } from` statements that do not depend on those imports. The imports on lines 1-2 exist only to support the deprecated aliases (`Unstable_RadarChart` and `Unstable_RadarDataProvider`). This is correct but could be restructured.

**Suggested fix:** Use `export { RadarChart as Unstable_RadarChart } from './RadarChart'` instead of importing then assigning:
```typescript
export { RadarChart } from './RadarChart';
/** @deprecated ... */
export { RadarChart as Unstable_RadarChart } from './RadarChart';

export { RadarDataProvider } from './RadarDataProvider';
/** @deprecated ... */
export { RadarDataProvider as Unstable_RadarDataProvider } from './RadarDataProvider';
```

This removes the two `import` statements and two `const` assignments entirely.

**Estimated gzip savings:** ~35-40 bytes

---

## Finding 4: Duplicate Array Generation Pattern in Grid Components

**Type:** Duplicate code

**Files affected:**
- `packages/x-charts/src/RadarChart/RadarGrid/CircularRadarGrid.tsx` (lines 10-13)
- `packages/x-charts/src/RadarChart/RadarGrid/SharpRadarGrid.tsx` (line 10)
- `packages/x-charts/src/RadarChart/RadarGrid/CircularRadarStripes.tsx` (lines 24-27)
- `packages/x-charts/src/RadarChart/RadarGrid/SharpRadarStripes.tsx` (line 35)

**Current code (CircularRadarGrid.tsx lines 10-13):**
```typescript
const divisionRadius = Array.from(
  { length: divisions },
  (_, index) => (radius * (index + 1)) / divisions,
);
```

**SharpRadarGrid.tsx line 10:**
```typescript
const divisionRatio = Array.from({ length: divisions }, (_, index) => (index + 1) / divisions);
```

**SharpRadarStripes.tsx line 35:**
```typescript
const divisionRatio = Array.from({ length: divisions }, (_, index) => (index + 1) / divisions);
```

**CircularRadarStripes.tsx lines 24-27:**
```typescript
const divisionRadius = Array.from(
  { length: divisions },
  (_, index) => (radius * (index + 1)) / divisions,
);
```

**Suggested fix:** Extract shared helper:
```typescript
// shared utility
export const getDivisionRatios = (divisions: number) =>
  Array.from({ length: divisions }, (_, i) => (i + 1) / divisions);
```

Then `CircularRadarGrid` and `CircularRadarStripes` can multiply by radius: `getDivisionRatios(divisions).map(r => r * radius)`.

**Estimated gzip savings:** ~40-50 bytes

---

## Finding 5: Duplicate Radial Line Rendering in Grid Components

**Type:** Duplicate code

**Files affected:**
- `packages/x-charts/src/RadarChart/RadarGrid/CircularRadarGrid.tsx` (lines 17-27)
- `packages/x-charts/src/RadarChart/RadarGrid/SharpRadarGrid.tsx` (lines 14-24)

**Current code (CircularRadarGrid.tsx lines 17-27):**
```tsx
{corners.map(({ x, y }, i) => (
  <path
    key={i}
    d={`M ${center.x} ${center.y} L ${x} ${y}`}
    stroke={strokeColor}
    strokeWidth={1}
    strokeOpacity={0.3}
    fill="none"
    className={classes?.radial}
  />
))}
```

**SharpRadarGrid.tsx lines 14-24:**
```tsx
{corners.map(({ x, y }, i) => (
  <path
    key={i}
    d={`M ${center.x} ${center.y} L ${x} ${y}`}
    stroke={strokeColor}
    strokeWidth={1}
    strokeOpacity={0.3}
    fill="none"
    className={classes?.radial}
  />
))}
```

**Issue:** These two blocks are byte-for-byte identical.

**Suggested fix:** Extract into a shared component or function:
```tsx
function RadialLines({ corners, center, strokeColor, classes }) {
  return corners.map(({ x, y }, i) => (
    <path
      key={i}
      d={`M ${center.x} ${center.y} L ${x} ${y}`}
      stroke={strokeColor}
      strokeWidth={1}
      strokeOpacity={0.3}
      fill="none"
      className={classes?.radial}
    />
  ));
}
```

**Estimated gzip savings:** ~60-80 bytes

---

## Finding 6: Duplicate Highlight State Computation in Series Components

**Type:** Duplicate code

**Files affected:**
- `packages/x-charts/src/RadarChart/RadarSeriesPlot/RadarSeriesArea.tsx` (lines 25-27)
- `packages/x-charts/src/RadarChart/RadarSeriesPlot/RadarSeriesMarks.tsx` (lines 22-24)

**Current code (RadarSeriesArea.tsx lines 25-27):**
```typescript
const isItemHighlighted = isHighlighted({ seriesId });
const isItemFaded = !isItemHighlighted && isFaded({ seriesId });
```

**RadarSeriesMarks.tsx lines 22-24:**
```typescript
const isItemHighlighted = isHighlighted({ seriesId });
const isItemFaded = !isItemHighlighted && isFaded({ seriesId });
```

**Suggested fix:** Extract to a shared utility:
```typescript
export function getHighlightState(seriesId, isHighlighted, isFaded) {
  const highlighted = isHighlighted({ seriesId });
  return { isHighlighted: highlighted, isFaded: !highlighted && isFaded({ seriesId }) };
}
```

**Estimated gzip savings:** ~35-40 bytes

---

## Finding 7: Verbose Utility Class Patterns

**Type:** Verbose pattern

**Files affected:**
- `packages/x-charts/src/RadarChart/RadarAxis/radarAxisClasses.ts` (lines 25-32)
- `packages/x-charts/src/RadarChart/RadarGrid/radarGridClasses.ts` (lines 25-32)
- `packages/x-charts/src/RadarChart/RadarSeriesPlot/radarSeriesPlotClasses.ts` (lines 32-41)

**Current code (radarAxisClasses.ts lines 25-32):**
```typescript
export const useUtilityClasses = (classes?: Partial<RadarAxisClasses>) => {
  const slots = {
    root: ['root'],
    line: ['line'],
    label: ['label'],
  };

  return composeClasses(slots, getRadarAxisUtilityClass, classes);
};
```

**Suggested fix:** Inline the slots object:
```typescript
export const useUtilityClasses = (classes?: Partial<RadarAxisClasses>) =>
  composeClasses({ root: ['root'], line: ['line'], label: ['label'] }, getRadarAxisUtilityClass, classes);
```

**Estimated gzip savings:** ~8-12 bytes per file x 3 files = **24-36 bytes**

---

## Finding 8: Repeated String Literal `'radar'` Throughout Codebase

**Type:** Shared constant opportunity

**Files affected:**
- `packages/x-charts/src/RadarChart/RadarSeriesPlot/RadarSeriesPlot.tsx` (lines 45, 68)
- `packages/x-charts/src/RadarChart/RadarSeriesPlot/RadarSeriesArea.tsx` (line 73)
- `packages/x-charts/src/RadarChart/RadarSeriesPlot/RadarSeriesMarks.tsx` (line 70)
- `packages/x-charts/src/RadarChart/RadarSeriesPlot/useInteractionAllItemProps.ts` (line 23)
- `packages/x-charts/src/RadarChart/RadarDataProvider/RadarDataProvider.tsx` (line 95)
- `packages/x-charts/src/RadarChart/seriesConfig/seriesProcessor.ts` (line 15)
- `packages/x-charts/src/RadarChart/seriesConfig/legend.ts` (line 15)
- `packages/x-charts/src/RadarChart/seriesConfig/tooltip.ts` (line 39)
- `packages/x-charts/src/RadarChart/FocusedRadarMark.tsx` (line 12)

**Current code (repeated in many files):**
```typescript
type: 'radar',
```

**Suggested fix:** Define a shared constant:
```typescript
export const RADAR_SERIES_TYPE = 'radar' as const;
```

**Estimated gzip savings:** ~25-35 bytes (gzip already compresses short repeated strings, but the surrounding code patterns vary enough to limit deduplication)

---

## Finding 9: Unnecessary Intermediate Variable in useRadarAxisHighlight

**Type:** Verbose pattern

**File:** `packages/x-charts/src/RadarChart/RadarAxisHighlight/useRadarAxisHighlight.ts` (lines 76, 109-117)

**Current code (line 76):**
```typescript
const highlightedIndex = rotationAxisIndex;
```

**Issue:** `highlightedIndex` is simply an alias for `rotationAxisIndex` with no transformation.

**Suggested fix:** Use `rotationAxisIndex` directly or rename the store selector result:
```typescript
const highlightedIndex = store.use(selectorChartsInteractionRotationAxisIndex);
// remove: const highlightedIndex = rotationAxisIndex;
```

Also, lines 109-117 create an intermediate `returnedValue` variable that could be returned directly:
```typescript
// Current (lines 109-117)
const returnedValue: Point = {
  x,
  y,
  r,
  angle,
  value,
};
return returnedValue;

// Suggested
return { x, y, r, angle, value };
```

**Estimated gzip savings:** ~15-20 bytes

---

## Finding 10: Redundant `as const` Type Assertion

**Type:** Unnecessary type assertion

**File:** `packages/x-charts/src/RadarChart/RadarDataProvider/RadarDataProvider.tsx` (lines 84, 95)

**Current code (line 84):**
```typescript
scaleType: 'linear' as const,
```

**Line 95:**
```typescript
type: 'radar' as const,
```

**Issue:** In a context where the object is immediately used and not mutated, `as const` may be unnecessary if the surrounding type already expects the literal type.

**Suggested fix:** Verify if the TypeScript compiler narrows the type adequately without `as const`. If so, remove:
```typescript
scaleType: 'linear',
```

**Estimated gzip savings:** ~5-10 bytes (TypeScript-only, stripped at compile time -- no runtime savings. Mentioned for completeness since `as const` can sometimes prevent tree-shaking optimizations.)

---

## Finding 11: Redundant `unused` Destructured Variable in RadarSeriesMarks

**Type:** Dead code / unnecessary variable

**File:** `packages/x-charts/src/RadarChart/RadarSeriesPlot/RadarSeriesMarks.tsx` (line 41)

**Current code:**
```typescript
const { seriesId, onItemClick, ...other } = props;
const seriesCoordinates = useRadarSeriesData(props.seriesId);
```

**Issue:** `seriesId` is destructured from `props` but then `props.seriesId` is used directly on the next line, making the destructured variable unused.

**Suggested fix:**
```typescript
const { onItemClick, ...other } = props;
const seriesCoordinates = useRadarSeriesData(props.seriesId);
```

Or use the destructured variable:
```typescript
const { seriesId, onItemClick, ...other } = props;
const seriesCoordinates = useRadarSeriesData(seriesId);
```

**Estimated gzip savings:** ~5-8 bytes

---

## Finding 12: Duplicate SVG Attribute Patterns in Grid Components

**Type:** Duplicate code / verbose patterns

**Files affected:**
- `packages/x-charts/src/RadarChart/RadarGrid/CircularRadarGrid.tsx` (lines 21-26, 34-38)
- `packages/x-charts/src/RadarChart/RadarGrid/SharpRadarGrid.tsx` (lines 19-24)

**Current code (shared across both files):**
```tsx
stroke={strokeColor}
strokeWidth={1}
strokeOpacity={0.3}
fill="none"
```

This exact 4-attribute block appears 3 times across both files.

**Suggested fix:** Extract shared SVG stroke attributes:
```typescript
const gridLineAttrs = (strokeColor: string) => ({
  stroke: strokeColor,
  strokeWidth: 1,
  strokeOpacity: 0.3,
  fill: 'none',
});
```

**Estimated gzip savings:** ~25-30 bytes

---

## Finding 13: Redundant Spread in useRadarSeriesData

**Type:** Unnecessary object spread

**File:** `packages/x-charts/src/RadarChart/RadarSeriesPlot/useRadarSeriesData.ts` (lines 34-36)

**Current code:**
```typescript
return {
  ...series,
  seriesId: series.id,
  isSeriesHighlighted,
  isSeriesFaded,
  points: ...
};
```

**Issue:** `...series` spreads all properties of the series object, then `seriesId: series.id` adds a duplicate reference to the id. Since the spread already includes `id`, consumers could use `.id` instead of `.seriesId`. Adding `seriesId` is redundant if callers are updated.

**Estimated gzip savings:** ~10-15 bytes (if callers migrate to `.id`)

---

## Finding 14: Typo in Warning String

**Type:** Dead code quality (minor)

**File:** `packages/x-charts/src/RadarChart/RadarAxis/useRadarAxis.ts` (line 52)

**Current code:**
```typescript
`MUI X Charts: You radar axis try displaying values for the metric "${metric}" which does nto exist.`,
`either add this metric to your radar, or pick one from the existing metrics: ${existingMetrics.join(', ')}`,
```

**Issue:** Typo "nto" should be "not". Also "either" should be capitalized since it starts a new array element displayed as a new sentence.

**Suggested fix:**
```typescript
`MUI X Charts: Your radar axis is trying to display values for the metric "${metric}" which does not exist.`,
`Either add this metric to your radar, or pick one from the existing metrics: ${existingMetrics.join(', ')}`,
```

**Estimated gzip savings:** 0 bytes (correctness fix, not size)

---

## Finding 15: Verbose `stripeColor?.() ?? 'none'` Pattern

**Type:** Verbose pattern

**Files affected:**
- `packages/x-charts/src/RadarChart/RadarGrid/CircularRadarStripes.tsx` (line 37)
- `packages/x-charts/src/RadarChart/RadarGrid/SharpRadarStripes.tsx` (line 46)

**Current code:**
```tsx
fill={stripeColor?.(index) ?? 'none'}
```

This appears twice in two different files.

**Suggested fix:** Given stripeColor is always provided by the parent (RadarGrid checks `stripeColor &&` before rendering these components), the `?.` and `?? 'none'` guard is redundant.

```tsx
fill={stripeColor(index)}
```

**Estimated gzip savings:** ~10-15 bytes (2 occurrences x ~6 bytes each)

---

## Finding 16: `useRadarSeriesData` Called With Unused Highlight Data

**Type:** Unnecessary computation

**File:** `packages/x-charts/src/RadarChart/RadarSeriesPlot/useRadarSeriesData.ts` (lines 22, 30-31)

**Current code:**
```typescript
const { isFaded: isItemFaded, isHighlighted: isItemHighlighted } = useItemHighlightedGetter();
// ...
const isSeriesHighlighted = isItemHighlighted({ seriesId });
const isSeriesFaded = !isSeriesHighlighted && isItemFaded({ seriesId });
```

**Issue:** This hook computes highlight state for every series and every data point, but `RadarSeriesArea` and `RadarSeriesMarks` also call `useItemHighlightedGetter()` independently and compute their own highlight state via `getPathProps` and `getCircleProps`. The `isSeriesHighlighted`, `isSeriesFaded`, `isItemHighlighted`, and `isItemFaded` fields on points from `useRadarSeriesData` appear to be unused by the consuming components that use `getPathProps`/`getCircleProps` with their own highlight getter.

**Suggested fix:** Remove the highlight computation from `useRadarSeriesData` since callers already compute it independently. Remove lines 4, 22, 30-31 and the per-point highlight fields (lines 40-41, 48-49).

**Estimated gzip savings:** ~60-80 bytes

---

## Finding 17: `FocusedRadarMark` Magic Numbers

**Type:** Shared constant opportunity

**File:** `packages/x-charts/src/RadarChart/FocusedRadarMark.tsx` (lines 23-28)

**Current code:**
```tsx
x={point.x - 6}
y={point.y - 6}
width={2 * 6}
height={2 * 6}
rx={3}
ry={3}
```

**Suggested fix:** Extract to a named constant:
```tsx
const MARK_SIZE = 6;
const MARK_RADIUS = 3;
// ...
x={point.x - MARK_SIZE}
y={point.y - MARK_SIZE}
width={2 * MARK_SIZE}
height={2 * MARK_SIZE}
rx={MARK_RADIUS}
ry={MARK_RADIUS}
```

**Estimated gzip savings:** ~5-8 bytes (minor -- improves readability more than size)

---

## Finding 18: `RadarSeriesPlot` Wraps Functionality Already in RadarSeriesArea and RadarSeriesMarks

**Type:** Duplicate code

**File:** `packages/x-charts/src/RadarChart/RadarSeriesPlot/RadarSeriesPlot.tsx`

**Issue:** `RadarSeriesPlot` (lines 11-79) essentially duplicates the rendering logic found in `RadarSeriesArea` and `RadarSeriesMarks`. It calls the same hooks (`useRadarSeriesData`, `useInteractionAllItemProps`, `useItemHighlightedGetter`, `useUtilityClasses`) and uses the same `getPathProps`/`getCircleProps` helpers. In `RadarChart.tsx`, only `RadarSeriesArea` and `RadarSeriesMarks` are used -- `RadarSeriesPlot` is not used there.

If `RadarSeriesPlot` is only provided for public API convenience, this is ~80 lines of near-duplicate code.

**Suggested fix:** Have `RadarSeriesPlot` compose `RadarSeriesArea` and `RadarSeriesMarks` instead of duplicating their logic:
```tsx
function RadarSeriesPlot(props) {
  const { onAreaClick, onMarkClick, ...common } = props;
  return (
    <g>
      <RadarSeriesArea {...common} onItemClick={onAreaClick} />
      <RadarSeriesMarks {...common} onItemClick={onMarkClick} />
    </g>
  );
}
```

**Estimated gzip savings:** ~200-250 bytes (substantial -- removes ~60 lines of duplicated logic)

---

## Summary Table

| # | Finding | Files | Type | Est. Savings (gzip bytes) |
|---|---------|-------|------|---------------------------|
| 1 | Repeated theme access pattern | 5 files | Verbose pattern | 120-160 |
| 2 | Inconsistent `??` vs `||` operators | 5 files | Inconsistent naming | 10-15 |
| 3 | Redundant barrel imports | index.ts | Dead code | 35-40 |
| 4 | Duplicate array generation | 4 grid files | Duplicate code | 40-50 |
| 5 | Duplicate radial line rendering | 2 grid files | Duplicate code | 60-80 |
| 6 | Duplicate highlight state logic | 2 series files | Duplicate code | 35-40 |
| 7 | Verbose utility class patterns | 3 class files | Verbose pattern | 24-36 |
| 8 | Repeated `'radar'` string literal | 9+ files | Shared constant | 25-35 |
| 9 | Unnecessary intermediate variable | useRadarAxisHighlight.ts | Verbose pattern | 15-20 |
| 10 | Redundant `as const` assertions | RadarDataProvider.tsx | Type assertion | 5-10 |
| 11 | Unused destructured variable | RadarSeriesMarks.tsx | Dead code | 5-8 |
| 12 | Duplicate SVG attribute blocks | 2 grid files | Duplicate code | 25-30 |
| 13 | Redundant `seriesId` spread | useRadarSeriesData.ts | Unnecessary spread | 10-15 |
| 14 | Typo in warning string | useRadarAxis.ts | Quality fix | 0 |
| 15 | Redundant optional chaining | 2 stripe files | Verbose pattern | 10-15 |
| 16 | Unused highlight data in hook | useRadarSeriesData.ts | Dead code | 60-80 |
| 17 | Magic numbers in FocusedRadarMark | FocusedRadarMark.tsx | Shared constant | 5-8 |
| 18 | RadarSeriesPlot duplicates Area+Marks | RadarSeriesPlot.tsx | Duplicate code | 200-250 |
| **Total** | | | | **~684-892** |
