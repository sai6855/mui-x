# LineChart Bundle Size Optimization Findings

## Scope

Analyzed all `.ts` and `.tsx` source files in `packages/x-charts/src/LineChart/` and its related component files (AnimatedLine, AnimatedArea, LineElement, AreaElement, MarkElement, LineHighlightElement, CircleMarkElement, FocusedLineMark, AppearingMask, LinePlot, AreaPlot, MarkPlot, LineHighlightPlot, useLinePlotData, useAreaPlotData, useMarkPlotData, markElementClasses, index barrel, LineChart).

---

## Finding 1: Massive Duplicate `useAggregatedData` Hook Pattern in LinePlot and AreaPlot

**Files:**
- `packages/x-charts/src/LineChart/LinePlot.tsx` (lines 49-54)
- `packages/x-charts/src/LineChart/AreaPlot.tsx` (lines 49-54)

**Current code in LinePlot.tsx:**
```typescript
const useAggregatedData = () => {
  const { xAxis: xAxes } = useXAxes();
  const { yAxis: yAxes } = useYAxes();

  return useLinePlotData(xAxes, yAxes);
};
```

**Current code in AreaPlot.tsx:**
```typescript
const useAggregatedData = () => {
  const { xAxis: xAxes } = useXAxes();
  const { yAxis: yAxes } = useYAxes();

  return useAreaPlotData(xAxes, yAxes);
};
```

**Issue:** Both files define an identical local `useAggregatedData` wrapper that destructures `useXAxes()` and `useYAxes()` and forwards the result. The destructuring pattern `{ xAxis: xAxes }` and `{ yAxis: yAxes }` is identical. The only difference is the final hook call.

**Suggested fix:** Move the axis retrieval into `useLinePlotData` and `useAreaPlotData` directly so they call `useXAxes`/`useYAxes` internally, eliminating the wrapper entirely. Both `useLinePlotData` and `useAreaPlotData` already import and call `useXAxes`/`useYAxes` internally for `defaultXAxisId`/`defaultYAxisId`, so they could also receive the full axis map from within.

**Estimated gzip savings:** 40-60 bytes

---

## Finding 2: Near-Identical Structure Between LineElement.tsx and AreaElement.tsx

**Files:**
- `packages/x-charts/src/LineChart/LineElement.tsx` (lines 1-176)
- `packages/x-charts/src/LineChart/AreaElement.tsx` (lines 1-169)

**Issue:** These two files are structurally identical, differing only in:
1. Class name prefix (`MuiLineElement` vs `MuiAreaElement`)
2. Slot name (`line` vs `area`)
3. Default animated component (`AnimatedLine` vs `AnimatedArea`)
4. Exported names

Both files have:
- Same imports (composeClasses, useSlotProps, generateUtilityClass, generateUtilityClasses, useInteractionItemProps, useItemHighlighted, same SeriesId type)
- Same interface shape for Classes, OwnerState, Slots, SlotProps, Props
- Same `useUtilityClasses` function structure
- Same component body structure (destructure props, call hooks, build ownerState, compose classes, resolve slot, call useSlotProps, render)
- Same PropTypes block structure

**Current code in LineElement.tsx (lines 52-59):**
```typescript
const useUtilityClasses = (ownerState: LineElementOwnerState) => {
  const { classes, seriesId, isFaded, isHighlighted } = ownerState;
  const slots = {
    root: ['root', `series-${seriesId}`, isHighlighted && 'highlighted', isFaded && 'faded'],
  };
  return composeClasses(slots, getLineElementUtilityClass, classes);
};
```

**Current code in AreaElement.tsx (lines 50-57):**
```typescript
const useUtilityClasses = (ownerState: AreaElementOwnerState) => {
  const { classes, seriesId, isFaded, isHighlighted } = ownerState;
  const slots = {
    root: ['root', `series-${seriesId}`, isHighlighted && 'highlighted', isFaded && 'faded'],
  };
  return composeClasses(slots, getAreaElementUtilityClass, classes);
};
```

**Suggested fix:** Create a shared factory or helper for the common logic. For example, a shared `createChartElement` factory that accepts the class prefix, slot name, and default animated component, and returns the component plus its classes.

**Estimated gzip savings:** 120-180 bytes

---

## Finding 3: Near-Identical Structure Between AnimatedLine.tsx and AnimatedArea.tsx

