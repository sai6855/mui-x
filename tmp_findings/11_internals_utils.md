# Bundle Size Optimization Findings: `packages/x-charts/src/internals/` (Non-Plugin Files)

Scope: All `.ts` and `.tsx` source files in `packages/x-charts/src/internals/` and its non-plugin subdirectories (`animation/`, `components/`, `material/`, `scales/`, `store/`). Test files excluded.

---

## Finding 1: Duplicate Degree-to-Radian Conversion Functions

**Files:**
- `packages/x-charts/src/internals/degToRad.ts` (line 2)
- `packages/x-charts/src/internals/angleConversion.ts` (lines 1-6)

**Current code in `degToRad.ts`:**
```typescript
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
```

**Current code in `angleConversion.ts`:**
```typescript
export const deg2rad = (value?: number, defaultRad?: number) => {
  if (value === undefined) {
    return defaultRad!;
  }
  return (Math.PI * value) / 180;
};
```

**Issue:** Two separate files export two separate functions (`degToRad` and `deg2rad`) that both convert degrees to radians. Both are imported across the codebase:
- `degToRad` is imported in `ellipsize.ts` and `RadarChart/RadarAxis/useRadarAxis.ts`
- `deg2rad` is imported in `geometry.ts`, `Gauge/utils.ts`, `Gauge/GaugeProvider.tsx`, `PieChart/seriesConfig/seriesProcessor.ts`, `PieChart/dataTransform/getModifiedArcProperties.ts`, and `plugins/featurePlugins/useChartPolarAxis/computeAxisValue.ts`

**Suggested fix:** Consolidate into a single function. The `deg2rad` variant with optional parameters can remain the single implementation, and `degToRad` callers can be migrated:
```typescript
// angleConversion.ts (keep this)
export const deg2rad = (value?: number, defaultRad?: number) => {
  if (value === undefined) {
    return defaultRad!;
  }
  return (Math.PI * value) / 180;
};
```
Delete `degToRad.ts` and update imports in `ellipsize.ts` and `RadarChart/RadarAxis/useRadarAxis.ts` to use `deg2rad`.

**Estimated gzip savings:** ~40-50 bytes (entire function definition plus import overhead removed)

---

## Finding 2: Duplicate `Intl.Segmenter` Initialization in `getGraphemeCount.ts` and `sliceUntil.ts`

**Files:**
- `packages/x-charts/src/internals/getGraphemeCount.ts` (lines 1-4)
- `packages/x-charts/src/internals/sliceUntil.ts` (lines 1-4)

**Current code in `getGraphemeCount.ts`:**
```typescript
const segmenter =
  typeof window !== 'undefined' && 'Intl' in window && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
```

**Current code in `sliceUntil.ts`:**
```typescript
const segmenter =
  typeof window !== 'undefined' && 'Intl' in window && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
```

**Issue:** Identical `Intl.Segmenter` instantiation code is duplicated across two files. This creates two separate `Intl.Segmenter` instances at module scope when only one is needed, and the initialization guard code (`typeof window !== 'undefined' && 'Intl' in window && 'Segmenter' in Intl`) is a long string that appears twice.

**Suggested fix:** Extract the segmenter into a shared module:
```typescript
// segmenter.ts
export const segmenter =
  typeof window !== 'undefined' && 'Intl' in window && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
```
Then both `getGraphemeCount.ts` and `sliceUntil.ts` import from it.

**Estimated gzip savings:** ~55-65 bytes (the entire initialization string including the ternary and `Intl.Segmenter` constructor is ~140 raw bytes; gzip handles repetition within a window, but across separate files the savings are real)

---

## Finding 3: Repeated SVG Namespace String in `domUtils.ts`

**File:** `packages/x-charts/src/internals/domUtils.ts`
**Lines:** 110, 181, 236

**Current code:**
```typescript
// Line 110
const measurementElem = document.createElementNS('http://www.w3.org/2000/svg', 'text');

// Line 181
const measurementElem = document.createElementNS('http://www.w3.org/2000/svg', 'text');

// Line 236
measurementContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
```

**Issue:** The SVG namespace URI `'http://www.w3.org/2000/svg'` (26 characters) is written out 3 times.

**Suggested fix:**
```typescript
const SVG_NS = 'http://www.w3.org/2000/svg';

// Then:
const measurementElem = document.createElementNS(SVG_NS, 'text');
measurementContainer = document.createElementNS(SVG_NS, 'svg');
```

**Estimated gzip savings:** ~30-40 bytes (two eliminated repetitions of a 26-char string minus the constant declaration)

---

## Finding 4: Repeated Style Assignment Pattern in `domUtils.ts`

**File:** `packages/x-charts/src/internals/domUtils.ts`
**Lines:** 239-247

**Current code:**
```typescript
measurementContainer.style.position = 'absolute';
measurementContainer.style.top = '-20000px';
measurementContainer.style.left = '0';
measurementContainer.style.padding = '0';
measurementContainer.style.margin = '0';
measurementContainer.style.border = 'none';
measurementContainer.style.pointerEvents = 'none';
measurementContainer.style.visibility = 'hidden';
measurementContainer.style.contain = 'strict';
```

