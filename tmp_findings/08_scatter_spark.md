# Bundle Size Optimization Findings: ScatterChart & SparkLineChart

## Files Analyzed

### ScatterChart/
- `index.ts`
- `ScatterChart.tsx`
- `ScatterChart.plugins.ts`
- `ScatterPlot.tsx`
- `Scatter.tsx`
- `BatchScatter.tsx`
- `ScatterMarker.tsx`
- `ScatterMarker.types.ts`
- `FocusedScatterMark.tsx`
- `scatterClasses.ts`
- `useScatterChartProps.ts`
- `useScatterPlotData.ts`
- `seriesConfig/index.ts`
- `seriesConfig/extremums.ts`
- `seriesConfig/getColor.ts`
- `seriesConfig/getSeriesWithDefaultValues.ts`
- `seriesConfig/legend.ts`
- `seriesConfig/seriesProcessor.ts`
- `seriesConfig/tooltip.ts`
- `seriesConfig/tooltipPosition.ts`
- `seriesConfig/keyboardFocusHandler.ts`

### SparkLineChart/
- `index.ts`
- `SparkLineChart.tsx`

---

## Finding 1: Duplicate Extremum Getter Logic (High Impact)

**File:** `packages/x-charts/src/ScatterChart/seriesConfig/extremums.ts`
**Lines:** 3-93

**Description:** `getExtremumX` (lines 3-47) and `getExtremumY` (lines 49-93) are near-identical functions. The only differences are: (a) the axis id property accessed (`xAxisId` vs `yAxisId`), (b) the filter parameter names (`seriesXAxisId`/`seriesYAxisId` are in both, but which one is checked differs), and (c) the data property accessed (`d.x` vs `d.y`).

**Current code (getExtremumX, lines 3-47):**
```typescript
export const getExtremumX: CartesianExtremumGetter<'scatter'> = (params) => {
  const { series, axis, isDefaultAxis, getFilters } = params;

  let min = Infinity;
  let max = -Infinity;

  for (const seriesId in series) {
    if (!Object.hasOwn(series, seriesId)) {
      continue;
    }

    const axisId = series[seriesId].xAxisId;
    if (!(axisId === axis.id || (axisId === undefined && isDefaultAxis))) {
      continue;
    }

    const filter = getFilters?.({
      currentAxisId: axis.id,
      isDefaultAxis,
      seriesXAxisId: series[seriesId].xAxisId,
      seriesYAxisId: series[seriesId].yAxisId,
    });

    const seriesData = series[seriesId].data ?? [];

    for (let i = 0; i < seriesData.length; i += 1) {
      const d = seriesData[i];

      if (filter && !filter(d, i)) {
        continue;
      }

      if (d.x !== null) {
        if (d.x < min) {
          min = d.x;
        }
        if (d.x > max) {
          max = d.x;
        }
      }
    }
  }

  return [min, max];
};
```

**Current code (getExtremumY, lines 49-93):**
```typescript
export const getExtremumY: CartesianExtremumGetter<'scatter'> = (params) => {
  const { series, axis, isDefaultAxis, getFilters } = params;

  let min = Infinity;
  let max = -Infinity;

  for (const seriesId in series) {
    if (!Object.hasOwn(series, seriesId)) {
      continue;
    }

    const axisId = series[seriesId].yAxisId;
    if (!(axisId === axis.id || (axisId === undefined && isDefaultAxis))) {
      continue;
    }

    const filter = getFilters?.({
      currentAxisId: axis.id,
      isDefaultAxis,
      seriesXAxisId: series[seriesId].xAxisId,
      seriesYAxisId: series[seriesId].yAxisId,
    });

    const seriesData = series[seriesId].data ?? [];

    for (let i = 0; i < seriesData.length; i += 1) {
      const d = seriesData[i];

      if (filter && !filter(d, i)) {
        continue;
      }

      if (d.y !== null) {
        if (d.y < min) {
          min = d.y;
        }
        if (d.y > max) {
          max = d.y;
        }
      }
    }
  }

  return [min, max];
};
```