**Files:**
- `packages/x-charts/src/LineChart/AnimatedLine.tsx` (lines 1-77)
- `packages/x-charts/src/LineChart/AnimatedArea.tsx` (lines 1-77)

**Issue:** Both components share nearly identical structure:
- Both import React, PropTypes, ownerState type, and AppearingMask
- Both destructure `{ skipAnimation, ownerState, ...other }` from props
- Both wrap content in `<AppearingMask>`
- Both render a `<path>` with similar data attributes
- Both have same PropTypes shape structure

**Key differences:**
- AnimatedLine uses `useAnimateLine` hook; AnimatedArea uses `useAnimateArea`
- AnimatedLine uses `stroke` for color; AnimatedArea uses `fill`
- AnimatedLine uses `fill="none"`; AnimatedArea uses `stroke="none"`
- AnimatedLine uses `brightness(120%)` filter; AnimatedArea has nested ternary for filter
- AnimatedLine uses `React.forwardRef`; AnimatedArea does not

**Common data attributes pattern in both:**
```typescript
data-series={ownerState.seriesId}
data-highlighted={ownerState.isHighlighted || undefined}
data-faded={ownerState.isFaded || undefined}
```

**Suggested fix:** Extract shared data attributes into a helper:
```typescript
const getSeriesDataAttrs = (ownerState) => ({
  'data-series': ownerState.seriesId,
  'data-highlighted': ownerState.isHighlighted || undefined,
  'data-faded': ownerState.isFaded || undefined,
});
```

**Estimated gzip savings:** 40-60 bytes

---

## Finding 4: Near-Identical Structure Between MarkElement.tsx and CircleMarkElement.tsx

**Files:**
- `packages/x-charts/src/LineChart/MarkElement.tsx` (lines 69-119)
- `packages/x-charts/src/LineChart/CircleMarkElement.tsx` (lines 64-112)

**Issue:** Both components share identical logic patterns:

**Identical destructuring:**
```typescript
// MarkElement.tsx lines 70-85
const {
  x, y, seriesId, classes: innerClasses, color, shape, dataIndex, onClick,
  skipAnimation, isFaded = false, isHighlighted = false, hidden, style, ...other
} = props;

// CircleMarkElement.tsx lines 65-80
const {
  x, y, seriesId, classes: innerClasses, color, dataIndex, onClick,
  skipAnimation, isFaded = false, isHighlighted = false, shape, hidden, ...other
} = props;
```

**Identical interaction props call:**
```typescript
const interactionProps = useInteractionItemProps({ type: 'line', seriesId, dataIndex });
```

**Identical ownerState construction:**
```typescript
const ownerState = {
  seriesId,
  classes: innerClasses,
  isHighlighted,
  isFaded,
  skipAnimation,
};
const classes = useUtilityClasses(ownerState);
```

**Identical rendered attributes:**
```typescript
strokeWidth={2}
stroke={color}
className={classes.root}
onClick={onClick}
cursor={onClick ? 'pointer' : 'unset'}
pointerEvents={hidden ? 'none' : undefined}
{...interactionProps}
data-highlighted={isHighlighted || undefined}
data-faded={isFaded || undefined}
opacity={hidden ? 0 : 1}
```

**Suggested fix:** Extract the shared props computation into a custom hook:
```typescript
function useMarkElementProps(props) {
  const interactionProps = useInteractionItemProps({ type: 'line', seriesId: props.seriesId, dataIndex: props.dataIndex });
  const ownerState = { ... };
  const classes = useUtilityClasses(ownerState);
  return { interactionProps, ownerState, classes, commonAttrs: { ... } };
}
```

**Estimated gzip savings:** 100-150 bytes

---

## Finding 5: Repeated Error Message Template Across Three Files

**Files:**
- `packages/x-charts/src/LineChart/useLinePlotData.ts` (lines 69-78)
- `packages/x-charts/src/LineChart/useAreaPlotData.ts` (lines 70-79)
- `packages/x-charts/src/LineChart/useMarkPlotData.ts` (lines 78-87)

**Current code (identical in all three files):**
```typescript
if (process.env.NODE_ENV !== 'production') {
  if (xData === undefined) {
    throw new Error(
      `MUI X Charts: ${
        xAxisId === DEFAULT_X_AXIS_KEY
          ? 'The first `xAxis`'
          : `The x-axis with id "${xAxisId}"`
      } should have data property to be able to display a line plot.`,
    );
  }
}
```