**Issue:** `measurementContainer.style.` is repeated 9 times (25 characters each). This is 225 bytes of repetitive accessor path.

**Suggested fix:**
```typescript
Object.assign(measurementContainer.style, {
  position: 'absolute',
  top: '-20000px',
  left: '0',
  padding: '0',
  margin: '0',
  border: 'none',
  pointerEvents: 'none',
  visibility: 'hidden',
  contain: 'strict',
});
```

**Estimated gzip savings:** ~50-65 bytes (8 repetitions of `measurementContainer.style.` eliminated, offset by `Object.assign(` overhead)

---

## Finding 5: `.map()` Used for Side Effects Instead of `.forEach()` in `domUtils.ts`

**File:** `packages/x-charts/src/internals/domUtils.ts`
**Lines:** 114-118 and 173-177

**Current code (line 114):**
```typescript
Object.keys(style as Record<string, any>).map((styleKey) => {
  (measurementElem!.style as Record<string, any>)[camelCaseToDashCase(styleKey)] =
    convertPixelValue(styleKey, (style as Record<string, any>)[styleKey]);
  return styleKey;
});
```

**Current code (line 173):**
```typescript
Object.keys(measurementSpanStyle).map((styleKey) => {
  (measurementContainer!.style as Record<string, any>)[camelCaseToDashCase(styleKey)] =
    convertPixelValue(styleKey, measurementSpanStyle[styleKey]);
  return styleKey;
});
```

**Issue:** `.map()` is being used purely for side effects (the returned arrays are discarded). Each callback also has an unnecessary `return styleKey;` statement. Using `.forEach()` would be semantically correct and would eliminate the useless `return` statements.

**Suggested fix:**
```typescript
Object.keys(style as Record<string, any>).forEach((styleKey) => {
  (measurementElem!.style as Record<string, any>)[camelCaseToDashCase(styleKey)] =
    convertPixelValue(styleKey, (style as Record<string, any>)[styleKey]);
});
```

**Estimated gzip savings:** ~20-25 bytes (two `return styleKey;` lines removed, `.map` to `.forEach` is gzip-neutral)

---

## Finding 6: Duplicated Cache Key Construction in `domUtils.ts`

**File:** `packages/x-charts/src/internals/domUtils.ts`
**Lines:** 101, 158, 193

**Current code:**
```typescript
const cacheKey = `${str}-${styleString}`;     // Line 101
const cacheKey = `${text}-${styleString}`;    // Line 158
const cacheKey = `${text}-${styleString}`;    // Line 193
```

**Issue:** The template-literal cache key pattern appears 3 times. Lines 158 and 193 are identical.

**Suggested fix:** Extract a helper:
```typescript
const cacheKey = (text: string | number, styleString: string) => `${text}-${styleString}`;
```

**Estimated gzip savings:** ~10-15 bytes

---

## Finding 7: Duplicate Cache Overflow Check in `domUtils.ts`

**File:** `packages/x-charts/src/internals/domUtils.ts`
**Lines:** 128-130 and 199-201

**Current code:**
```typescript
// Lines 128-130 (in getStringSize)
if (stringCache.size + 1 > MAX_CACHE_NUM) {
  stringCache.clear();
}

// Lines 199-201 (in batchMeasureStrings)
if (stringCache.size + 1 > MAX_CACHE_NUM) {
  stringCache.clear();
}
```

**Issue:** Identical cache overflow check duplicated in two functions.

**Suggested fix:** Extract to a helper:
```typescript
function checkCacheOverflow() {
  if (stringCache.size + 1 > MAX_CACHE_NUM) {
    stringCache.clear();
  }
}
```

**Estimated gzip savings:** ~15-20 bytes

---

## Finding 8: Duplicate Test-Environment Cleanup in `domUtils.ts`

**File:** `packages/x-charts/src/internals/domUtils.ts`
**Lines:** 132-135 and 203-206

**Current code:**
```typescript
// Lines 132-135
if (process.env.NODE_ENV === 'test') {
  // In test environment, we clean the measurement span immediately
  measurementSpanContainer.replaceChildren();
}

// Lines 203-206
if (process.env.NODE_ENV === 'test') {
  // In test environment, we clean the measurement span immediately
  measurementContainer.replaceChildren();
}
```

**Issue:** Nearly identical test-environment cleanup blocks duplicated in two functions. The only difference is `measurementSpanContainer` vs `measurementContainer`.

**Estimated gzip savings:** ~15-20 bytes (gzip may already compress the repeated pattern somewhat)

---

## Finding 9: `cleanId` Uses Non-Global String Replace

**File:** `packages/x-charts/src/internals/cleanId.ts`
**Lines:** 4-6

**Current code:**
```typescript
export function cleanId(id: string) {
  return id.replace(' ', '_');
}
```

