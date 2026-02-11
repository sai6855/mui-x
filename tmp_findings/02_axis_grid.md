# Bundle Size Optimization Findings: Axis, Grid, and Related Components

**Scope:** All `.ts` and `.tsx` files in the following directories under `packages/x-charts/src/`:
- `ChartsAxis/`
- `ChartsAxisHighlight/`
- `ChartsGrid/`
- `ChartsReferenceLine/`
- `ChartsXAxis/`
- `ChartsYAxis/`

---

## Finding 1: ChartsXAxisHighlight and ChartsYAxisHighlight are near-identical duplicates

**Severity:** MAJOR
**Estimated gzip savings:** 400-500 bytes

**Files:**
- `packages/x-charts/src/ChartsAxisHighlight/ChartsXAxisHighlight.tsx` (lines 1-80)
- `packages/x-charts/src/ChartsAxisHighlight/ChartsYAxisHighlight.tsx` (lines 1-80)

**Description:**
These two files are structurally identical. The only differences are:
- X uses `top`/`height` from `useDrawingArea()`, Y uses `left`/`width`
- X uses `selectorChartsHighlightXAxisValue`/`selectorChartXAxis`, Y uses Y equivalents
- X uses `isXInside`, Y uses `isYInside` (conceptually, via offset checks)
- The SVG path `d` strings swap X/Y coordinates

**Current code in ChartsXAxisHighlight.tsx (lines 20-79):**
```tsx
export default function ChartsXHighlight(props: {
  type: ChartsAxisHighlightType;
  classes: ChartsAxisHighlightClasses;
}) {
  const { type, classes } = props;
  const { top, height } = useDrawingArea();
  const store = useStore<[UseChartCartesianAxisSignature, UseChartBrushSignature]>();
  const axisXValues = store.use(selectorChartsHighlightXAxisValue);
  const xAxes = store.use(selectorChartXAxis);

  if (axisXValues.length === 0) {
    return null;
  }

  return axisXValues.map(({ axisId, value }) => {
    const xAxis = xAxes.axis[axisId];
    const xScale = xAxis.scale;
    const getXPosition = getValueToPositionMapper(xScale);
    const isXScaleOrdinal = type === 'band' && value !== null && isOrdinalScale(xScale);

    if (process.env.NODE_ENV !== 'production') {
      const isError = isXScaleOrdinal && xScale(value) === undefined;
      if (isError) {
        console.error(
          [
            `MUI X Charts: The position value provided for the axis is not valid for the current scale.`,
            `This probably means something is wrong with the data passed to the chart.`,
            `The ChartsAxisHighlight component will not be displayed.`,
          ].join('\n'),
        );
      }
    }

    return (
      <React.Fragment key={`${axisId}-${value}`}>
        {isXScaleOrdinal && xScale(value) !== undefined && (
          <ChartsAxisHighlightPath
            d={`M ${xScale(value)! - (xScale.step() - xScale.bandwidth()) / 2} ${top} l ${xScale.step()} 0 l 0 ${height} l ${-xScale.step()} 0 Z`}
            className={classes.root}
            ownerState={{ axisHighlight: 'band' }}
          />
        )}
        {type === 'line' && value !== null && (
          <ChartsAxisHighlightPath
            d={`M ${getXPosition(value)} ${top} L ${getXPosition(value)} ${top + height}`}
            className={classes.root}
            ownerState={{ axisHighlight: 'line' }}
          />
        )}
      </React.Fragment>
    );
  });
}
```

**Current code in ChartsYAxisHighlight.tsx (lines 20-79):**
```tsx
export default function ChartsYHighlight(props: {
  type: ChartsAxisHighlightType;
  classes: ChartsAxisHighlightClasses;
}) {
  const { type, classes } = props;
  const { left, width } = useDrawingArea();
  const store = useStore<[UseChartCartesianAxisSignature, UseChartBrushSignature]>();
  const axisYValues = store.use(selectorChartsHighlightYAxisValue);
  const yAxes = store.use(selectorChartYAxis);

  if (axisYValues.length === 0) {
    return null;
  }

  return axisYValues.map(({ axisId, value }) => {
    const yAxis = yAxes.axis[axisId];
    const yScale = yAxis.scale;
    const getYPosition = getValueToPositionMapper(yScale);
    const isYScaleOrdinal = type === 'band' && value !== null && isOrdinalScale(yScale);

    if (process.env.NODE_ENV !== 'production') {
      const isError = isYScaleOrdinal && yScale(value) === undefined;
      if (isError) {
        console.error(
          [
            `MUI X Charts: The position value provided for the axis is not valid for the current scale.`,
            `This probably means something is wrong with the data passed to the chart.`,
            `The ChartsAxisHighlight component will not be displayed.`,
          ].join('\n'),
        );
      }
    }

    return (
      <React.Fragment key={`${axisId}-${value}`}>
        {isYScaleOrdinal && yScale(value) !== undefined && (
          <ChartsAxisHighlightPath
            d={`M ${left} ${yScale(value)! - (yScale.step() - yScale.bandwidth()) / 2} l 0 ${yScale.step()} l ${width} 0 l 0 ${-yScale.step()} Z`}
            className={classes.root}
            ownerState={{ axisHighlight: 'band' }}
          />
        )}
        {type === 'line' && value !== null && (
          <ChartsAxisHighlightPath
            d={`M ${left} ${getYPosition(value)} L ${left + width} ${getYPosition(value)}`}
            className={classes.root}
            ownerState={{ axisHighlight: 'line' }}
          />
        )}
      </React.Fragment>
    );
  });
}
```