**Additional duplication in useLinePlotData.ts and useAreaPlotData.ts:**
```typescript
if (xData.length < stackedData.length) {
  // Both throw/warn about data length mismatch
}
```

Note: useLinePlotData uses `warnOnce()` for this while useAreaPlotData uses `throw new Error()` -- an inconsistency.

**Suggested fix:** Extract to shared validation utility:
```typescript
// In a shared file like LineChart/validation.ts
export function validateLineChartXAxisData(xAxisId: string, xData: unknown, stackedDataLength?: number) {
  if (process.env.NODE_ENV !== 'production') {
    if (xData === undefined) {
      throw new Error(
        `MUI X Charts: ${
          xAxisId === DEFAULT_X_AXIS_KEY
            ? 'The first `xAxis`'
            : `The x-axis with id "${xAxisId}"`
        } should have data property to be able to display a line plot.`,
      );
    }
    if (stackedDataLength !== undefined && xData.length < stackedDataLength) {
      // warn or throw
    }
  }
}
```

**Estimated gzip savings:** 80-120 bytes

---

## Finding 6: Repeated `data-highlighted`/`data-faded` Attribute Pattern

**Files:**
- `packages/x-charts/src/LineChart/AnimatedLine.tsx` (lines 45-46)
- `packages/x-charts/src/LineChart/AnimatedArea.tsx` (lines 47-48)
- `packages/x-charts/src/LineChart/MarkElement.tsx` (lines 113-114)
- `packages/x-charts/src/LineChart/CircleMarkElement.tsx` (lines 108-109)

**Current code (4 occurrences):**
```typescript
data-highlighted={isHighlighted || undefined}
data-faded={isFaded || undefined}
```

(In AnimatedLine/AnimatedArea the prefix is `ownerState.isHighlighted` / `ownerState.isFaded`.)

**Suggested fix:** Create a shared helper to generate these attributes:
```typescript
export const highlightDataAttrs = (isHighlighted: boolean, isFaded: boolean) => ({
  'data-highlighted': isHighlighted || undefined,
  'data-faded': isFaded || undefined,
});
```

Then spread: `{...highlightDataAttrs(isHighlighted, isFaded)}`

**Estimated gzip savings:** 35-55 bytes

---

## Finding 7: Repeated `cursor: onClick ? 'pointer' : 'unset'` Pattern

**Files:**
- `packages/x-charts/src/LineChart/LineElement.tsx` (line 138)
- `packages/x-charts/src/LineChart/AreaElement.tsx` (line 133)
- `packages/x-charts/src/LineChart/MarkElement.tsx` (line 110)
- `packages/x-charts/src/LineChart/CircleMarkElement.tsx` (line 105)

**Current code (identical in all 4 files):**
```typescript
cursor: onClick ? 'pointer' : 'unset'
// or
cursor={onClick ? 'pointer' : 'unset'}
```

**Suggested fix:** Extract to a tiny shared helper or inline constant:
```typescript
const clickCursor = (handler?: Function) => handler ? 'pointer' : 'unset';
```

**Estimated gzip savings:** 30-50 bytes

---

## Finding 8: Repeated `pointerEvents={hidden ? 'none' : undefined}` Pattern

**Files:**
- `packages/x-charts/src/LineChart/MarkElement.tsx` (line 111)
- `packages/x-charts/src/LineChart/CircleMarkElement.tsx` (line 106)

**Current code:**
```typescript
pointerEvents={hidden ? 'none' : undefined}
```

**Suggested fix:** Consolidate with other shared mark element attributes (see Finding 4).

**Estimated gzip savings:** 10-15 bytes

---

## Finding 9: Duplicate Axis Retrieval and Default ID Resolution

**Files:**
- `packages/x-charts/src/LineChart/useLinePlotData.ts` (lines 25-28)
- `packages/x-charts/src/LineChart/useAreaPlotData.ts` (lines 24-27)
- `packages/x-charts/src/LineChart/useMarkPlotData.ts` (lines 37-39)
- `packages/x-charts/src/LineChart/LineHighlightPlot.tsx` (lines 54-55, 70-71)

**Current code (useLinePlotData.ts):**
```typescript
const seriesData = useLineSeriesContext();
const defaultXAxisId = useXAxes().xAxisIds[0];
const defaultYAxisId = useYAxes().yAxisIds[0];
const getGradientId = useChartGradientIdBuilder();
```