**Issue:** `String.replace` with a string first argument only replaces the first occurrence. If the intent is to replace all spaces, this is a bug. If the intent is to only replace the first space, this is surprising and undocumented behavior. Should likely use `replaceAll` or a regex with the `g` flag:
```typescript
export function cleanId(id: string) {
  return id.replaceAll(' ', '_');
}
```

**Estimated gzip savings:** 0 bytes (this is a correctness issue, not a size issue; `replaceAll` is the same byte count)

---

## Finding 10: Verbose `isDefined` Check

**File:** `packages/x-charts/src/internals/isDefined.ts`
**Lines:** 1-3

**Current code:**
```typescript
export function isDefined<T>(value: T | null | undefined): value is NonNullable<T> {
  return value !== null && value !== undefined;
}
```

**Issue:** `value !== null && value !== undefined` can be written as `value != null` (loose equality), which is the idiomatic JS pattern for checking against both null and undefined.

**Suggested fix:**
```typescript
export function isDefined<T>(value: T | null | undefined): value is NonNullable<T> {
  return value != null;
}
```

**Estimated gzip savings:** ~15-18 bytes (`value !== null && value !== undefined` is 37 bytes vs `value != null` at 14 bytes)

---

## Finding 11: Redundant Nullish Coalescing Fallback in `findMinMax`

**File:** `packages/x-charts/src/internals/findMinMax.ts`
**Line:** 12

**Current code:**
```typescript
export function findMinMax(data: readonly number[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;

  for (const value of data ?? []) {
    // ...
```

**Issue:** The parameter `data` is typed as `readonly number[]` (non-nullable). The `?? []` fallback is unreachable based on the type signature. If the function is intended to handle `null`/`undefined`, the type should reflect that; otherwise, the `?? []` is dead code.

**Suggested fix (if callers always pass an array):**
```typescript
  for (const value of data) {
```

**Estimated gzip savings:** ~5-8 bytes

---

## Finding 12: Repetitive `!arguments.length` Pattern in `scaleBand.ts`

**File:** `packages/x-charts/src/internals/scales/scaleBand.ts`
**Lines:** 85, 101, 127, 134, 142, 150, 158

**Current code (repeated 7 times):**
```typescript
scale.domain = function (_?: Iterable<any>) {
  if (!arguments.length) {
    return domain.slice();
  }
  // ...
};

scale.range = function (_?: [NumberValue, NumberValue]) {
  if (!arguments.length) {
    return [r0, r1];
  }
  // ...
};
```

**Issue:** The check `if (!arguments.length)` appears 7 times. This is a d3-style pattern, but since all methods declare an optional parameter `_`, the check could use `_ === undefined` instead, which is shorter and avoids the `arguments` object (which can prevent certain engine optimizations).

**Suggested fix:**
```typescript
scale.domain = function (_?: Iterable<any>) {
  if (_ === undefined) {
    return domain.slice();
  }
  // ...
};
```

**Estimated gzip savings:** ~25-30 bytes (7 occurrences of `!arguments.length` at 18 chars each replaced by `_===undefined` at 15 chars each; the real savings come from gzip being able to compress the shorter repeated pattern better)

---

## Finding 13: Repetitive Tick Count/Domain/Extent Pattern in `scaleSymlog.ts`

**File:** `packages/x-charts/src/internals/scales/scaleSymlog.ts`
**Lines:** 115-128

**Current code:**
```typescript
const negativeScaleDomain = negativeScale.domain();
const negativeScaleExtent = negativeScaleDomain[1] - negativeScaleDomain[0];
const negativeScaleRatio = extent === 0 ? 0 : negativeScaleExtent / extent;
const negativeScaleTickCount = negativeScaleRatio * count;

const linearScaleDomain = linearScale.domain();
const linearScaleExtent = linearScaleDomain[1] - linearScaleDomain[0];
const linearScaleRatio = extent === 0 ? 0 : linearScaleExtent / extent;
const linearScaleTickCount = linearScaleRatio * count;

const positiveScaleDomain = positiveScale.domain();
const positiveScaleExtent = positiveScaleDomain[1] - positiveScaleDomain[0];
const positiveScaleRatio = extent === 0 ? 0 : positiveScaleExtent / extent;
const positiveScaleTickCount = positiveScaleRatio * count;
```

**Issue:** Three nearly identical 4-line blocks. The only difference is the scale variable name.

**Suggested fix:**
```typescript
const getScaleTickCount = (s: any) => {
  const d = s.domain();
  const e = d[1] - d[0];
  return (extent === 0 ? 0 : e / extent) * count;
};
const negativeScaleTickCount = getScaleTickCount(negativeScale);
const linearScaleTickCount = getScaleTickCount(linearScale);
const positiveScaleTickCount = getScaleTickCount(positiveScale);
```

**Estimated gzip savings:** ~60-75 bytes (eliminates two repetitions of the 4-line pattern)

---

## Finding 14: Repeated Tick Merging Logic in `scaleSymlog.ts`

**File:** `packages/x-charts/src/internals/scales/scaleSymlog.ts`
**Lines:** 88-103