**Duplicated elements:**
- Identical import set (8 of 9 imports only differ by X/Y selector names)
- Identical component structure and control flow
- Identical dev-mode error message (3 lines, character-for-character identical)
- Identical `getValueToPositionMapper` usage
- Identical `isOrdinalScale` check pattern
- Identical `ChartsAxisHighlightPath` rendering pattern for both `'band'` and `'line'` types

**Suggested fix:**
Extract common logic into a shared helper. The dev-mode error message alone is 3 repeated string literals totaling ~200 chars. A factory or shared render function could accept `{ start, length, axisValues, axes, bandPathBuilder, linePathBuilder }` to eliminate ~80% of duplication.

---

## Finding 2: ChartsXReferenceLine and ChartsYReferenceLine are near-identical duplicates

**Severity:** MAJOR
**Estimated gzip savings:** 600-800 bytes

**Files:**
- `packages/x-charts/src/ChartsReferenceLine/ChartsXReferenceLine.tsx` (lines 1-196)
- `packages/x-charts/src/ChartsReferenceLine/ChartsYReferenceLine.tsx` (lines 1-196)

**Description:**
These two 196-line files share identical structure, identical PropTypes definitions, and a near-identical `getTextParams` function (45 lines each). The only differences are directional (X vs Y axis, `top`/`height` vs `left`/`width`, vertical vs horizontal).

**Duplicated `getTextParams` in ChartsXReferenceLine.tsx (lines 34-79):**
```typescript
const getTextParams = ({
  top,
  height,
  spacing,
  position,
  labelAlign = 'middle',
}: GetTextPlacementParams) => {
  const defaultSpacingOtherAxis =
    labelAlign === 'middle' ? DEFAULT_SPACING_MIDDLE_OTHER_AXIS : DEFAULT_SPACING;

  const spacingX = (typeof spacing === 'object' ? spacing.x : spacing) ?? DEFAULT_SPACING;
  const spacingY =
    (typeof spacing === 'object' ? spacing.y : defaultSpacingOtherAxis) ?? defaultSpacingOtherAxis;

  switch (labelAlign) {
    case 'start':
      return {
        x: position + spacingX,
        y: top + spacingY,
        style: { dominantBaseline: 'hanging', textAnchor: 'start' } as const,
      };
    case 'end':
      return {
        x: position + spacingX,
        y: top + height - spacingY,
        style: { dominantBaseline: 'auto', textAnchor: 'start' } as const,
      };
    default:
      return {
        x: position + spacingX,
        y: top + height / 2 + spacingY,
        style: { dominantBaseline: 'central', textAnchor: 'start' } as const,
      };
  }
};
```

**Duplicated `getTextParams` in ChartsYReferenceLine.tsx (lines 34-79):**
```typescript
const getTextParams = ({
  left,
  width,
  spacing,
  position,
  labelAlign = 'middle',
}: GetTextPlacementParams) => {
  const defaultSpacingOtherAxis =
    labelAlign === 'middle' ? DEFAULT_SPACING_MIDDLE_OTHER_AXIS : DEFAULT_SPACING;

  const spacingX =
    (typeof spacing === 'object' ? spacing.x : defaultSpacingOtherAxis) ?? defaultSpacingOtherAxis;
  const spacingY = (typeof spacing === 'object' ? spacing.y : spacing) ?? DEFAULT_SPACING;

  switch (labelAlign) {
    case 'start':
      return {
        y: position - spacingY,
        x: left + spacingX,
        style: { dominantBaseline: 'auto', textAnchor: 'start' } as const,
      };
    case 'end':
      return {
        y: position - spacingY,
        x: left + width - spacingX,
        style: { dominantBaseline: 'auto', textAnchor: 'end' } as const,
      };
    default:
      return {
        y: position - spacingY,
        x: left + width / 2 + spacingX,
        style: { dominantBaseline: 'auto', textAnchor: 'middle' } as const,
      };
  }
};
```

**Additional duplication -- composeClasses call (identical shape):**

In `ChartsXReferenceLine.tsx` (lines 81-91):
```typescript
export function getXReferenceLineClasses(classes?: Partial<ChartsReferenceLineClasses>) {
  return composeClasses(
    { root: ['root', 'vertical'], line: ['line'], label: ['label'] },
    getReferenceLineUtilityClass,
    classes,
  );
}
```

In `ChartsYReferenceLine.tsx` (lines 81-91):
```typescript
export function getYReferenceLineClasses(classes?: Partial<ChartsReferenceLineClasses>) {
  return composeClasses(
    { root: ['root', 'horizontal'], line: ['line'], label: ['label'] },
    getReferenceLineUtilityClass,
    classes,
  );
}
```

**Additional duplication -- component body (identical structure):**