**Current code (useAreaPlotData.ts):**
```typescript
const seriesData = useLineSeriesContext();
const defaultXAxisId = useXAxes().xAxisIds[0];
const defaultYAxisId = useYAxes().yAxisIds[0];
const getGradientId = useChartGradientIdBuilder();
```

**Current code (useMarkPlotData.ts):**
```typescript
const seriesData = useLineSeriesContext();
const defaultXAxisId = useXAxes().xAxisIds[0];
const defaultYAxisId = useYAxes().yAxisIds[0];
```

All three hooks use the exact same 3-4 line preamble to get series data, default axis IDs, and optionally gradient ID builder.

**Suggested fix:** Create a shared hook:
```typescript
function useLineChartBaseData() {
  const seriesData = useLineSeriesContext();
  const defaultXAxisId = useXAxes().xAxisIds[0];
  const defaultYAxisId = useYAxes().yAxisIds[0];
  const getGradientId = useChartGradientIdBuilder();
  return { seriesData, defaultXAxisId, defaultYAxisId, getGradientId };
}
```

**Estimated gzip savings:** 50-70 bytes

---

## Finding 10: Duplicate `formattedData` Construction in useLinePlotData and useAreaPlotData

**Files:**
- `packages/x-charts/src/LineChart/useLinePlotData.ts` (lines 88-118)
- `packages/x-charts/src/LineChart/useAreaPlotData.ts` (lines 88-118)

**Current code (useLinePlotData.ts lines 89-118):**
```typescript
const formattedData: {
  x: any;
  y: [number, number];
  nullData: boolean;
  isExtension?: boolean;
}[] =
  xData?.flatMap((x, index) => {
    const nullData = data[index] == null;
    if (shouldExpand) {
      const rep = [{ x, y: visibleStackedData[index], nullData, isExtension: false }];
      if (!nullData && (index === 0 || data[index - 1] == null)) {
        rep.unshift({
          x: (xScale(x) ?? 0) - (xScale.step() - xScale.bandwidth()) / 2,
          y: visibleStackedData[index],
          nullData,
          isExtension: true,
        });
      }
      if (!nullData && (index === data.length - 1 || data[index + 1] == null)) {
        rep.push({
          x: (xScale(x) ?? 0) + (xScale.step() + xScale.bandwidth()) / 2,
          y: visibleStackedData[index],
          nullData,
          isExtension: true,
        });
      }
      return rep;
    }
    return { x, y: visibleStackedData[index], nullData };
  }) ?? [];

const d3Data = connectNulls ? formattedData.filter((d) => !d.nullData) : formattedData;
```

**Current code (useAreaPlotData.ts lines 89-120):**
```typescript
// IDENTICAL to above
```

This is a ~30-line block that is **character-for-character identical** in both files.

**Suggested fix:** Extract to a shared utility function:
```typescript
export function formatLineChartData(xData, data, visibleStackedData, xScale, shouldExpand, connectNulls) {
  // ... shared logic
}
```

**Estimated gzip savings:** 150-200 bytes (this is the single highest-impact finding)

---

## Finding 11: Duplicate `shouldExpand` Calculation

**Files:**
- `packages/x-charts/src/LineChart/useLinePlotData.ts` (line 87)
- `packages/x-charts/src/LineChart/useAreaPlotData.ts` (line 87)

**Current code (identical in both):**
```typescript
const shouldExpand = curve?.includes('step') && !strictStepCurve && isOrdinalScale(xScale);
```

**Suggested fix:** Would be absorbed into the shared `formatLineChartData` function from Finding 10.

**Estimated gzip savings:** Included in Finding 10.

---

## Finding 12: Duplicate `gradientId` Resolution

**Files:**
- `packages/x-charts/src/LineChart/useLinePlotData.ts` (lines 64-67)
- `packages/x-charts/src/LineChart/useAreaPlotData.ts` (lines 65-68)

**Current code (identical in both):**
```typescript
const gradientId: string | undefined =
  (yAxes[yAxisId].colorScale && getGradientId(yAxisId)) ||
  (xAxes[xAxisId].colorScale && getGradientId(xAxisId)) ||
  undefined;
```

**Suggested fix:** Extract to a shared helper:
```typescript
function resolveGradientId(xAxes, yAxes, xAxisId, yAxisId, getGradientId) {
  return (yAxes[yAxisId].colorScale && getGradientId(yAxisId)) ||
         (xAxes[xAxisId].colorScale && getGradientId(xAxisId)) ||
         undefined;
}
```