**Current code:**
```typescript
if (linearTickCount > 0) {
  const linearTicks = linearScale.ticks(linearTickCount);

  if (finalTicks.at(-1) === linearTicks[0]) {
    finalTicks.push(...linearTicks.slice(1));
  } else {
    finalTicks.push(...linearTicks);
  }
}

if (positiveLogTickCount > 0) {
  const positiveTicks = positiveScale.ticks(positiveLogTickCount);

  if (finalTicks.at(-1) === positiveTicks[0]) {
    finalTicks.push(...positiveTicks.slice(1));
  } else {
    finalTicks.push(...positiveTicks);
  }
}
```

**Issue:** The "merge ticks avoiding duplicate at boundary" pattern is repeated twice. The only difference is the scale and tick count variable.

**Suggested fix:**
```typescript
const mergeTicks = (scale: any, tickCount: number) => {
  if (tickCount > 0) {
    const ticks = scale.ticks(tickCount);
    const start = finalTicks.at(-1) === ticks[0] ? 1 : 0;
    finalTicks.push(...ticks.slice(start));
  }
};
mergeTicks(linearScale, linearTickCount);
mergeTicks(positiveScale, positiveLogTickCount);
```

**Estimated gzip savings:** ~45-55 bytes

---

## Finding 15: Verbose `getPercentageValue` String Slicing

**File:** `packages/x-charts/src/internals/getPercentageValue.ts`
**Lines:** 16, 22

**Current code:**
```typescript
const percentage = Number.parseFloat(value.slice(0, value.length - 1));
// ...
const val = Number.parseFloat(value.slice(0, value.length - 2));
```

**Issue:** `value.slice(0, value.length - 1)` can be written as `value.slice(0, -1)`, and `value.slice(0, value.length - 2)` as `value.slice(0, -2)`. Negative indices are supported by `slice`.

**Suggested fix:**
```typescript
const percentage = Number.parseFloat(value.slice(0, -1));
// ...
const val = Number.parseFloat(value.slice(0, -2));
```

**Estimated gzip savings:** ~25-30 bytes (two occurrences of `value.length - N` eliminated)

---

## Finding 16: Verbose `isInfinity` Implementation

**File:** `packages/x-charts/src/internals/isInfinity.ts`
**Lines:** 1-3

**Current code:**
```typescript
export function isInfinity(v: any): v is number {
  return typeof v === 'number' && !Number.isFinite(v);
}
```

**Issue:** This function returns `true` for `NaN` as well as `Infinity`/`-Infinity`, because `Number.isFinite(NaN)` is `false`. The function name is misleading. If only `Infinity`/`-Infinity` is intended, a more precise check would be `v === Infinity || v === -Infinity`, or `Math.abs(v) === Infinity`. Regardless, `!Number.isFinite(v)` already handles the typeof check since `Number.isFinite` returns false for non-numbers. But since this is a type guard that narrows to `number`, the `typeof` check is needed for TypeScript.

No size saving here, but worth noting the semantic concern.

**Estimated gzip savings:** 0 bytes (correctness concern only)

---

## Finding 17: Duplicated Gradient Construction Pattern in `ChartsAxesGradients.tsx`

**File:** `packages/x-charts/src/internals/components/ChartsAxesGradients/ChartsAxesGradients.tsx`
**Lines:** 39-78 vs 79-118

**Current code:**
```typescript
{filteredYAxisIds.map((axisId) => {
  const gradientId = getGradientId(axisId);
  const objectBoundGradientId = getObjectBoundGradientId(axisId);
  const { colorMap, scale, colorScale, reverse } = yAxis[axisId];
  if (colorMap?.type === 'piecewise') {
    return (
      <ChartsPiecewiseGradient
        key={gradientId}
        isReversed={!reverse}
        scale={scale}
        colorMap={colorMap}
        size={svgHeight}
        gradientId={gradientId}
        direction="y"
      />
    );
  }
  if (colorMap?.type === 'continuous') {
    return (
      <React.Fragment key={gradientId}>
        <ChartsContinuousGradient ... />
        <ChartsContinuousGradientObjectBound ... />
      </React.Fragment>
    );
  }
  return null;
})}
```

The block for `filteredXAxisIds` (lines 79-118) is nearly identical, differing only in:
- `yAxis[axisId]` vs `xAxis[axisId]`
- `isReversed={!reverse}` vs `isReversed={reverse}`
- `svgHeight` vs `svgWidth`
- `direction="y"` vs `direction="x"`

**Suggested fix:** Extract a shared render function:
```typescript
function renderAxisGradients(
  axisIds: string[],
  axisMap: Record<string, any>,
  size: number,
  direction: 'x' | 'y',
  invertReverse: boolean,
) {
  return axisIds.map((axisId) => {
    const gradientId = getGradientId(axisId);
    const objectBoundGradientId = getObjectBoundGradientId(axisId);
    const { colorMap, scale, colorScale, reverse } = axisMap[axisId];
    const isReversed = invertReverse ? !reverse : reverse;
    // ... common rendering logic
  });
}
```

**Estimated gzip savings:** ~80-100 bytes (large block of near-identical JSX deduplicated)

---