**Suggested fix:** Extract a shared factory function parameterized by the axis dimension:
```typescript
function createExtremumGetter(
  axisIdKey: 'xAxisId' | 'yAxisId',
  valueProp: 'x' | 'y',
): CartesianExtremumGetter<'scatter'> {
  return (params) => {
    const { series, axis, isDefaultAxis, getFilters } = params;
    let min = Infinity;
    let max = -Infinity;

    for (const seriesId in series) {
      if (!Object.hasOwn(series, seriesId)) continue;

      const axisId = series[seriesId][axisIdKey];
      if (!(axisId === axis.id || (axisId === undefined && isDefaultAxis))) continue;

      const filter = getFilters?.({
        currentAxisId: axis.id,
        isDefaultAxis,
        seriesXAxisId: series[seriesId].xAxisId,
        seriesYAxisId: series[seriesId].yAxisId,
      });

      const seriesData = series[seriesId].data ?? [];

      for (let i = 0; i < seriesData.length; i += 1) {
        const d = seriesData[i];
        if (filter && !filter(d, i)) continue;

        const val = d[valueProp];
        if (val !== null) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
    }

    return [min, max];
  };
}

export const getExtremumX = createExtremumGetter('xAxisId', 'x');
export const getExtremumY = createExtremumGetter('yAxisId', 'y');
```

**Estimated gzip savings:** 60-90 bytes

---

## Finding 2: Repeated Color Getter Pattern with Identical Preamble (High Impact)

**File:** `packages/x-charts/src/ScatterChart/seriesConfig/getColor.ts`
**Lines:** 10-68

**Description:** The function returns one of four arrow functions depending on which color scale is active. All four branches share the identical preamble `if (dataIndex === undefined) { return series.color; }` and the three color-scale branches share a nearly identical body pattern: get the value, call the color scale with a property of the value, fall back to `getSeriesColor` if null.

**Current code:**
```typescript
if (zColorScale) {
  return (dataIndex?: number) => {
    if (dataIndex === undefined) {
      return series.color;
    }

    if (zAxis?.data?.[dataIndex] !== undefined) {
      const color = zColorScale(zAxis?.data?.[dataIndex]);
      if (color !== null) {
        return color;
      }
    }
    const value = series.data[dataIndex];
    const color = value === null ? getSeriesColor({ value, dataIndex }) : zColorScale(value.z);
    if (color === null) {
      return getSeriesColor({ value, dataIndex });
    }
    return color;
  };
}

if (yColorScale) {
  return (dataIndex?: number) => {
    if (dataIndex === undefined) {
      return series.color;
    }
    const value = series.data[dataIndex];
    const color = value === null ? getSeriesColor({ value, dataIndex }) : yColorScale(value.y);
    if (color === null) {
      return getSeriesColor({ value, dataIndex });
    }
    return color;
  };
}

if (xColorScale) {
  return (dataIndex?: number) => {
    if (dataIndex === undefined) {
      return series.color;
    }
    const value = series.data[dataIndex];
    const color = value === null ? getSeriesColor({ value, dataIndex }) : xColorScale(value.x);
    if (color === null) {
      return getSeriesColor({ value, dataIndex });
    }
    return color;
  };
}

return (dataIndex?: number) => {
  if (dataIndex === undefined) {
    return series.color;
  }

  const value = series.data[dataIndex];

  return getSeriesColor({ value, dataIndex });
};
```

**Suggested fix:** Extract a helper for the x/y/z color scale branches:
```typescript
const getSeriesColor = getSeriesColorFn(series);

const makeScaleGetter = (
  scale: typeof zColorScale,
  valueFn: (v: NonNullable<typeof series.data[number]>) => any,
) => (dataIndex?: number) => {
  if (dataIndex === undefined) return series.color;
  const value = series.data[dataIndex];
  const color = value === null ? null : scale!(valueFn(value));
  return color ?? getSeriesColor({ value, dataIndex });
};

if (zColorScale) {
  // z-axis has the extra zAxis.data lookup; keep special case but still shorter
  return (dataIndex?: number) => {
    if (dataIndex === undefined) return series.color;
    if (zAxis?.data?.[dataIndex] !== undefined) {
      const c = zColorScale(zAxis.data[dataIndex]);
      if (c !== null) return c;
    }
    return makeScaleGetter(zColorScale, (v) => v.z)(dataIndex);
  };
}
if (yColorScale) return makeScaleGetter(yColorScale, (v) => v.y);
if (xColorScale) return makeScaleGetter(xColorScale, (v) => v.x);

return (dataIndex?: number) => {
  if (dataIndex === undefined) return series.color;
  return getSeriesColor({ value: series.data[dataIndex], dataIndex });
};
```