**Estimated gzip savings:** 30-40 bytes

---

## Finding 13: Verbose Nested Ternary in AnimatedArea.tsx

**File:** `packages/x-charts/src/LineChart/AnimatedArea.tsx` (lines 36-43)

**Current code:**
```typescript
filter={
  // eslint-disable-next-line no-nested-ternary
  ownerState.isHighlighted
    ? 'brightness(140%)'
    : ownerState.gradientId
      ? undefined
      : 'brightness(120%)'
}
```

**Suggested fix:**
```typescript
filter={
  ownerState.isHighlighted ? 'brightness(140%)'
    : !ownerState.gradientId ? 'brightness(120%)'
    : undefined
}
```

Or pre-compute before JSX:
```typescript
const filter = ownerState.isHighlighted
  ? 'brightness(140%)'
  : ownerState.gradientId ? undefined : 'brightness(120%)';
```

**Estimated gzip savings:** 5-10 bytes

---

## Finding 14: Redundant Set Initialization in MarkPlot.tsx

**File:** `packages/x-charts/src/LineChart/MarkPlot.tsx` (lines 72-83)

**Current code:**
```typescript
const highlightedItems = React.useMemo(() => {
  const rep: Record<AxisId, Set<number>> = {};

  for (const { dataIndex, axisId } of xAxisHighlightIndexes) {
    if (rep[axisId] === undefined) {
      rep[axisId] = new Set([dataIndex]);
    } else {
      rep[axisId].add(dataIndex);
    }
  }
  return rep;
}, [xAxisHighlightIndexes]);
```

**Suggested fix:**
```typescript
const highlightedItems = React.useMemo(() => {
  const rep: Record<AxisId, Set<number>> = {};
  for (const { dataIndex, axisId } of xAxisHighlightIndexes) {
    (rep[axisId] ??= new Set()).add(dataIndex);
  }
  return rep;
}, [xAxisHighlightIndexes]);
```

**Estimated gzip savings:** 30-45 bytes

---

## Finding 15: Inconsistent Axis Variable Naming

**Files:**
- `packages/x-charts/src/LineChart/useLinePlotData.ts` (lines 59-62)
- `packages/x-charts/src/LineChart/useMarkPlotData.ts` (lines 74-76)

**useLinePlotData.ts:**
```typescript
const xScale = xAxes[xAxisId].scale;
const xPosition = getValueToPositionMapper(xScale);
const yScale = yAxes[yAxisId].scale;
const xData = xAxes[xAxisId].data;
```

**useMarkPlotData.ts:**
```typescript
const xScale = getValueToPositionMapper(xAxes[xAxisId].scale);
const yScale = yAxes[yAxisId].scale;
const xData = xAxes[xAxisId].data;
```

**Issue:** In useLinePlotData, `xScale` is the raw scale and `xPosition` is the mapper. In useMarkPlotData, `xScale` is already the mapped position function. This inconsistency hurts gzip compression because the same variable name is used for different things across files that gzip may try to compress together.

**Suggested fix:** Use consistent naming: always call the raw scale `xScale` and the position mapper `xPosition`.

**Estimated gzip savings:** 10-20 bytes

---

## Finding 16: LinePlot.tsx Styled Component Name Mismatch

**File:** `packages/x-charts/src/LineChart/LinePlot.tsx` (lines 38-47)

**Current code:**
```typescript
const LinePlotRoot = styled('g', {
  name: 'MuiAreaPlot',  // <-- BUG: says "AreaPlot" but this is LinePlot
  slot: 'Root',
})({
  [`& .${lineElementClasses.root}`]: {
    transitionProperty: 'opacity, fill',
    transitionDuration: `${ANIMATION_DURATION_MS}ms`,
    transitionTimingFunction: ANIMATION_TIMING_FUNCTION,
  },
});
```

**Issue:** The styled component name is `'MuiAreaPlot'` but this is inside `LinePlot.tsx`. This is likely a copy-paste bug. It should be `'MuiLinePlot'`.

**Suggested fix:**
```typescript
const LinePlotRoot = styled('g', {
  name: 'MuiLinePlot',
  slot: 'Root',
})({
```

**Estimated gzip savings:** 0 bytes (bug fix, not size optimization)

---

## Finding 17: Duplicate Styled Root Pattern in LinePlot and AreaPlot