Both components follow the exact same pattern (lines 93-142 in both):
1. Destructure the same 8 props
2. Call `useDrawingArea()`
3. Call `useXScale(axisId)` / `useYScale(axisId)`
4. Compute position, check for undefined with identical warning pattern
5. Build `d` path string
6. Call `get[X|Y]ReferenceLineClasses(inClasses)`
7. Build identical `textParams` object with `text`, `fontSize: 12`, spread of `getTextParams()`
8. Return identical JSX: `<ReferenceLineRoot>` wrapping `<path>` and `<ChartsText>`

**Additional duplication -- PropTypes (identical except x/y):**

Both files have 50+ lines of PropTypes (lines 144-193) that are character-for-character identical except the final `x`/`y` prop entry.

**Suggested fix:**
Create a shared `getReferenceLineClasses(direction, classes)` and a shared `getTextParams` that takes an axis direction parameter. The component render body could be extracted into a shared function accepting `{ axisValue, direction, useScale, drawingDimensions }`.

---

## Finding 3: ChartsGroupedXAxisTicks and ChartsGroupedYAxisTicks duplicate getGroupingConfig

**Severity:** MEDIUM
**Estimated gzip savings:** 200-250 bytes

**Files:**
- `packages/x-charts/src/ChartsXAxis/ChartsGroupedXAxisTicks.tsx` (lines 10-29)
- `packages/x-charts/src/ChartsYAxis/ChartsGroupedYAxisTicks.tsx` (lines 10-29)

**Description:**
The `DEFAULT_GROUPING_CONFIG` constant and the `getGroupingConfig` function are identically duplicated in both files.

**Duplicated code (present in both files, lines 10-29):**
```typescript
const DEFAULT_GROUPING_CONFIG = {
  tickSize: 6,
};

const getGroupingConfig = (
  groups: AxisGroup[],
  groupIndex: number,
  tickSize: number | undefined,
) => {
  const config = groups[groupIndex] ?? ({} as AxisGroup);

  const defaultTickSize = tickSize ?? DEFAULT_GROUPING_CONFIG.tickSize;
  const calculatedTickSize = defaultTickSize * groupIndex * 2 + defaultTickSize;

  return {
    ...DEFAULT_GROUPING_CONFIG,
    ...config,
    tickSize: config.tickSize ?? calculatedTickSize,
  };
};
```

**Suggested fix:**
Move `DEFAULT_GROUPING_CONFIG` and `getGroupingConfig` to a shared file (e.g. `packages/x-charts/src/internals/getGroupingConfig.ts`) and import from both files.

---

## Finding 4: ChartsGridHorizontal and ChartsGridVertical are near-identical duplicates

**Severity:** MEDIUM
**Estimated gzip savings:** 250-300 bytes

**Files:**
- `packages/x-charts/src/ChartsGrid/ChartsHorizontalGrid.tsx` (lines 1-49)
- `packages/x-charts/src/ChartsGrid/ChartsVerticalGrid.tsx` (lines 1-49)

**Description:**
These two components have identical structure, differing only in axis direction. Both:
1. Import the same set of modules
2. Use `useChartContext()` to get `instance`
3. Call `useTicks()` with the same parameters
4. Map ticks to `GridLine` elements with an inside check

**ChartsHorizontalGrid.tsx (lines 18-49):**
```tsx
export function ChartsGridHorizontal(props: ChartsGridHorizontalProps) {
  const { instance } = useChartContext();
  const { axis, start, end, classes } = props;
  const { scale, tickNumber, tickInterval, tickSpacing } = axis;

  const yTicks = useTicks({
    scale, tickNumber, tickInterval, tickSpacing,
    direction: 'y',
    ordinalTimeTicks: 'ordinalTimeTicks' in axis ? axis.ordinalTimeTicks : undefined,
  });

  return (
    <React.Fragment>
      {yTicks.map(({ value, offset }) =>
        !instance.isYInside(offset) ? null : (
          <GridLine
            key={`horizontal-${value?.getTime?.() ?? value}`}
            y1={offset} y2={offset} x1={start} x2={end}
            className={classes.horizontalLine}
          />
        ),
      )}
    </React.Fragment>
  );
}
```

**ChartsVerticalGrid.tsx (lines 18-49):**
```tsx
export function ChartsGridVertical(props: ChartsGridVerticalProps) {
  const { instance } = useChartContext();
  const { axis, start, end, classes } = props;
  const { scale, tickNumber, tickInterval, tickSpacing } = axis;

  const xTicks = useTicks({
    scale, tickNumber, tickInterval, tickSpacing,
    direction: 'x',
    ordinalTimeTicks: 'ordinalTimeTicks' in axis ? axis.ordinalTimeTicks : undefined,
  });

  return (
    <React.Fragment>
      {xTicks.map(({ value, offset }) =>
        !instance.isXInside(offset) ? null : (
          <GridLine
            key={`vertical-${value?.getTime?.() ?? value}`}
            y1={start} y2={end} x1={offset} x2={offset}
            className={classes.verticalLine}
          />
        ),
      )}
    </React.Fragment>
  );
}
```

**Differences are only:**
- `direction: 'x'` vs `direction: 'y'`
- `instance.isXInside` vs `instance.isYInside`
- GridLine props: `y1/y2` vs `x1/x2` mapping
- `className`: `classes.horizontalLine` vs `classes.verticalLine`
- Key prefix: `'horizontal-'` vs `'vertical-'`