**Estimated gzip savings:** 30-50 bytes

---

## Finding 3: Duplicate `getValueToPositionMapper` Calls in BatchScatter (Medium Impact)

**File:** `packages/x-charts/src/ScatterChart/BatchScatter.tsx`
**Lines:** 151-154, 171-173

**Description:** Inside `BatchScatter`, `getValueToPositionMapper(xScale)` and `getValueToPositionMapper(yScale)` are called separately in the `seriesHighlightedItem` block (lines 153-154) and again in the `seriesUnfadedItem` block (lines 172-173). These are identical calls with the same `xScale` and `yScale` arguments that could be hoisted above both conditionals.

**Current code (lines 150-182):**
```typescript
const siblings: React.ReactNode[] = [];
if (seriesHighlightedItem != null) {
  const datum = series.data[seriesHighlightedItem];
  const getXPosition = getValueToPositionMapper(xScale);
  const getYPosition = getValueToPositionMapper(yScale);

  siblings.push(
    <path
      key={`highlighted-${series.id}`}
      fill={colorGetter ? colorGetter(seriesHighlightedItem) : color}
      data-highlighted
      d={createPath(
        getXPosition(datum.x),
        getYPosition(datum.y),
        markerSize * highlightedModifier,
      )}
    />,
  );
}

if (seriesUnfadedItem != null) {
  const datum = series.data[seriesUnfadedItem];
  const getXPosition = getValueToPositionMapper(xScale);
  const getYPosition = getValueToPositionMapper(yScale);

  siblings.push(
    <path
      key={`unfaded-${series.id}`}
      fill={colorGetter ? colorGetter(seriesUnfadedItem) : color}
      d={createPath(getXPosition(datum.x), getYPosition(datum.y), markerSize)}
    />,
  );
}
```

**Suggested fix:** Hoist the mapper calls before the two conditionals:
```typescript
const siblings: React.ReactNode[] = [];
const needsMappers = seriesHighlightedItem != null || seriesUnfadedItem != null;
const getXPosition = needsMappers ? getValueToPositionMapper(xScale) : undefined;
const getYPosition = needsMappers ? getValueToPositionMapper(yScale) : undefined;

if (seriesHighlightedItem != null) {
  const datum = series.data[seriesHighlightedItem];
  siblings.push(
    <path
      key={`highlighted-${series.id}`}
      fill={colorGetter ? colorGetter(seriesHighlightedItem) : color}
      data-highlighted
      d={createPath(getXPosition!(datum.x), getYPosition!(datum.y), markerSize * highlightedModifier)}
    />,
  );
}

if (seriesUnfadedItem != null) {
  const datum = series.data[seriesUnfadedItem];
  siblings.push(
    <path
      key={`unfaded-${series.id}`}
      fill={colorGetter ? colorGetter(seriesUnfadedItem) : color}
      d={createPath(getXPosition!(datum.x), getYPosition!(datum.y), markerSize)}
    />,
  );
}
```

**Estimated gzip savings:** 20-30 bytes

---

## Finding 4: Duplicate `colorGetter ? colorGetter(...) : color` Pattern in BatchScatter

**File:** `packages/x-charts/src/ScatterChart/BatchScatter.tsx`
**Lines:** 159, 178

**Description:** The expression `colorGetter ? colorGetter(index) : color` appears twice with only the index argument differing.

**Current code:**
```typescript
// Line 159
fill={colorGetter ? colorGetter(seriesHighlightedItem) : color}
// Line 178
fill={colorGetter ? colorGetter(seriesUnfadedItem) : color}
```

**Suggested fix:** Extract a small helper:
```typescript
const getFill = (idx: number) => colorGetter ? colorGetter(idx) : color;
```

**Estimated gzip savings:** 10-15 bytes

---

## Finding 5: Verbose `disableVoronoi !== true` Check

**File:** `packages/x-charts/src/ScatterChart/useScatterChartProps.ts`
**Line:** 56

**Current code:**
```typescript
const useVoronoiOnItemClick = disableVoronoi !== true || renderer === 'svg-batch';
```

**Suggested fix:**
```typescript
const useVoronoiOnItemClick = !disableVoronoi || renderer === 'svg-batch';
```

**Note:** `disableVoronoi` is typed as `boolean | undefined`. `!disableVoronoi` is `true` when the value is `undefined` or `false`, which matches the semantics of `disableVoronoi !== true`. This is safe.