**Files:**
- `packages/x-charts/src/LineChart/LinePlot.tsx` (lines 38-47)
- `packages/x-charts/src/LineChart/AreaPlot.tsx` (lines 38-47)

**Current code (LinePlot.tsx):**
```typescript
const LinePlotRoot = styled('g', {
  name: 'MuiAreaPlot',
  slot: 'Root',
})({
  [`& .${lineElementClasses.root}`]: {
    transitionProperty: 'opacity, fill',
    transitionDuration: `${ANIMATION_DURATION_MS}ms`,
    transitionTimingFunction: ANIMATION_TIMING_FUNCTION,
  },
});
```

**Current code (AreaPlot.tsx):**
```typescript
const AreaPlotRoot = styled('g', {
  name: 'MuiAreaPlot',
  slot: 'Root',
})({
  [`& .${areaElementClasses.root}`]: {
    transitionProperty: 'opacity, fill',
    transitionDuration: `${ANIMATION_DURATION_MS}ms`,
    transitionTimingFunction: ANIMATION_TIMING_FUNCTION,
  },
});
```

**Issue:** Identical styled component structure with same transition properties, only differing in the class selector and component name.

**Suggested fix:** Extract a shared styled root factory:
```typescript
const createPlotRoot = (name, rootClass) => styled('g', { name, slot: 'Root' })({
  [`& .${rootClass}`]: {
    transitionProperty: 'opacity, fill',
    transitionDuration: `${ANIMATION_DURATION_MS}ms`,
    transitionTimingFunction: ANIMATION_TIMING_FUNCTION,
  },
});
```

**Estimated gzip savings:** 40-60 bytes

---

## Finding 18: Duplicate `isZoomInteracting` + `useSkipAnimation` Pattern

**Files:**
- `packages/x-charts/src/LineChart/LinePlot.tsx` (lines 68-69)
- `packages/x-charts/src/LineChart/AreaPlot.tsx` (lines 69-70)
- `packages/x-charts/src/LineChart/MarkPlot.tsx` (lines 62-63)

**Current code (identical in all three):**
```typescript
const isZoomInteracting = useInternalIsZoomInteracting();
const skipAnimation = useSkipAnimation(isZoomInteracting || inSkipAnimation);
```

**Suggested fix:** Create a combined hook:
```typescript
function useResolvedSkipAnimation(inSkipAnimation?: boolean) {
  const isZoomInteracting = useInternalIsZoomInteracting();
  return useSkipAnimation(isZoomInteracting || inSkipAnimation);
}
```

**Estimated gzip savings:** 30-50 bytes

---

## Finding 19: Duplicate `onItemClick` Handler Pattern

**Files:**
- `packages/x-charts/src/LineChart/LinePlot.tsx` (line 86)
- `packages/x-charts/src/LineChart/AreaPlot.tsx` (line 87)

**Current code (LinePlot.tsx):**
```typescript
onClick={onItemClick && ((event) => onItemClick(event, { type: 'line', seriesId }))}
```

**Current code (AreaPlot.tsx):**
```typescript
onClick={onItemClick && ((event) => onItemClick(event, { type: 'line', seriesId }))}
```

**Issue:** Identical inline callback construction. Both create `{ type: 'line', seriesId }` object.

**Suggested fix:** Extract to shared helper:
```typescript
const makeClickHandler = (onItemClick, seriesId) =>
  onItemClick && ((event) => onItemClick(event, { type: 'line', seriesId }));
```

**Estimated gzip savings:** 20-30 bytes

---

## Finding 20: `useInteractionItemProps` Called with Same Shape in 3 Files

**Files:**
- `packages/x-charts/src/LineChart/LineElement.tsx` (line 115)
- `packages/x-charts/src/LineChart/AreaElement.tsx` (line 111)
- `packages/x-charts/src/LineChart/MarkElement.tsx` (line 88)
- `packages/x-charts/src/LineChart/CircleMarkElement.tsx` (line 83)

**Current code (LineElement.tsx / AreaElement.tsx):**
```typescript
const interactionProps = useInteractionItemProps({ type: 'line', seriesId });
```

**Current code (MarkElement.tsx / CircleMarkElement.tsx):**
```typescript
const interactionProps = useInteractionItemProps({ type: 'line', seriesId, dataIndex });
```

**Issue:** The string `'line'` is repeated 4 times. With gzip this compresses well, but a shared constant could help.