**Suggested fix:**
Create a single `ChartsGridLines` component that accepts a `direction` prop and computes the rest.

---

## Finding 5: useUtilityClasses duplicated in ChartsXAxis and ChartsYAxis utilities

**Severity:** SMALL
**Estimated gzip savings:** 80-120 bytes

**Files:**
- `packages/x-charts/src/ChartsXAxis/utilities.ts` (lines 5-18)
- `packages/x-charts/src/ChartsYAxis/utilities.ts` (lines 5-17)

**Description:**
Both files define a `useUtilityClasses` function with the same structure. The only difference is the axis direction string in the `root` slot array.

**ChartsXAxis/utilities.ts:**
```typescript
export const useUtilityClasses = (
  ownerState: Pick<AxisConfig<any, any, ChartsXAxisProps>, 'position' | 'classes'>,
) => {
  const { classes, position } = ownerState;
  const slots = {
    root: ['root', 'directionX', position],
    line: ['line'],
    tickContainer: ['tickContainer'],
    tick: ['tick'],
    tickLabel: ['tickLabel'],
    label: ['label'],
  };
  return composeClasses(slots, getAxisUtilityClass, classes);
};
```

**ChartsYAxis/utilities.ts:**
```typescript
export const useUtilityClasses = (ownerState: AxisConfig<any, any, ChartsYAxisProps>) => {
  const { classes, position } = ownerState;
  const slots = {
    root: ['root', 'directionY', position],
    line: ['line'],
    tickContainer: ['tickContainer'],
    tick: ['tick'],
    tickLabel: ['tickLabel'],
    label: ['label'],
  };
  return composeClasses(slots, getAxisUtilityClass, classes);
};
```

**Only difference:** `'directionX'` vs `'directionY'` in the `root` slot.

**Suggested fix:**
Create a shared factory: `const makeUseUtilityClasses = (direction: 'X' | 'Y') => (ownerState) => { ... }` or a shared function that takes the direction string.

---

## Finding 6: defaultProps duplicated in ChartsXAxis and ChartsYAxis utilities

**Severity:** SMALL
**Estimated gzip savings:** 40-60 bytes

**Files:**
- `packages/x-charts/src/ChartsXAxis/utilities.ts` (lines 26-31)
- `packages/x-charts/src/ChartsYAxis/utilities.ts` (lines 24-28)

**Description:**
Both files define a `defaultProps` object. They share 3 of 4 properties:

**ChartsXAxis/utilities.ts:**
```typescript
export const defaultProps = {
  disableLine: false,
  disableTicks: false,
  tickSize: 6,
  tickLabelMinGap: 4,
} as const;
```

**ChartsYAxis/utilities.ts:**
```typescript
export const defaultProps = {
  disableLine: false,
  disableTicks: false,
  tickSize: 6,
};
```

**Differences:** X version has `tickLabelMinGap: 4` and uses `as const`. Y version omits both. The 3 shared properties (`disableLine`, `disableTicks`, `tickSize`) are identical.

**Suggested fix:**
Extract a shared base `const axisDefaultProps = { disableLine: false, disableTicks: false, tickSize: 6 }` and spread it in both files.

---

## Finding 7: useAxisTicksProps duplicated between ChartsXAxis and ChartsYAxis

**Severity:** MEDIUM
**Estimated gzip savings:** 300-400 bytes

**Files:**
- `packages/x-charts/src/ChartsXAxis/useAxisTicksProps.ts` (lines 1-72)
- `packages/x-charts/src/ChartsYAxis/useAxisTicksProps.ts` (lines 1-72)

**Description:**
These two files have identical structure and nearly identical code. Both:
1. Import from the same set of modules (differing only in X/Y naming)
2. Call `useXAxes()`/`useYAxes()` to get axis data
3. Destructure `scale`, `tickNumber`, `reverse` from axis
4. Call `useThemeProps` with the same pattern
5. Spread `defaultProps` and `themedProps`
6. Extract `position`, `tickLabelStyle`, `slots`, `slotProps`
7. Call `useTheme()`, `useRtl()`, `useUtilityClasses()`
8. Compute `positionSign` based on position
9. Resolve `Tick` and `TickLabel` slot components
10. Compute `defaultTextAnchor` and `defaultDominantBaseline`
11. Call `useSlotProps` with identical structure
12. Return the same shaped object

**ChartsXAxis/useAxisTicksProps.ts (lines 12-72):**
```typescript
export function useAxisTicksProps(inProps: ChartsXAxisProps) {
  const { xAxis, xAxisIds } = useXAxes();
  const { scale: xScale, tickNumber, reverse, ...settings } = xAxis[inProps.axisId ?? xAxisIds[0]];
  const themedProps = useThemeProps({ props: { ...settings, ...inProps }, name: 'MuiChartsXAxis' });
  const defaultizedProps = { ...defaultProps, ...themedProps };
  const { position, tickLabelStyle, slots, slotProps } = defaultizedProps;
  const theme = useTheme();
  const isRtl = useRtl();
  const classes = useUtilityClasses(defaultizedProps);
  const positionSign = position === 'bottom' ? 1 : -1;
  const Tick = slots?.axisTick ?? 'line';
  const TickLabel = slots?.axisTickLabel ?? ChartsText;
  const defaultTextAnchor = getDefaultTextAnchor(
    (position === 'bottom' ? 0 : 180) - (tickLabelStyle?.angle ?? 0),
  );
  const defaultDominantBaseline = getDefaultBaseline(
    (position === 'bottom' ? 0 : 180) - (tickLabelStyle?.angle ?? 0),
  );
  // ... useSlotProps call ...
  return { xScale, defaultizedProps, tickNumber, positionSign, classes, Tick, TickLabel, axisTickLabelProps, reverse };
}
```