**Estimated gzip savings:** 5-8 bytes

---

## Finding 6: Unnecessary `as const` Assertions on String Literals

**File:** `packages/x-charts/src/ScatterChart/useScatterChartProps.ts`
**Lines:** 112-113

**Current code:**
```typescript
const axisHighlightProps: ChartsAxisHighlightProps = {
  y: 'none' as const,
  x: 'none' as const,
  ...axisHighlight,
};
```

**Description:** The `as const` assertion is unnecessary here because the object is already typed as `ChartsAxisHighlightProps` which narrows the allowed values. Even without explicit typing, the string literal `'none'` assigned to a known property would be inferred correctly.

**Suggested fix:**
```typescript
const axisHighlightProps: ChartsAxisHighlightProps = {
  y: 'none',
  x: 'none',
  ...axisHighlight,
};
```

**Estimated gzip savings:** 3-5 bytes (the `as const` text is stripped by the compiler, but the annotation still causes longer source that editors and source maps carry)

---

## Finding 7: Repeated `slots`/`slotProps` Pass-Through in useScatterChartProps

**File:** `packages/x-charts/src/ScatterChart/useScatterChartProps.ts`
**Lines:** 76-77, 82-83, 95-96, 102-103, 107-108

**Description:** The properties `slots` and `slotProps` are passed into five separate props objects (`chartContainerProps`, `chartsAxisProps`, `scatterPlotProps`, `overlayProps`, `legendProps`). Each occurrence repeats the property names. While unavoidable in some cases, a shared helper object could reduce the repetition.

**Current code:**
```typescript
const chartContainerProps = { ...other, slots, slotProps, ... };
const chartsAxisProps = { slots, slotProps };
const scatterPlotProps = { ..., slots, slotProps, ... };
const overlayProps = { loading, slots, slotProps };
const legendProps = { slots, slotProps };
```

**Suggested fix:** Extract a shared constant:
```typescript
const slotContext = { slots, slotProps };

const chartContainerProps = { ...other, ...slotContext, ... };
const chartsAxisProps: ChartsAxisProps = slotContext;
const scatterPlotProps = { ..., ...slotContext, ... };
const overlayProps = { loading, ...slotContext };
const legendProps: ChartsLegendSlotExtension = slotContext;
```

**Estimated gzip savings:** 15-25 bytes

---

## Finding 8: Redundant Intermediate Variable in ScatterPlot

**File:** `packages/x-charts/src/ScatterChart/ScatterPlot.tsx`
**Lines:** 69-70

**Current code:**
```typescript
const DefaultScatterItems = renderer === 'svg-batch' ? BatchScatter : Scatter;
const ScatterItems = slots?.scatter ?? DefaultScatterItems;
```

**Suggested fix:** Inline the ternary:
```typescript
const ScatterItems = slots?.scatter ?? (renderer === 'svg-batch' ? BatchScatter : Scatter);
```

**Estimated gzip savings:** 8-12 bytes

---

## Finding 9: Repeated `series[seriesId]` Lookups in ScatterPlot

**File:** `packages/x-charts/src/ScatterChart/ScatterPlot.tsx`
**Lines:** 75-96

**Current code:**
```typescript
seriesOrder.map((seriesId) => {
  const { id, xAxisId, yAxisId, zAxisId, color, hidden } = series[seriesId];

  if (hidden) {
    return null;
  }

  const colorGetter = scatterSeriesConfig.colorProcessor(
    series[seriesId],
    xAxis[xAxisId ?? defaultXAxisId],
    yAxis[yAxisId ?? defaultYAxisId],
    zAxis[zAxisId ?? defaultZAxisId],
  );
  const xScale = xAxis[xAxisId ?? defaultXAxisId].scale;
  const yScale = yAxis[yAxisId ?? defaultYAxisId].scale;
  return (
    <ScatterItems
      key={id}
      ...
      series={series[seriesId]}
```

**Description:** `series[seriesId]` is accessed four times (destructuring on line 75, then again on lines 82, 96 as prop). After the destructure, a local variable could be used. Additionally, `xAxisId ?? defaultXAxisId` and `yAxisId ?? defaultYAxisId` are each computed twice.