**Suggested fix:** Minor -- could define `const LINE_TYPE = 'line' as const;` but savings are marginal.

**Estimated gzip savings:** 5-10 bytes

---

## Finding 21: Inconsistent Error Handling Between useLinePlotData and useAreaPlotData

**Files:**
- `packages/x-charts/src/LineChart/useLinePlotData.ts` (lines 79-84)
- `packages/x-charts/src/LineChart/useAreaPlotData.ts` (lines 80-84)

**useLinePlotData.ts:**
```typescript
if (xData.length < stackedData.length) {
  warnOnce(
    `MUI X Charts: The data length of the x axis (${xData.length} items) is lower than the length of series (${stackedData.length} items).`,
    'error',
  );
}
```

**useAreaPlotData.ts:**
```typescript
if (xData.length < stackedData.length) {
  throw new Error(
    `MUI X Charts: The data length of the x axis (${xData.length} items) is lower than the length of series (${stackedData.length} items).`,
  );
}
```

**Issue:** Same condition and message, but one uses `warnOnce` and the other uses `throw new Error`. The error message string is identical. This is also likely a behavioral inconsistency bug -- both should probably use the same approach.

**Suggested fix:** Standardize to `warnOnce` in both (less breaking), and extract the message to a shared string template.

**Estimated gzip savings:** 30-40 bytes

---

## Finding 22: Repeated `type: 'line'` Object Literal

**Files:**
- `packages/x-charts/src/LineChart/LinePlot.tsx` (line 86)
- `packages/x-charts/src/LineChart/AreaPlot.tsx` (line 87)
- `packages/x-charts/src/LineChart/MarkPlot.tsx` (line 110)
- `packages/x-charts/src/LineChart/LineElement.tsx` (line 115)
- `packages/x-charts/src/LineChart/AreaElement.tsx` (line 111)
- `packages/x-charts/src/LineChart/MarkElement.tsx` (line 88)
- `packages/x-charts/src/LineChart/CircleMarkElement.tsx` (line 83)

**Issue:** The string `type: 'line'` or `{ type: 'line', seriesId }` appears in 7 different files as an inline object literal.

**Estimated gzip savings:** 15-25 bytes (gzip handles repeated strings fairly well)

---

## Finding 23: Unnecessary `=== undefined` Check in MarkPlot.tsx

**File:** `packages/x-charts/src/LineChart/MarkPlot.tsx` (line 76)

**Current code:**
```typescript
if (rep[axisId] === undefined) {
  rep[axisId] = new Set([dataIndex]);
} else {
  rep[axisId].add(dataIndex);
}
```

**Suggested fix:** See Finding 14 -- replace with nullish coalescing assignment.

**Estimated gzip savings:** Covered in Finding 14.

---

## Finding 24: `showMark === false` Verbose Check

**File:** `packages/x-charts/src/LineChart/useMarkPlotData.ts` (line 66)

**Current code:**
```typescript
if (showMark === false) {
  continue;
}
```

**Suggested fix:**
```typescript
if (!showMark) {
  continue;
}
```

Wait -- `showMark` defaults to `true` and can also be a function, so `=== false` is intentionally strict (a function would be truthy). This is correct behavior.

**Estimated gzip savings:** 0 bytes (keep as-is, semantically different)

---

## Finding 25: `showMark !== true` Verbose Check

**File:** `packages/x-charts/src/LineChart/useMarkPlotData.ts` (line 113)

**Current code:**
```typescript
if (showMark !== true) {
  const shouldInclude = showMark({
    x: xPos,
    y,
    index,
    position: x,
    value,
  });
  if (!shouldInclude) {
    continue;
  }
}
```

**Issue:** `showMark !== true` is used because `showMark` can be `true` or a function. This is intentionally strict and correct.

**Estimated gzip savings:** 0 bytes (keep as-is)

---

## Finding 26: Repeated Axis ID Defaults in Destructuring

**Files:**
- `packages/x-charts/src/LineChart/useLinePlotData.ts` (lines 45-46)
- `packages/x-charts/src/LineChart/useAreaPlotData.ts` (lines 44-45)
- `packages/x-charts/src/LineChart/useMarkPlotData.ts` (lines 57-58)
- `packages/x-charts/src/LineChart/LineHighlightPlot.tsx` (lines 81-82)