**ChartsYAxis/useAxisTicksProps.ts (lines 12-72):**
```typescript
export function useAxisTicksProps(inProps: ChartsYAxisProps) {
  const { yAxis, yAxisIds } = useYAxes();
  const { scale: yScale, tickNumber, reverse, ...settings } = yAxis[inProps.axisId ?? yAxisIds[0]];
  const themedProps = useThemeProps({ props: { ...settings, ...inProps }, name: 'MuiChartsYAxis' });
  const defaultizedProps = { ...defaultProps, ...themedProps };
  const { position, tickLabelStyle, slots, slotProps } = defaultizedProps;
  const theme = useTheme();
  const isRtl = useRtl();
  const classes = useUtilityClasses(defaultizedProps);
  const positionSign = position === 'right' ? 1 : -1;
  const tickFontSize = typeof tickLabelStyle?.fontSize === 'number' ? tickLabelStyle.fontSize : 12;
  const Tick = slots?.axisTick ?? 'line';
  const TickLabel = slots?.axisTickLabel ?? ChartsText;
  const defaultTextAnchor = getDefaultTextAnchor(
    (position === 'right' ? -90 : 90) - (tickLabelStyle?.angle ?? 0),
  );
  const defaultDominantBaseline = getDefaultBaseline(
    (position === 'right' ? -90 : 90) - (tickLabelStyle?.angle ?? 0),
  );
  // ... useSlotProps call ...
  return { yScale, defaultizedProps, tickNumber, positionSign, classes, Tick, TickLabel, axisTickLabelProps };
}
```

**Key differences:**
- `useXAxes()` vs `useYAxes()`
- `'MuiChartsXAxis'` vs `'MuiChartsYAxis'`
- `position === 'bottom'` vs `position === 'right'`
- Angle offsets: `0`/`180` vs `-90`/`90`
- Y version has extra `tickFontSize` local variable
- Y version omits `reverse` from return value

**Suggested fix:**
Parameterize the common logic into a shared hook factory that accepts direction-specific config (axis hook, theme name, position mapping, angle offsets).

---

## Finding 8: shortenLabels duplicated between ChartsXAxis and ChartsYAxis

**Severity:** MEDIUM
**Estimated gzip savings:** 250-350 bytes

**Files:**
- `packages/x-charts/src/ChartsXAxis/shortenLabels.ts` (lines 1-68)
- `packages/x-charts/src/ChartsYAxis/shortenLabels.tsx` (lines 1-67)

**Description:**
Both files define a `shortenLabels` function with the same structure. The logic is identical; only the axis direction (horizontal vs vertical bounding) differs.

**ChartsXAxis/shortenLabels.ts (lines 8-68):**
```typescript
export function shortenLabels(
  visibleLabels: Set<TickItem>,
  drawingArea: Pick<ChartDrawingArea, 'left' | 'width' | 'right'>,
  maxHeight: number,
  isRtl: boolean,
  tickLabelStyle: ChartsXAxisProps['tickLabelStyle'],
) {
  const shortenedLabels = new Map<TickItem, string>();
  const angle = clampAngle(tickLabelStyle?.angle ?? 0);

  let leftBoundFactor = 1;
  let rightBoundFactor = 1;

  if (tickLabelStyle?.textAnchor === 'start') {
    leftBoundFactor = Infinity;
    rightBoundFactor = 1;
  } else if (tickLabelStyle?.textAnchor === 'end') {
    leftBoundFactor = 1;
    rightBoundFactor = Infinity;
  } else {
    leftBoundFactor = 2;
    rightBoundFactor = 2;
  }

  if (angle > 90 && angle < 270) {
    [leftBoundFactor, rightBoundFactor] = [rightBoundFactor, leftBoundFactor];
  }

  if (isRtl) {
    [leftBoundFactor, rightBoundFactor] = [rightBoundFactor, leftBoundFactor];
  }

  for (const item of visibleLabels) {
    if (item.formattedValue) {
      const width = Math.min(
        (item.offset + item.labelOffset) * leftBoundFactor,
        (drawingArea.left + drawingArea.width + drawingArea.right - item.offset - item.labelOffset) * rightBoundFactor,
      );
      const doesTextFit = (text: string) =>
        doesTextFitInRect(text, {
          width, height: maxHeight, angle,
          measureText: (string: string) => getStringSize(string, tickLabelStyle),
        });
      shortenedLabels.set(item, ellipsize(item.formattedValue.toString(), doesTextFit));
    }
  }
  return shortenedLabels;
}
```