**Suggested fix:**
```typescript
seriesOrder.map((seriesId) => {
  const s = series[seriesId];
  const { id, xAxisId, yAxisId, zAxisId, color, hidden } = s;

  if (hidden) return null;

  const resolvedXAxisId = xAxisId ?? defaultXAxisId;
  const resolvedYAxisId = yAxisId ?? defaultYAxisId;
  const xAxisObj = xAxis[resolvedXAxisId];
  const yAxisObj = yAxis[resolvedYAxisId];

  const colorGetter = scatterSeriesConfig.colorProcessor(
    s, xAxisObj, yAxisObj, zAxis[zAxisId ?? defaultZAxisId],
  );
  return (
    <ScatterItems
      key={id}
      xScale={xAxisObj.scale}
      yScale={yAxisObj.scale}
      color={color}
      colorGetter={colorGetter}
      series={s}
      ...
```

**Estimated gzip savings:** 15-25 bytes

---

## Finding 10: Redundant Self-Import in ScatterPlot

**File:** `packages/x-charts/src/ScatterChart/ScatterPlot.tsx`
**Line:** 8

**Current code:**
```typescript
import { scatterSeriesConfig as scatterSeriesConfig } from './seriesConfig';
```

**Description:** The import renames `scatterSeriesConfig` to itself (`as scatterSeriesConfig`). This is a no-op alias.

**Suggested fix:**
```typescript
import { scatterSeriesConfig } from './seriesConfig';
```

**Estimated gzip savings:** 2-3 bytes (minifier likely strips this, but source is cleaner)

---

## Finding 11: Redundant Optional Chaining After Null Guard in FocusedScatterMark

**File:** `packages/x-charts/src/ScatterChart/FocusedScatterMark.tsx`
**Line:** 18

**Current code (lines 15-18):**
```typescript
if (focusedItem === null || focusedItem.type !== 'scatter' || !scatterSeries) {
  return null;
}

const series = scatterSeries?.series[focusedItem.seriesId];
```

**Description:** The guard on line 15 already returns if `!scatterSeries`, so on line 18 `scatterSeries` is guaranteed to be truthy. The `?.` operator is unnecessary.

**Suggested fix:**
```typescript
const series = scatterSeries.series[focusedItem.seriesId];
```

**Estimated gzip savings:** 1-2 bytes

---

## Finding 12: Repeated `type: 'scatter'` Literal Across Multiple Files

**Files and lines:**
- `useScatterPlotData.ts` line 20: `type: 'scatter'`
- `Scatter.tsx` line 122: `type: 'scatter'`
- `seriesConfig/seriesProcessor.ts` line 48: `type: 'scatter'`
- `seriesConfig/legend.ts` line 15: `type: 'scatter'`

**Description:** The string literal `'scatter'` appears as a `type` property value in multiple runtime object constructions. Gzip handles repeated strings well, but extracting a constant could help if the files are bundled separately or if gzip window size does not cover all usages.

**Suggested fix:** Create a shared constant:
```typescript
// In a shared location, e.g., seriesConfig/index.ts or a constants file
export const SCATTER_TYPE = 'scatter' as const;
```

**Estimated gzip savings:** 5-10 bytes (marginal; gzip already captures this pattern across nearby occurrences)

---

## Finding 13: Verbose `disableAxisListener` Expression in SparkLineChart

**File:** `packages/x-charts/src/SparkLineChart/SparkLineChart.tsx`
**Lines:** 288-293

**Current code:**
```typescript
disableAxisListener={
  onHighlightedAxisChange === undefined &&
  (!showTooltip || slotProps?.tooltip?.trigger !== 'axis') &&
  axisHighlight?.x === 'none' &&
  axisHighlight?.y === 'none'
}
```

**Description:** Four conditions are chained with `&&`. The two `axisHighlight?.` checks both compare against `'none'`. Given that `axisHighlight` is computed from `defaultXHighlight` and `inAxisHighlight` on lines 226-232, and `defaultXHighlight` is always `{ x: 'band' | 'none' }`, the optional chaining is unnecessary since `axisHighlight` is always defined.

**Suggested fix:** Remove unnecessary optional chaining:
```typescript
disableAxisListener={
  onHighlightedAxisChange === undefined &&
  (!showTooltip || slotProps?.tooltip?.trigger !== 'axis') &&
  axisHighlight.x === 'none' &&
  axisHighlight.y === 'none'
}
```

**Estimated gzip savings:** 2-4 bytes

---

## Finding 14: Unnecessary `React.useMemo` for Simple Object Literals in SparkLineChart