## Finding 18: Duplicated Interpolator Construction in Gradient Components

**Files:**
- `packages/x-charts/src/internals/components/ChartsAxesGradients/ChartsContinuousGradient.tsx` (lines 26-28, 35-38)
- `packages/x-charts/src/internals/components/ChartsAxesGradients/ChartsContinuousGradientObjectBound.tsx` (lines 28-29, 32-35)

**Current code in `ChartsContinuousGradient.tsx`:**
```typescript
const extremumValues = [colorMap.min ?? 0, colorMap.max ?? 100] as
  | [number, number]
  | [Date, Date];

const interpolator =
  typeof extremumValues[0] === 'number'
    ? interpolateNumber(extremumValues[0], extremumValues[1])
    : interpolateDate(extremumValues[0], extremumValues[1] as Date);
```

**Current code in `ChartsContinuousGradientObjectBound.tsx`:**
```typescript
const extremumValues = [colorMap.min ?? 0, colorMap.max ?? 100] as
  | [number, number]
  | [Date, Date];

const interpolator =
  typeof extremumValues[0] === 'number'
    ? interpolateNumber(extremumValues[0], extremumValues[1])
    : interpolateDate(extremumValues[0], extremumValues[1] as Date);
```

**Issue:** Identical 7-line block (extremumValues construction + interpolator selection) is duplicated across both files. Both files also share `const PX_PRECISION = 10;` and the same `import` of `interpolateDate, interpolateNumber`.

**Suggested fix:** Extract a shared utility:
```typescript
// gradientUtils.ts
export function createColorInterpolator(colorMap: ContinuousColorConfig) {
  const extremumValues = [colorMap.min ?? 0, colorMap.max ?? 100] as [number, number] | [Date, Date];
  const interpolator =
    typeof extremumValues[0] === 'number'
      ? interpolateNumber(extremumValues[0], extremumValues[1])
      : interpolateDate(extremumValues[0], extremumValues[1] as Date);
  return { extremumValues, interpolator };
}
```

**Estimated gzip savings:** ~50-60 bytes

---

## Finding 19: Duplicated `keyPrefix` Pattern in Gradient Components

**Files:**
- `packages/x-charts/src/internals/components/ChartsAxesGradients/ChartsContinuousGradient.tsx` (line 43)
- `packages/x-charts/src/internals/components/ChartsAxesGradients/ChartsContinuousGradientObjectBound.tsx` (line 38)

**Current code (both files):**
```typescript
const keyPrefix = `${extremumValues[0]}-${extremumValues[1]}-`;
```

**Issue:** Identical key prefix construction in both files. Could be part of the shared utility from Finding 18.