**ChartsYAxis/shortenLabels.tsx (lines 9-67):**
```typescript
export function shortenLabels(
  visibleLabels: TickItem[],
  drawingArea: Pick<ChartDrawingArea, 'top' | 'height' | 'bottom'>,
  maxWidth: number,
  isRtl: boolean,
  tickLabelStyle: ChartsYAxisProps['tickLabelStyle'],
) {
  const shortenedLabels = new Map<TickItem, string>();
  const angle = clampAngle(tickLabelStyle?.angle ?? 0);

  let topBoundFactor = 1;
  let bottomBoundFactor = 1;

  if (tickLabelStyle?.textAnchor === 'start') {
    topBoundFactor = Infinity;
    bottomBoundFactor = 1;
  } else if (tickLabelStyle?.textAnchor === 'end') {
    topBoundFactor = 1;
    bottomBoundFactor = Infinity;
  } else {
    topBoundFactor = 2;
    bottomBoundFactor = 2;
  }

  if (angle > 180) {
    [topBoundFactor, bottomBoundFactor] = [bottomBoundFactor, topBoundFactor];
  }

  if (isRtl) {
    [topBoundFactor, bottomBoundFactor] = [bottomBoundFactor, topBoundFactor];
  }

  for (const item of visibleLabels) {
    if (item.formattedValue) {
      const height = Math.min(
        (item.offset + item.labelOffset) * topBoundFactor,
        (drawingArea.top + drawingArea.height + drawingArea.bottom - item.offset - item.labelOffset) * bottomBoundFactor,
      );
      const doesTextFit = (text: string) =>
        doesTextFitInRect(text, {
          width: maxWidth, height, angle,
          measureText: (string: string) => getStringSize(string, tickLabelStyle),
        });
      shortenedLabels.set(item, ellipsize(item.formattedValue.toString(), doesTextFit));
    }
  }
  return shortenedLabels;
}
```

**Structural identity:**
- Same imports (3 of 4 identical)
- Same flow: clampAngle, bound factor logic, swap logic, iteration with `doesTextFitInRect`
- Same `ellipsize` call
- Same `Map` construction pattern

**Differences:**
- X uses `left`/`width`/`right` from drawing area; Y uses `top`/`height`/`bottom`
- X flips at `angle > 90 && angle < 270`; Y flips at `angle > 180`
- Variable naming: `leftBoundFactor`/`rightBoundFactor` vs `topBoundFactor`/`bottomBoundFactor`
- X accepts `Set<TickItem>`; Y accepts `TickItem[]`

**Suggested fix:**
Parameterize with a direction config object containing the bound extraction functions and angle threshold.

---

## Finding 9: ChartsXAxisImpl and ChartsYAxisImpl have duplicated structure

**Severity:** MEDIUM
**Estimated gzip savings:** 300-400 bytes

**Files:**
- `packages/x-charts/src/ChartsXAxis/ChartsXAxisImpl.tsx` (lines 1-122)
- `packages/x-charts/src/ChartsYAxis/ChartsYAxisImpl.tsx` (lines 1-135)

**Description:**
Both Impl components follow the same pattern:
1. Destructure `scale`, `tickNumber`, `reverse`, `ordinalTimeTicks`, `settings` from axis
2. Call `useThemeProps` with settings + inProps
3. Spread `defaultProps` into themedProps
4. Destructure `position`, `disableLine`, `label`, `labelStyle`, `offset`, `slots`, `slotProps`, `sx`
5. Call `useTheme()`, `useUtilityClasses()`, `useDrawingArea()`
6. Compute `positionSign`
7. Resolve `Line` and `Label` slot components
8. Call `useSlotProps` for axis label props (identical pattern)
9. Early-return for `position === 'none'`
10. Compute `labelRefPoint`
11. Check `skipTickRendering` (identical pattern: ordinal check + infinity check)
12. Select grouped vs single tick component
13. Render root with line, children, label

**Suggested fix:**
A shared render helper could accept direction-specific configuration and reduce ~60% of the code duplication.

---

## Finding 10: Verbose null/undefined checks in ChartsAxisHighlight

**Severity:** SMALL
**Estimated gzip savings:** 10-15 bytes

**File:** `packages/x-charts/src/ChartsAxisHighlight/ChartsAxisHighlight.tsx` (lines 33-38)

**Current code:**
```tsx
{xAxisHighlight && xAxisHighlight !== 'none' && (
  <ChartsXHighlight type={xAxisHighlight} classes={classes} />
)}
{yAxisHighlight && yAxisHighlight !== 'none' && (
  <ChartsYHighlight type={yAxisHighlight} classes={classes} />
)}
```

**Issue:** The first check (`xAxisHighlight &&`) is redundant when followed by `xAxisHighlight !== 'none'`. If `xAxisHighlight` is `undefined` or `null`, `!== 'none'` would still be `true`, but since the prop type is `ChartsAxisHighlightType` which is `'none' | 'line' | 'band'`, the value is either one of those or `undefined`. If `undefined`, the `&&` short-circuits. However, `undefined !== 'none'` is `true`, so the first guard IS needed to prevent rendering with `undefined` type. The double check is technically correct but could be expressed more concisely.

**Suggested fix:**
```tsx
{xAxisHighlight != null && xAxisHighlight !== 'none' && (
  <ChartsXHighlight type={xAxisHighlight} classes={classes} />
)}
```

Or invert:
```tsx
{xAxisHighlight && xAxisHighlight !== 'none' ? (
  <ChartsXHighlight type={xAxisHighlight} classes={classes} />
) : null}
```