**File:** `packages/x-charts/src/SparkLineChart/SparkLineChart.tsx`
**Lines:** 222-225

**Current code:**
```typescript
const defaultXHighlight: { x: 'band' | 'none' } = React.useMemo(
  () => (showHighlight && plotType === 'bar' ? { x: 'band' } : { x: 'none' }),
  [plotType, showHighlight],
);
const axisHighlight = React.useMemo(
  () => ({
    ...defaultXHighlight,
    ...inAxisHighlight,
  }),
  [defaultXHighlight, inAxisHighlight],
);
```

**Description:** Two `useMemo` calls for trivially cheap computations (creating a tiny object with one or two string properties). The cost of the `useMemo` bookkeeping and dependency array comparison likely exceeds the cost of creating these small objects on each render.

**Suggested fix:**
```typescript
const defaultXHighlight = showHighlight && plotType === 'bar' ? { x: 'band' as const } : { x: 'none' as const };
const axisHighlight = { ...defaultXHighlight, ...inAxisHighlight };
```

**Estimated gzip savings:** 30-40 bytes (removing two `React.useMemo` wrappers and dependency arrays)

---

## Finding 15: `clipPathOffset` useMemo with Four Individual Nullish Coalescing Operators

**File:** `packages/x-charts/src/SparkLineChart/SparkLineChart.tsx`
**Lines:** 212-220

**Current code:**
```typescript
const clipPathOffset = React.useMemo(
  () => ({
    top: clipAreaOffset?.top ?? 1,
    right: clipAreaOffset?.right ?? 1,
    bottom: clipAreaOffset?.bottom ?? 1,
    left: clipAreaOffset?.left ?? 1,
  }),
  [clipAreaOffset?.bottom, clipAreaOffset?.left, clipAreaOffset?.right, clipAreaOffset?.top],
);
```

**Description:** Four `clipAreaOffset?.prop ?? 1` patterns with the default value `1` repeated four times. The dependency array also repeats each property access. This could be simplified with a spread.

**Suggested fix:**
```typescript
const clipPathOffset = React.useMemo(
  () => ({ top: 1, right: 1, bottom: 1, left: 1, ...clipAreaOffset }),
  [clipAreaOffset],
);
```

This approach is shorter and also simpler (one dependency instead of four). The semantics are equivalent because if `clipAreaOffset` properties are provided they override the defaults.

**Estimated gzip savings:** 25-35 bytes

---

## Finding 16: SparkLineChart Accesses `props.slots` and `props.slotProps` After Destructuring

**File:** `packages/x-charts/src/SparkLineChart/SparkLineChart.tsx`
**Lines:** 234, 290, 320

**Current code (after destructuring `slots` and `slotProps` on lines 194-195):**
```typescript
// Line 234
const Tooltip = props.slots?.tooltip ?? ChartsTooltip;
// Line 290
(!showTooltip || slotProps?.tooltip?.trigger !== 'axis') &&
// Line 320
{showTooltip && <Tooltip {...props.slotProps?.tooltip} />}
```

**Description:** `slots` and `slotProps` are destructured from `props` on lines 194-195, but `props.slots?.tooltip` and `props.slotProps?.tooltip` are used directly. This is inconsistent and slightly larger than using the destructured variables.

**Suggested fix:** Use destructured variables consistently:
```typescript
const Tooltip = slots?.tooltip ?? ChartsTooltip;
// ...
{showTooltip && <Tooltip {...slotProps?.tooltip} />}
```

**Estimated gzip savings:** 8-12 bytes

---

## Finding 17: `React.Fragment` Instead of Short Syntax in ScatterPlot and BatchScatter

**File:** `packages/x-charts/src/ScatterChart/ScatterPlot.tsx`, line 73 and 104
**File:** `packages/x-charts/src/ScatterChart/BatchScatter.tsx`, lines 105, 185, 202

**Current code:**
```typescript
// ScatterPlot.tsx
<React.Fragment>
  {seriesOrder.map(...)}
</React.Fragment>

// BatchScatter.tsx
return <React.Fragment>{children}</React.Fragment>;
// ...
<React.Fragment>
  <Group ...>
  ...
</React.Fragment>
```

**Suggested fix:** Use the short fragment syntax `<>...</>`:
```typescript
<>
  {seriesOrder.map(...)}
</>
```