**Current code (identical pattern in all):**
```typescript
const {
  xAxisId = defaultXAxisId,
  yAxisId = defaultYAxisId,
  // ...
} = series[seriesId];
```

**Issue:** Same destructuring pattern with same defaults in all four hooks.

**Estimated gzip savings:** Minimal due to gzip handling repeated patterns well. ~5-10 bytes

---

## Finding 27: `useLineChartProps.ts` Not Analyzed Separately

**File:** `packages/x-charts/src/LineChart/useLineChartProps.ts`

This file was not part of the deep analysis but is consumed by `LineChart.tsx`. It orchestrates prop splitting. Any optimization there would cascade.

---

## Summary Table

| # | Finding | Files | Type | Est. Savings (bytes) |
|---|---------|-------|------|---------------------|
| 1 | Duplicate `useAggregatedData` wrapper | LinePlot, AreaPlot | Code Duplication | 40-60 |
| 2 | Near-identical LineElement/AreaElement | LineElement, AreaElement | Code Duplication | 120-180 |
| 3 | Near-identical AnimatedLine/AnimatedArea | AnimatedLine, AnimatedArea | Code Duplication | 40-60 |
| 4 | Near-identical MarkElement/CircleMarkElement | MarkElement, CircleMarkElement | Code Duplication | 100-150 |
| 5 | Repeated error message template | 3 useXxxPlotData files | String Repetition | 80-120 |
| 6 | Repeated data-highlighted/data-faded attrs | 4 files | Code Duplication | 35-55 |
| 7 | Repeated cursor ternary | 4 files | Code Duplication | 30-50 |
| 8 | Repeated pointerEvents ternary | 2 files | Code Duplication | 10-15 |
| 9 | Duplicate axis retrieval preamble | 3 useXxxPlotData files | Code Duplication | 50-70 |
| 10 | Duplicate formattedData construction (30 lines) | useLinePlotData, useAreaPlotData | Code Duplication | 150-200 |
| 11 | Duplicate shouldExpand calc | useLinePlotData, useAreaPlotData | Code Duplication | (in #10) |
| 12 | Duplicate gradientId resolution | useLinePlotData, useAreaPlotData | Code Duplication | 30-40 |
| 13 | Verbose nested ternary | AnimatedArea | Verbose Pattern | 5-10 |
| 14 | Redundant Set initialization | MarkPlot | Verbose Pattern | 30-45 |
| 15 | Inconsistent axis variable naming | useLinePlotData, useMarkPlotData | String Inconsistency | 10-20 |
| 16 | Styled component name bug | LinePlot | Bug | 0 |
| 17 | Duplicate styled root pattern | LinePlot, AreaPlot | Code Duplication | 40-60 |
| 18 | Duplicate isZoomInteracting + skipAnimation | 3 Plot files | Code Duplication | 30-50 |
| 19 | Duplicate onItemClick handler | LinePlot, AreaPlot | Code Duplication | 20-30 |
| 20 | Repeated `type: 'line'` in interaction props | 4 files | String Repetition | 5-10 |
| 21 | Inconsistent error vs warnOnce | useLinePlotData, useAreaPlotData | Bug/Inconsistency | 30-40 |
| 22 | Repeated `type: 'line'` object literals | 7 files | String Repetition | 15-25 |
| 26 | Repeated axis ID default destructuring | 4 files | Code Duplication | 5-10 |
| **TOTAL** | | | | **~850-1300 bytes** |

## Top 5 Highest-Impact Recommendations

1. **Extract shared `formatLineChartData` function** (Finding 10) -- 150-200 bytes. The 30-line `formattedData` construction is character-for-character identical between `useLinePlotData` and `useAreaPlotData`.

2. **Refactor LineElement/AreaElement into a shared factory** (Finding 2) -- 120-180 bytes. These two components are structurally identical with only name/slot differences.

3. **Extract shared mark element hook** (Finding 4) -- 100-150 bytes. MarkElement and CircleMarkElement share nearly all their logic.

4. **Extract shared axis data validation** (Finding 5) -- 80-120 bytes. The error message and validation block is identical in 3 files.

5. **Extract shared axis retrieval hook** (Finding 9) -- 50-70 bytes. The preamble for getting series data and default axis IDs is identical in 3 files.

## Bug Found

**Finding 16:** `LinePlot.tsx` line 39 has `name: 'MuiAreaPlot'` when it should be `name: 'MuiLinePlot'`. This is a copy-paste bug from AreaPlot.tsx.