Minimal savings since gzip handles repeated patterns well.

---

## Finding 11: Identical error message string in ChartsAxisHighlight X and Y components

**Severity:** SMALL
**Estimated gzip savings:** 50-80 bytes

**Files:**
- `packages/x-charts/src/ChartsAxisHighlight/ChartsXAxisHighlight.tsx` (lines 48-53)
- `packages/x-charts/src/ChartsAxisHighlight/ChartsYAxisHighlight.tsx` (lines 48-53)

**Current code (identical in both files):**
```typescript
console.error(
  [
    `MUI X Charts: The position value provided for the axis is not valid for the current scale.`,
    `This probably means something is wrong with the data passed to the chart.`,
    `The ChartsAxisHighlight component will not be displayed.`,
  ].join('\n'),
);
```

**Issue:** This 3-line error message (~200 characters) is duplicated verbatim. The `.join('\n')` pattern with array is also more verbose than a template literal.

**Suggested fix:**
Extract to a shared constant or use a single multiline template literal:
```typescript
const AXIS_HIGHLIGHT_ERROR = `MUI X Charts: The position value provided for the axis is not valid for the current scale.\nThis probably means something is wrong with the data passed to the chart.\nThe ChartsAxisHighlight component will not be displayed.`;
```

---

## Finding 12: Identical warnOnce messages in ChartsXAxis and ChartsYAxis

**Severity:** SMALL
**Estimated gzip savings:** 20-30 bytes

**Files:**
- `packages/x-charts/src/ChartsXAxis/ChartsXAxis.tsx` (line 31)
- `packages/x-charts/src/ChartsYAxis/ChartsYAxis.tsx` (line 30)

**Current code (identical in both):**
```typescript
warnOnce(`MUI X Charts: No axis found. The axisId "${inProps.axisId}" is probably invalid.`);
```

**Issue:** Identical warning string in both files.

**Suggested fix:**
Extract to a shared utility or constant. Minimal savings due to gzip handling repeated patterns, but still a small win.

---

## Finding 13: Redundant `Array.isArray(axis.groups)` check

**Severity:** TINY
**Estimated gzip savings:** 20-30 bytes per file (40-60 total)

**Files:**
- `packages/x-charts/src/ChartsXAxis/ChartsXAxisImpl.tsx` (line 88)
- `packages/x-charts/src/ChartsYAxis/ChartsYAxisImpl.tsx` (line 108)

**Current code (identical in both):**
```typescript
'groups' in axis && Array.isArray(axis.groups) ? (
  <ChartsGroupedXAxisTicks {...inProps} />
) : (
  <ChartsSingleXAxisTicks ... />
);
```

**Issue:** If `'groups' in axis` is true, `axis.groups` should always be an array (or undefined). The type definition likely guarantees this. However, if `groups` could be `null` or a non-array, the `Array.isArray` check is a safety guard. If the type system already ensures `groups` is always `AxisGroup[]`, the `Array.isArray` call is redundant.

**Suggested fix:**
Verify if the type system guarantees `groups` is always an array when present. If so:
```typescript
'groups' in axis && axis.groups ? (
```

---

## Finding 14: `chartsAxisHighlightClasses` generates classes for only one slot

**Severity:** TINY
**Estimated gzip savings:** 5-10 bytes

**File:** `packages/x-charts/src/ChartsAxisHighlight/chartsAxisHighlightClasses.ts` (lines 1-18)

**Current code:**
```typescript
import generateUtilityClass from '@mui/utils/generateUtilityClass';
import generateUtilityClasses from '@mui/utils/generateUtilityClasses';

export interface ChartsAxisHighlightClasses {
  root: string;
}

export function getAxisHighlightUtilityClass(slot: string) {
  return generateUtilityClass('MuiChartsAxisHighlight', slot);
}

export const chartsAxisHighlightClasses: ChartsAxisHighlightClasses = generateUtilityClasses(
  'MuiChartsAxisHighlight',
  ['root'],
);
```

**Issue:** The string `'MuiChartsAxisHighlight'` appears twice. `generateUtilityClasses` internally calls `generateUtilityClass`, so both imports may not be necessary -- `generateUtilityClasses` should suffice if the classes object is all that's needed. However, `getAxisHighlightUtilityClass` is used by `composeClasses` in `ChartsAxisHighlight.tsx`, so both are needed.

The `'MuiChartsAxisHighlight'` string appears twice but gzip should handle this well. Minimal improvement possible.

**Suggested fix:**
Extract the component name to a constant:
```typescript
const COMPONENT_NAME = 'MuiChartsAxisHighlight';
export function getAxisHighlightUtilityClass(slot: string) {
  return generateUtilityClass(COMPONENT_NAME, slot);
}
export const chartsAxisHighlightClasses = generateUtilityClasses(COMPONENT_NAME, ['root']);
```

---

## Finding 15: ChartsXAxis.tsx and ChartsYAxis.tsx have duplicated PropTypes blocks

**Severity:** SMALL
**Estimated gzip savings:** 100-150 bytes

**Files:**
- `packages/x-charts/src/ChartsXAxis/ChartsXAxis.tsx` (lines 38-147)
- `packages/x-charts/src/ChartsYAxis/ChartsYAxis.tsx` (lines 37-140)