**Description:** `React.Fragment` compiles to `React.createElement(React.Fragment, null, ...)` while `<>` compiles to `React.createElement(React.Fragment, null, ...)` in older JSX transforms but to `_jsx(_Fragment, ...)` in the new JSX transform (shorter). Even without the new transform, the minified source replaces `React.Fragment` with a variable reference, but the initial source string repetition still affects gzip for source maps.

**Estimated gzip savings:** 10-20 bytes (across all occurrences)

---

## Finding 18: Repeated `props.slotProps?.legend?.position` and `props.slotProps?.legend?.direction`

**File:** `packages/x-charts/src/ScatterChart/useScatterChartProps.ts`
**Lines:** 119-120

**Current code:**
```typescript
const chartsWrapperProps: Omit<ChartsWrapperProps, 'children'> = {
  sx,
  legendPosition: props.slotProps?.legend?.position,
  legendDirection: props.slotProps?.legend?.direction,
  hideLegend: props.hideLegend ?? false,
};
```

**Description:** `props.slotProps?.legend` is accessed twice. Since `slotProps` is already destructured, `props.` prefix is unnecessary, and the legend object could be extracted.

**Suggested fix:**
```typescript
const legend = slotProps?.legend;
const chartsWrapperProps: Omit<ChartsWrapperProps, 'children'> = {
  sx,
  legendPosition: legend?.position,
  legendDirection: legend?.direction,
  hideLegend: hideLegend ?? false,
};
```

**Estimated gzip savings:** 8-12 bytes

---

## Finding 19: `hideLegend ?? false` When Boolean Default Is Implicit

**File:** `packages/x-charts/src/ScatterChart/useScatterChartProps.ts`
**Line:** 121

**Current code:**
```typescript
hideLegend: props.hideLegend ?? false,
```

**Description:** `hideLegend` is typed as `boolean | undefined`. When `undefined`, `?? false` returns `false`. But JSX/React treats `undefined` as falsy already, so if `hideLegend` is used in a boolean context downstream, this nullish coalescing is redundant.

**Suggested fix (if downstream treats undefined as false):**
```typescript
hideLegend: hideLegend,
// or via shorthand:
hideLegend,
```

**Estimated gzip savings:** 3-5 bytes

---

## Finding 20: Unnecessary `shouldForwardProp: undefined` in BatchScatter Styled Component

**File:** `packages/x-charts/src/ScatterChart/BatchScatter.tsx`
**Lines:** 110-112

**Current code:**
```typescript
const Group = styled('g', {
  slot: 'internal',
  shouldForwardProp: undefined,
})({
```

**Description:** Passing `shouldForwardProp: undefined` is equivalent to not passing it at all. The MUI `styled` function will use its default behavior.

**Suggested fix:**
```typescript
const Group = styled('g', {
  slot: 'internal',
})({
```

**Estimated gzip savings:** 5-8 bytes

---

## Finding 21: `tempPath.length > 0` Check Is Always True

**File:** `packages/x-charts/src/ScatterChart/BatchScatter.tsx`
**Lines:** 73-77

**Current code:**
```typescript
for (const [fill, tempPath] of temporaryPaths.entries()) {
  if (tempPath.length > 0) {
    appendAtKey(paths, fill, tempPath.join(''));
  }
}
```

**Description:** Entries are only added to `temporaryPaths` via `appendAtKey` (line 65), which always adds at least one element. And entries are only deleted when they reach `MAX_POINTS_PER_PATH` (lines 67-69), which removes them entirely. So any entry remaining in `temporaryPaths` at this point will always have `length > 0`. The check is redundant.

**Suggested fix:**
```typescript
for (const [fill, tempPath] of temporaryPaths.entries()) {
  appendAtKey(paths, fill, tempPath.join(''));
}
```

**Estimated gzip savings:** 3-5 bytes

---

## Finding 22: Verbose `Props.tooltip` Access Pattern in ScatterChart

**File:** `packages/x-charts/src/ScatterChart/ScatterChart.tsx`
**Lines:** 161, 167, 181

**Current code:**
```typescript
const Tooltip = props.slots?.tooltip ?? ChartsTooltip;
const Toolbar = props.slots?.toolbar;
// ...
{props.showToolbar && Toolbar ? <Toolbar {...props.slotProps?.toolbar} /> : null}
// ...
{!props.loading && <Tooltip trigger="item" {...props.slotProps?.tooltip} />}
```