**Estimated gzip savings:** ~8-12 bytes (included in Finding 18's extraction)

---

## Finding 20: Repeated `stopOpacity={1}` in Gradient Components

**Files:**
- `packages/x-charts/src/internals/components/ChartsAxesGradients/ChartsContinuousGradient.tsx` (line 72)
- `packages/x-charts/src/internals/components/ChartsAxesGradients/ChartsContinuousGradientObjectBound.tsx` (line 57)
- `packages/x-charts/src/internals/components/ChartsAxesGradients/ChartsPiecewiseGradient.tsx` (lines 44, 45)

**Current code:**
```typescript
<stop key={keyPrefix + index} offset={offset} stopColor={color} stopOpacity={1} />
```

**Issue:** `stopOpacity={1}` is the default value for SVG `<stop>` elements. Specifying it is redundant and adds bytes to every gradient stop rendered. It appears in 4 `<stop>` element locations across 3 files.

**Suggested fix:** Remove `stopOpacity={1}` from all `<stop>` elements.

**Estimated gzip savings:** ~15-20 bytes (4 occurrences of ` stopOpacity={1}` removed; gzip compresses the repeated pattern, but elimination is still beneficial)

---

## Finding 21: Verbose Theme Palette Access Pattern in `AxisSharedComponents.tsx`

**File:** `packages/x-charts/src/internals/components/AxisSharedComponents.tsx`
**Lines:** 12, 15, 19, 24

**Current code:**
```typescript
fill: (theme.vars || theme).palette.text.primary,
// ... repeated 2 more times
stroke: (theme.vars || theme).palette.text.primary,
// ... repeated 1 more time
```

**Issue:** `(theme.vars || theme).palette.text.primary` is repeated 4 times. This pattern could be extracted to a local variable.

**Suggested fix:**
```typescript
(({ theme }) => {
  const textPrimary = (theme.vars || theme).palette.text.primary;
  return {
    [`& .${axisClasses.tickLabel}`]: {
      ...theme.typography.caption,
      fill: textPrimary,
    },
    [`& .${axisClasses.label}`]: {
      fill: textPrimary,
    },
    [`& .${axisClasses.line}`]: {
      stroke: textPrimary,
      shapeRendering: 'crispEdges',
      strokeWidth: 1,
    },
    [`& .${axisClasses.tick}`]: {
      stroke: textPrimary,
      shapeRendering: 'crispEdges',
    },
  };
})
```

**Estimated gzip savings:** ~30-35 bytes (3 repetitions of `.palette.text.primary` eliminated)

---

## Finding 22: Repeated `shapeRendering: 'crispEdges'` in `AxisSharedComponents.tsx`

**File:** `packages/x-charts/src/internals/components/AxisSharedComponents.tsx`
**Lines:** 20, 25

**Current code:**
```typescript
[`& .${axisClasses.line}`]: {
  stroke: ...,
  shapeRendering: 'crispEdges',
  strokeWidth: 1,
},
[`& .${axisClasses.tick}`]: {
  stroke: ...,
  shapeRendering: 'crispEdges',
},
```

**Issue:** `shapeRendering: 'crispEdges'` appears twice. Minor, but could be shared.

**Estimated gzip savings:** ~5-8 bytes

---

## Finding 23: Verbose Four-Function Structure in `commonNextFocusItem.ts`

**File:** `packages/x-charts/src/internals/commonNextFocusItem.ts`
**Lines:** 21-209

**Current code:** Four factory functions share extremely similar structure:
- `createGetNextIndexFocusedItem` (lines 21-72)
- `createGetPreviousIndexFocusedItem` (lines 74-125)
- `createGetNextSeriesFocusedItem` (lines 127-167)
- `createGetPreviousSeriesFocusedItem` (lines 169-209)

Common patterns in each:
```typescript
const processedSeries = selectorChartSeriesProcessed(
  state as ChartState<[UseChartKeyboardNavigationSignature], []>,
);
let seriesId = currentItem?.seriesId;
let type = currentItem?.type as OutSeriesType | undefined;
if (!type || seriesId == null || !seriesHasData(processedSeries, type, seriesId)) {
  // get next/previous series
}
```

This ~8-line preamble is duplicated 4 times with minimal variation.

**Suggested fix:** Extract a shared initialization helper:
```typescript
function initNavigation<OutSeriesType extends ChartSeriesType>(
  currentItem: { seriesId?: SeriesId; type?: string } | null,
  state: StateParameters<any>,
  compatibleSeriesTypes: Set<OutSeriesType>,
  direction: 'next' | 'previous',
): { type: OutSeriesType; seriesId: SeriesId } | null {
  const processedSeries = selectorChartSeriesProcessed(state as any);
  let seriesId = currentItem?.seriesId;
  let type = currentItem?.type as OutSeriesType | undefined;
  if (!type || seriesId == null || !seriesHasData(processedSeries, type, seriesId)) {
    const fn = direction === 'next' ? getNextNonEmptySeries : getPreviousNonEmptySeries;
    const result = fn(processedSeries, compatibleSeriesTypes, type, seriesId);
    if (result === null) return null;
    type = result.type;
    seriesId = result.seriesId;
  }
  return { type: type!, seriesId: seriesId! };
}
```

**Estimated gzip savings:** ~100-130 bytes (the preamble block ~80 raw bytes x 4 occurrences, minus the helper definition)

---

## Finding 24: Redundant Barrel Re-export in `ChartsAxesGradients/index.tsx`

**File:** `packages/x-charts/src/internals/components/ChartsAxesGradients/index.tsx`

**Current code:**
```typescript
export * from './ChartsAxesGradients';
```

**Issue:** This is a single-line barrel file that re-exports from a file in the same directory. The parent `index.ts` imports from `'./components/ChartsAxesGradients'`. If the import path was changed to `'./components/ChartsAxesGradients/ChartsAxesGradients'`, this barrel file could be eliminated. However, barrel files have near-zero gzip cost since bundlers resolve them at build time and tree-shaking eliminates them.

**Estimated gzip savings:** ~0 bytes (build tool handles this)

---

## Finding 25: `scaleSeriesConfig` Identity Re-export in `index.ts`

**File:** `packages/x-charts/src/internals/index.ts`
**Line:** 15

**Current code:**
```typescript
export { scatterSeriesConfig as scatterSeriesConfig } from '../ScatterChart/seriesConfig';
```

**Issue:** The `as scatterSeriesConfig` clause is redundant because the export name is the same as the import name.

**Suggested fix:**
```typescript
export { scatterSeriesConfig } from '../ScatterChart/seriesConfig';
```

**Estimated gzip savings:** ~3-5 bytes

---

## Finding 26: Unnecessary Object Spread in `material/index.ts`

**File:** `packages/x-charts/src/internals/material/index.ts`
**Line:** 20

**Current code:**
```typescript
const baseSlots: ChartsBaseSlots = {
  baseButton: Button,
  baseIconButton: IconButton,
};

const iconSlots: ChartsIconSlots = {};

export const defaultSlotsMaterial: ChartsSlots = { ...baseSlots, ...iconSlots };
```

**Issue:** `iconSlots` is an empty object `{}`. Spreading an empty object `...iconSlots` has no effect. The entire expression could be simplified.

**Suggested fix:**
```typescript
export const defaultSlotsMaterial: ChartsSlots = {
  baseButton: Button,
  baseIconButton: IconButton,
};
```
This also eliminates the intermediate `baseSlots` and `iconSlots` variables.

**Estimated gzip savings:** ~30-40 bytes (eliminates two intermediate const declarations and two spread operations)

---

## Finding 27: Verbose Conditional in `Transition.ts` Stop Method

**File:** `packages/x-charts/src/internals/animation/Transition.ts`
**Lines:** 74-85

**Current code:**
```typescript
stop(): this {
  if (!this.running) {
    return this;
  }

  if (this.timer) {
    this.timer.stop();
    this.timer = null;
  }

  return this;
}
```

**Issue:** The `running` getter (line 37-39) is defined as `return this.timer !== null`. So `if (!this.running)` checks `this.timer === null`, and then `if (this.timer)` checks `this.timer !== null`. These two checks are redundant; if `!this.running` is false (i.e., running is true), then `this.timer` is guaranteed to be non-null.

**Suggested fix:**
```typescript
stop(): this {
  if (this.timer) {
    this.timer.stop();
    this.timer = null;
  }
  return this;
}
```

**Estimated gzip savings:** ~20-25 bytes

---

## Finding 28: `configInit.ts` Uses Classes for Simple Set-Based Registration

**File:** `packages/x-charts/src/internals/configInit.ts`
**Lines:** 1-55

**Current code:**
```typescript
let cartesianInstance: undefined | Set<CartesianChartSeriesType>;
let polarInstance: undefined | Set<PolarChartSeriesType>;

class CartesianSeriesTypes {
  types: Set<CartesianChartSeriesType> = new Set();
  constructor() {
    if (cartesianInstance) {
      throw new Error('You can only create one instance!');
    }
    cartesianInstance = this.types;
  }
  addType(value: CartesianChartSeriesType) {
    this.types.add(value);
  }
  getTypes() {
    return this.types;
  }
}

class PolarSeriesTypes {
  types: Set<PolarChartSeriesType> = new Set();
  constructor() {
    if (polarInstance) {
      throw new Error('You can only create one instance!');
    }
    polarInstance = this.types;
  }
  addType(value: PolarChartSeriesType) {
    this.types.add(value);
  }
  getTypes() {
    return this.types;
  }
}

export const cartesianSeriesTypes = new CartesianSeriesTypes();
cartesianSeriesTypes.addType('bar');
cartesianSeriesTypes.addType('line');
cartesianSeriesTypes.addType('scatter');

export const polarSeriesTypes = new PolarSeriesTypes();
polarSeriesTypes.addType('radar');
```

**Issue:** Two nearly identical singleton classes (`CartesianSeriesTypes` and `PolarSeriesTypes`) wrap a simple `Set`. The classes add `addType`, `getTypes`, and singleton enforcement, but the entire mechanism could be replaced with plain `Set` objects:

**Suggested fix:**
```typescript
export const cartesianSeriesTypes = {
  types: new Set<CartesianChartSeriesType>(['bar', 'line', 'scatter']),
  addType(value: CartesianChartSeriesType) { this.types.add(value); },
  getTypes() { return this.types; },
};

export const polarSeriesTypes = {
  types: new Set<PolarChartSeriesType>(['radar']),
  addType(value: PolarChartSeriesType) { this.types.add(value); },
  getTypes() { return this.types; },
};
```

Or even simpler, if the public API allows it, just export the sets directly.

**Estimated gzip savings:** ~80-100 bytes (two class definitions, two module-level variables, constructor logic, and individual `addType` calls eliminated)

---

## Finding 29: `getWordsByLines.ts` Imports `getStringSize` but Only Uses It Conditionally

**File:** `packages/x-charts/src/internals/getWordsByLines.ts`
**Line:** 2

**Current code:**
```typescript
import { getStringSize } from './domUtils';

export function getWordsByLines({ style, needsComputation, text }: GetWordsByLinesParams) {
  return text.split('\n').map((subText) => ({
    text: subText,
    ...(needsComputation ? getStringSize(subText, style) : { width: 0, height: 0 }),
  }));
}
```

**Issue:** The spread `...(needsComputation ? getStringSize(subText, style) : { width: 0, height: 0 })` creates an unnecessary intermediate object `{ width: 0, height: 0 }` when `needsComputation` is false.

**Suggested fix:**
```typescript
export function getWordsByLines({ style, needsComputation, text }: GetWordsByLinesParams) {
  return text.split('\n').map((subText) => {
    const size = needsComputation ? getStringSize(subText, style) : { width: 0, height: 0 };
    return { text: subText, width: size.width, height: size.height };
  });
}
```

Or with explicit property assignment (avoids object spread):
```typescript
return text.split('\n').map((subText) => ({
  text: subText,
  width: needsComputation ? getStringSize(subText, style).width : 0,
  height: needsComputation ? getStringSize(subText, style).height : 0,
}));
```

The first alternative is better since it avoids calling `getStringSize` twice.

**Estimated gzip savings:** ~5-8 bytes (object spread overhead eliminated)

---

## Finding 30: `WebGLProvider` Creates Inline Style Objects on Every Render

**File:** `packages/x-charts/src/internals/components/WebGLContext.tsx`
**Lines:** 87-94 and 110-121

**Current code:**
```typescript
// In WebGLProvider render:
style={{
  position: 'relative',
  left: drawingArea.left,
  top: drawingArea.top,
  width: drawingArea.width,
  height: drawingArea.height,
}}

// In CanvasPositioner render:
style={{
  position: 'relative',
  pointerEvents: 'none',
  gridArea: 'chart',
  order: -1,
  maxWidth: svgWidth,
  maxHeight: svgHeight,
  width: '100%',
  height: '100%',
}}
```

**Issue:** Inline style objects are recreated on every render. The `CanvasPositioner` style has 4 static properties (`position`, `pointerEvents`, `gridArea`, `order`) that could be extracted to a module-level constant to reduce object creation and improve gzip compression (since the property names become a single reference).

**Suggested fix:**
```typescript
const POSITIONER_STATIC_STYLE = {
  position: 'relative' as const,
  pointerEvents: 'none' as const,
  gridArea: 'chart',
  order: -1,
};

// Then in render:
style={{ ...POSITIONER_STATIC_STYLE, maxWidth: svgWidth, maxHeight: svgHeight, width: '100%', height: '100%' }}
```

**Estimated gzip savings:** ~10-15 bytes (minor; the bigger benefit is runtime perf)

---

## Summary Table

| # | Finding | File(s) | Est. Gzip Savings |
|---|---------|---------|-------------------|
| 1 | Duplicate deg-to-rad functions | `degToRad.ts`, `angleConversion.ts` | ~40-50 bytes |
| 2 | Duplicate `Intl.Segmenter` init | `getGraphemeCount.ts`, `sliceUntil.ts` | ~55-65 bytes |
| 3 | Repeated SVG namespace string | `domUtils.ts` | ~30-40 bytes |
| 4 | Repeated style assignments | `domUtils.ts` | ~50-65 bytes |
| 5 | `.map()` for side effects | `domUtils.ts` | ~20-25 bytes |
| 6 | Duplicated cache key construction | `domUtils.ts` | ~10-15 bytes |
| 7 | Duplicate cache overflow check | `domUtils.ts` | ~15-20 bytes |
| 8 | Duplicate test-env cleanup | `domUtils.ts` | ~15-20 bytes |
| 9 | Non-global string replace in `cleanId` | `cleanId.ts` | 0 bytes (bug) |
| 10 | Verbose `isDefined` null check | `isDefined.ts` | ~15-18 bytes |
| 11 | Redundant `?? []` in `findMinMax` | `findMinMax.ts` | ~5-8 bytes |
| 12 | Repeated `!arguments.length` | `scaleBand.ts` | ~25-30 bytes |
| 13 | Repeated tick count/extent pattern | `scaleSymlog.ts` | ~60-75 bytes |
| 14 | Repeated tick merging logic | `scaleSymlog.ts` | ~45-55 bytes |
| 15 | Verbose string slicing | `getPercentageValue.ts` | ~25-30 bytes |
| 16 | Misleading `isInfinity` name | `isInfinity.ts` | 0 bytes (semantics) |
| 17 | Duplicated gradient render blocks | `ChartsAxesGradients.tsx` | ~80-100 bytes |
| 18 | Duplicated interpolator construction | Continuous gradient files | ~50-60 bytes |
| 19 | Duplicated `keyPrefix` pattern | Continuous gradient files | ~8-12 bytes |
| 20 | Redundant `stopOpacity={1}` | Gradient files | ~15-20 bytes |
| 21 | Repeated theme palette access | `AxisSharedComponents.tsx` | ~30-35 bytes |
| 22 | Repeated `shapeRendering` value | `AxisSharedComponents.tsx` | ~5-8 bytes |
| 23 | Repetitive factory structure | `commonNextFocusItem.ts` | ~100-130 bytes |
| 24 | Redundant barrel re-export | `ChartsAxesGradients/index.tsx` | ~0 bytes |
| 25 | Identity re-export `as` clause | `index.ts` | ~3-5 bytes |
| 26 | Unnecessary empty object spread | `material/index.ts` | ~30-40 bytes |
| 27 | Redundant guard in `Transition.stop` | `Transition.ts` | ~20-25 bytes |
| 28 | Over-engineered singleton classes | `configInit.ts` | ~80-100 bytes |
| 29 | Conditional spread pattern | `getWordsByLines.ts` | ~5-8 bytes |
| 30 | Inline style objects recreated | `WebGLContext.tsx` | ~10-15 bytes |

**Total estimated gzip savings: ~890-1140 bytes**

### Top 5 highest-impact changes:
1. **Finding 23** (commonNextFocusItem factory dedup): ~100-130 bytes
2. **Finding 17** (ChartsAxesGradients render dedup): ~80-100 bytes
3. **Finding 28** (configInit class simplification): ~80-100 bytes
4. **Finding 13** (scaleSymlog tick count dedup): ~60-75 bytes
5. **Finding 2** (Intl.Segmenter dedup): ~55-65 bytes