**Description:**
Both files have ~100 lines of PropTypes that are nearly identical. The following props are character-for-character duplicated:
- `axisId`, `classes`, `disableLine`, `disableTicks`, `label`, `labelStyle`, `slotProps`, `slots`, `sx`
- `tickInterval`, `tickLabelInterval`, `tickLabelPlacement`, `tickLabelStyle`
- `tickMaxStep`, `tickMinStep`, `tickNumber`, `tickPlacement`, `tickSize`

Differences:
- X has `axis: PropTypes.oneOf(['x'])`, Y has `axis: PropTypes.oneOf(['y'])`
- X has `tickLabelMinGap: PropTypes.number` (Y does not)

**Note:** PropTypes are auto-generated by `pnpm proptypes`, so this is not directly fixable in source. However, it represents bundle size overhead in development builds. In production, PropTypes are typically stripped by bundlers.

---

## Finding 16: ChartsXReferenceLine and ChartsYReferenceLine duplicate PropTypes

**Severity:** SMALL
**Estimated gzip savings:** 80-120 bytes (dev builds only)

**Files:**
- `packages/x-charts/src/ChartsReferenceLine/ChartsXReferenceLine.tsx` (lines 144-193)
- `packages/x-charts/src/ChartsReferenceLine/ChartsYReferenceLine.tsx` (lines 144-193)

**Description:**
50 lines of PropTypes are duplicated between these files. All props except `x`/`y` are identical. The `spacing` PropTypes alone is 6 lines repeated verbatim. Again, auto-generated, so not directly fixable.

---

## Finding 17: `ordinalTimeTicks` check pattern repeated across grid components

**Severity:** TINY
**Estimated gzip savings:** 10-20 bytes

**Files:**
- `packages/x-charts/src/ChartsGrid/ChartsHorizontalGrid.tsx` (line 30)
- `packages/x-charts/src/ChartsGrid/ChartsVerticalGrid.tsx` (line 30)

**Current code (identical in both):**
```typescript
ordinalTimeTicks: 'ordinalTimeTicks' in axis ? axis.ordinalTimeTicks : undefined,
```

**Issue:** This `'ordinalTimeTicks' in axis ? axis.ordinalTimeTicks : undefined` pattern is repeated. While small, it could be a utility function.

**Suggested fix:**
```typescript
const getOrdinalTimeTicks = (axis: any) => 'ordinalTimeTicks' in axis ? axis.ordinalTimeTicks : undefined;
```

---

## Summary Table

| # | Finding | Files | Severity | Est. Gzip Savings |
|---|---------|-------|----------|-------------------|
| 1 | ChartsXAxisHighlight / ChartsYAxisHighlight duplication | 2 | MAJOR | 400-500 bytes |
| 2 | ChartsXReferenceLine / ChartsYReferenceLine duplication | 2 | MAJOR | 600-800 bytes |
| 3 | Grouped axis ticks config duplication | 2 | MEDIUM | 200-250 bytes |
| 4 | ChartsGridHorizontal / ChartsGridVertical duplication | 2 | MEDIUM | 250-300 bytes |
| 5 | useUtilityClasses duplication (X/Y utilities) | 2 | SMALL | 80-120 bytes |
| 6 | defaultProps duplication (X/Y utilities) | 2 | SMALL | 40-60 bytes |
| 7 | useAxisTicksProps duplication | 2 | MEDIUM | 300-400 bytes |
| 8 | shortenLabels duplication | 2 | MEDIUM | 250-350 bytes |
| 9 | ChartsXAxisImpl / ChartsYAxisImpl structural duplication | 2 | MEDIUM | 300-400 bytes |
| 10 | Verbose null checks in ChartsAxisHighlight | 1 | SMALL | 10-15 bytes |
| 11 | Identical error message in highlight components | 2 | SMALL | 50-80 bytes |
| 12 | Identical warnOnce messages in ChartsXAxis/ChartsYAxis | 2 | SMALL | 20-30 bytes |
| 13 | Redundant Array.isArray check | 2 | TINY | 40-60 bytes |
| 14 | Repeated component name string in classes file | 3 | TINY | 5-10 bytes |
| 15 | Duplicated PropTypes in ChartsXAxis/ChartsYAxis | 2 | SMALL | 100-150 bytes |
| 16 | Duplicated PropTypes in reference line components | 2 | SMALL | 80-120 bytes |
| 17 | ordinalTimeTicks check pattern | 2 | TINY | 10-20 bytes |
| | **TOTAL** | | | **2,735-3,665 bytes** |

**Note on gzip interaction:** Many of these duplications occur across separate files. Gzip works on a sliding window (typically 32KB), so duplications within the same file or nearby files in the bundle will compress better than duplications far apart. The actual savings depend heavily on the bundler's module ordering and chunk boundaries. The estimates above assume moderate gzip benefit from deduplication (roughly 50-70% of raw byte savings).

**Top 3 recommendations by impact:**
1. Unify ChartsXReferenceLine / ChartsYReferenceLine with a shared factory (Finding 2)
2. Unify ChartsXAxisHighlight / ChartsYAxisHighlight with a shared factory (Finding 1)
3. Unify useAxisTicksProps across X/Y axes (Finding 7)