**Description:** The component destructures many props via `useScatterChartProps` but then accesses `props.slots`, `props.slotProps`, `props.showToolbar`, `props.loading`, and `props.hideLegend` directly from `props` rather than from the destructured result. This means `props.` is repeated 6 times when the values are already available.

**Suggested fix:** Destructure these remaining values:
```typescript
const { slots, slotProps, showToolbar, loading, hideLegend } = props;
const Tooltip = slots?.tooltip ?? ChartsTooltip;
const Toolbar = slots?.toolbar;
// ...
{showToolbar && Toolbar ? <Toolbar {...slotProps?.toolbar} /> : null}
{!hideLegend && <ChartsLegend {...legendProps} />}
// ...
{!loading && <Tooltip trigger="item" {...slotProps?.tooltip} />}
```

**Estimated gzip savings:** 15-20 bytes

---

## Finding 23: Verbose `disableClipping ? null : <ChartsClipPath ...>` in SparkLineChart

**File:** `packages/x-charts/src/SparkLineChart/SparkLineChart.tsx`
**Line:** 316

**Current code:**
```typescript
{disableClipping ? null : <ChartsClipPath id={clipPathId} offset={clipPathOffset} />}
```

**Suggested fix:**
```typescript
{!disableClipping && <ChartsClipPath id={clipPathId} offset={clipPathOffset} />}
```

**Estimated gzip savings:** 2-4 bytes

---

## Summary Table

| # | Finding | File(s) | Type | Est. Gzip Savings |
|---|---------|---------|------|-------------------|
| 1 | Duplicate extremum getter logic | extremums.ts | Duplicate Code | 60-90 bytes |
| 2 | Repeated color getter preamble | getColor.ts | Duplicate Code | 30-50 bytes |
| 3 | Duplicate getValueToPositionMapper calls | BatchScatter.tsx | Duplicate Code | 20-30 bytes |
| 4 | Duplicate colorGetter ternary | BatchScatter.tsx | Duplicate Code | 10-15 bytes |
| 5 | Verbose `!== true` check | useScatterChartProps.ts | Verbose Pattern | 5-8 bytes |
| 6 | Unnecessary `as const` | useScatterChartProps.ts | Unnecessary Assertion | 3-5 bytes |
| 7 | Repeated slots/slotProps pass-through | useScatterChartProps.ts | String Repetition | 15-25 bytes |
| 8 | Redundant intermediate variable | ScatterPlot.tsx | Verbose Pattern | 8-12 bytes |
| 9 | Repeated `series[seriesId]` and axis lookups | ScatterPlot.tsx | Duplicate Code | 15-25 bytes |
| 10 | Redundant self-import alias | ScatterPlot.tsx | Dead Code | 2-3 bytes |
| 11 | Unnecessary optional chaining after guard | FocusedScatterMark.tsx | Verbose Pattern | 1-2 bytes |
| 12 | Repeated `'scatter'` type literal | Multiple | String Repetition | 5-10 bytes |
| 13 | Verbose disableAxisListener expression | SparkLineChart.tsx | Verbose Pattern | 2-4 bytes |
| 14 | Unnecessary useMemo for trivial objects | SparkLineChart.tsx | Unnecessary Code | 30-40 bytes |
| 15 | Verbose clipPathOffset useMemo | SparkLineChart.tsx | Verbose Pattern | 25-35 bytes |
| 16 | Inconsistent props access after destructuring | SparkLineChart.tsx | String Repetition | 8-12 bytes |
| 17 | `React.Fragment` vs short syntax | ScatterPlot, BatchScatter | Verbose Pattern | 10-20 bytes |
| 18 | Repeated `props.slotProps?.legend?` access | useScatterChartProps.ts | String Repetition | 8-12 bytes |
| 19 | Redundant `?? false` on boolean | useScatterChartProps.ts | Verbose Pattern | 3-5 bytes |
| 20 | `shouldForwardProp: undefined` | BatchScatter.tsx | Dead Code | 5-8 bytes |
| 21 | Redundant `tempPath.length > 0` check | BatchScatter.tsx | Dead Code | 3-5 bytes |
| 22 | Verbose `props.` access in ScatterChart | ScatterChart.tsx | String Repetition | 15-20 bytes |
| 23 | Verbose ternary for disableClipping | SparkLineChart.tsx | Verbose Pattern | 2-4 bytes |

**Total estimated gzip savings: ~285-435 bytes**
