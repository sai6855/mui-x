# Bundle Size Optimization Findings: ChartsLegend, ChartsLabel, ChartsTooltip, ChartsOverlay

Scope: All `.ts` and `.tsx` source files (excluding test files) in:
- `packages/x-charts/src/ChartsLegend/`
- `packages/x-charts/src/ChartsLabel/`
- `packages/x-charts/src/ChartsTooltip/`
- `packages/x-charts/src/ChartsOverlay/`

---

## Finding 1: Duplicate StyledText Component in ChartsOverlay

**Type:** Duplicate code

**Files:**
- `packages/x-charts/src/ChartsOverlay/ChartsLoadingOverlay.tsx` lines 7-17
- `packages/x-charts/src/ChartsOverlay/ChartsNoDataOverlay.tsx` lines 7-17

**Current code (identical in both files):**
```tsx
const StyledText = styled('text', {
  slot: 'internal',
  shouldForwardProp: undefined,
})(({ theme }) => ({
  ...theme.typography.body2,
  stroke: 'none',
  fill: (theme.vars || theme).palette.text.primary,
  shapeRendering: 'crispEdges',
  textAnchor: 'middle',
  dominantBaseline: 'middle',
}));
```

**Suggested fix:** Extract `StyledText` into a shared module (e.g. `ChartsOverlay/StyledText.ts`) and import it in both `ChartsLoadingOverlay.tsx` and `ChartsNoDataOverlay.tsx`.

**Estimated gzip savings:** ~180 bytes

---

## Finding 2: Nearly-Identical Overlay Component Bodies

**Type:** Duplicate code

**Files:**
- `packages/x-charts/src/ChartsOverlay/ChartsLoadingOverlay.tsx` lines 19-29
- `packages/x-charts/src/ChartsOverlay/ChartsNoDataOverlay.tsx` lines 19-29

**Current code (ChartsLoadingOverlay.tsx):**
```tsx
export function ChartsLoadingOverlay(props: CommonOverlayProps) {
  const { message, ...other } = props;
  const { top, left, height, width } = useDrawingArea();
  const { localeText } = useChartsLocalization();

  return (
    <StyledText x={left + width / 2} y={top + height / 2} {...other}>
      {message ?? localeText.loading}
    </StyledText>
  );
}
```

**Current code (ChartsNoDataOverlay.tsx):**
```tsx
export function ChartsNoDataOverlay(props: CommonOverlayProps) {
  const { message, ...other } = props;
  const { top, left, height, width } = useDrawingArea();
  const { localeText } = useChartsLocalization();

  return (
    <StyledText x={left + width / 2} y={top + height / 2} {...other}>
      {message ?? localeText.noData}
    </StyledText>
  );
}
```

**Suggested fix:** Create a single shared base component parameterized by the localeText key:

```tsx
function OverlayBase(props: CommonOverlayProps & { localeKey: 'loading' | 'noData' }) {
  const { message, localeKey, ...other } = props;
  const { top, left, height, width } = useDrawingArea();
  const { localeText } = useChartsLocalization();
  return (
    <StyledText x={left + width / 2} y={top + height / 2} {...other}>
      {message ?? localeText[localeKey]}
    </StyledText>
  );
}

export function ChartsLoadingOverlay(props: CommonOverlayProps) {
  return <OverlayBase {...props} localeKey="loading" />;
}

export function ChartsNoDataOverlay(props: CommonOverlayProps) {
  return <OverlayBase {...props} localeKey="noData" />;
}
```

**Estimated gzip savings:** ~90 bytes (on top of Finding 1 savings)

---

## Finding 3: Unnecessary Object Spreads in PiecewiseColorLegend Data Construction

**Type:** Unnecessary object spreads

**File:** `packages/x-charts/src/ChartsLegend/PiecewiseColorLegend.tsx` lines 227-242

**Current code:**
```tsx
const data = {
  index: colorIndex,
  length: formattedLabels.length,
  ...(isFirstColor
    ? { min: null, formattedMin: null }
    : {
        min: colorMap.thresholds[colorIndex - 1],
        formattedMin: formattedLabels[colorIndex - 1],
      }),
  ...(isLastColor
    ? { max: null, formattedMax: null }
    : {
        max: colorMap.thresholds[colorIndex],
        formattedMax: formattedLabels[colorIndex],
      }),
};
```

**Suggested fix:** Use direct property assignment with ternaries instead of conditional spreads:
```tsx
const data = {
  index: colorIndex,
  length: formattedLabels.length,
  min: isFirstColor ? null : colorMap.thresholds[colorIndex - 1],
  formattedMin: isFirstColor ? null : formattedLabels[colorIndex - 1],
  max: isLastColor ? null : colorMap.thresholds[colorIndex],
  formattedMax: isLastColor ? null : formattedLabels[colorIndex],
};
```

**Estimated gzip savings:** ~32 bytes

---

## Finding 4: Repeated Axis ForEach Pattern in useAxesTooltip

**Type:** Duplicate code

**File:** `packages/x-charts/src/ChartsTooltip/useAxesTooltip.tsx` lines 126-142

**Current code:**
```tsx
if (directions === undefined || directions.includes('x')) {
  tooltipXAxes.forEach(({ axisId, dataIndex }) => {
    tooltipAxes.push(defaultAxisTooltipConfig(xAxis[axisId], dataIndex, 'x'));
  });
}

if (directions === undefined || directions.includes('y')) {
  tooltipYAxes.forEach(({ axisId, dataIndex }) => {
    tooltipAxes.push(defaultAxisTooltipConfig(yAxis[axisId], dataIndex, 'y'));
  });
}

if (directions === undefined || directions.includes('rotation')) {
  tooltipRotationAxes.forEach(({ axisId, dataIndex }) => {
    tooltipAxes.push(defaultAxisTooltipConfig(rotationAxis[axisId], dataIndex, 'rotation'));
  });
}
```

**Suggested fix:** Extract helper to reduce repeated structure:
```tsx
const pushAxisTooltips = (
  axisTooltips: Array<{ axisId: AxisId; dataIndex: number }>,
  axisMap: Record<string, ComputedAxis | PolarAxisDefaultized>,
  dir: 'x' | 'y' | 'rotation',
) => {
  if (directions === undefined || directions.includes(dir)) {
    axisTooltips.forEach(({ axisId, dataIndex }) => {
      tooltipAxes.push(defaultAxisTooltipConfig(axisMap[axisId], dataIndex, dir));
    });
  }
};

pushAxisTooltips(tooltipXAxes, xAxis, 'x');
pushAxisTooltips(tooltipYAxes, yAxis, 'y');
pushAxisTooltips(tooltipRotationAxes, rotationAxis, 'rotation');
```

**Estimated gzip savings:** ~60 bytes

---

## Finding 5: Repeated Series Processing Loop in useAxesTooltip

**Type:** Duplicate code

**File:** `packages/x-charts/src/ChartsTooltip/useAxesTooltip.tsx` lines 144-231

**Current code (two nearly identical blocks):**

Block 1 (lines 144-190) for cartesian series:
```tsx
Object.keys(series)
  .filter(isCartesianSeriesType)
  .forEach(<SeriesT extends CartesianChartSeriesType>(seriesType: SeriesT) => {
    const seriesOfType = series[seriesType];
    if (!seriesOfType) {
      return [];
    }
    return seriesOfType.seriesOrder.forEach((seriesId) => {
      const seriesToAdd = seriesOfType.series[seriesId]!;
      // ... find tooltipItemIndex ...
      if (tooltipItemIndex >= 0) {
        // ... compute color, value, formattedValue, formattedLabel ...
        tooltipAxes[tooltipItemIndex].seriesItems.push({
          seriesId, color, value, formattedValue, formattedLabel,
          markType: seriesToAdd.labelMarkType,
        });
      }
    });
  });
```

Block 2 (lines 192-231) for polar series: near-identical structure.

Both blocks share the same pattern:
- Filter by series type
- Iterate over `seriesOrder`
- Find matching tooltip axis index
- Get color, value, formattedValue, formattedLabel
- Push to `seriesItems`

**Suggested fix:** Extract the shared inner logic (color computation call, push to `seriesItems`) into a helper function parameterized by how to compute color and find axis index. This is complex due to type generics but the duplicated lines (value, formattedValue, formattedLabel, push) could be shared.

**Estimated gzip savings:** ~50 bytes

---

## Finding 6: Redundant Null-Check Chain in ContinuousColorLegend

**Type:** Verbose conditional

**File:** `packages/x-charts/src/ChartsLegend/ContinuousColorLegend.tsx` line 225

**Current code:**
```tsx
if (!colorMap || !colorMap.type || colorMap.type !== 'continuous') {
  return null;
}
```

**Suggested fix:** Use optional chaining:
```tsx
if (colorMap?.type !== 'continuous') {
  return null;
}
```

If `colorMap` is nullish, `colorMap?.type` is `undefined`, which is `!== 'continuous'`, so the behavior is the same.

**Estimated gzip savings:** ~4 bytes

---

## Finding 7: Same Redundant Null-Check Chain in PiecewiseColorLegend

**Type:** Verbose conditional

**File:** `packages/x-charts/src/ChartsLegend/PiecewiseColorLegend.tsx` line 189

**Current code:**
```tsx
if (!colorMap || !colorMap.type || colorMap.type !== 'piecewise') {
  return null;
}
```

**Suggested fix:**
```tsx
if (colorMap?.type !== 'piecewise') {
  return null;
}
```

**Estimated gzip savings:** ~4 bytes

---

## Finding 8: Duplicate getLegendUtilityClass Pattern Across Three Class Files

**Type:** Duplicate code / string repetition

**Files:**
- `packages/x-charts/src/ChartsLegend/chartsLegendClasses.ts` lines 26-28
- `packages/x-charts/src/ChartsLegend/continuousColorLegendClasses.ts` lines 30-32
- `packages/x-charts/src/ChartsLegend/piecewiseColorLegendClasses.ts` lines 36-38

**Current code (chartsLegendClasses.ts):**
```ts
function getLegendUtilityClass(slot: string) {
  return generateUtilityClass('MuiChartsLegend', slot);
}
```

**Current code (continuousColorLegendClasses.ts):**
```ts
function getLegendUtilityClass(slot: string) {
  return generateUtilityClass('MuiContinuousColorLegend', slot);
}
```

**Current code (piecewiseColorLegendClasses.ts):**
```ts
function getLegendUtilityClass(slot: string) {
  return generateUtilityClass('MuiPiecewiseColorLegendClasses', slot);
}
```

Each follows the same pattern: define a local function that wraps `generateUtilityClass` with a string prefix, then pass it to `composeClasses`. This pattern also exists in:
- `packages/x-charts/src/ChartsLabel/labelClasses.ts` line 11
- `packages/x-charts/src/ChartsLabel/labelMarkClasses.ts` line 19
- `packages/x-charts/src/ChartsLabel/labelGradientClasses.tsx` line 19

Six total instances of the same wrapper pattern.

**Suggested fix:** Inline the call by using an arrow function or binding directly, avoiding the named function declaration:
```ts
export const useUtilityClasses = (props: ...) => {
  const slots = { ... };
  return composeClasses(slots, (slot: string) => generateUtilityClass('MuiChartsLegend', slot), classes);
};
```

Or create a shared factory:
```ts
const makeGetClass = (prefix: string) => (slot: string) => generateUtilityClass(prefix, slot);
```

**Estimated gzip savings:** ~45 bytes (gzip already compresses similar text, but removing 6 function declarations still helps)

---

## Finding 9: Unnecessary `as const` in onClickContextBuilder

**Type:** Unnecessary type assertion

**File:** `packages/x-charts/src/ChartsLegend/onClickContextBuilder.ts` lines 3-11

**Current code:**
```ts
export const seriesContextBuilder = (context: LegendItemParams): SeriesLegendItemContext =>
  ({
    type: 'series',
    color: context.color,
    label: context.label,
    seriesId: context.seriesId!,
    itemId: context.itemId,
    dataIndex: context.dataIndex,
  }) as const;
```

The return type is already explicitly declared as `SeriesLegendItemContext`. The `as const` assertion narrows the types of the object literal (e.g., `type` becomes the literal `'series'` instead of `string`), but this is unnecessary since the explicit return type annotation already controls the resulting type.

**Suggested fix:**
```ts
export const seriesContextBuilder = (context: LegendItemParams): SeriesLegendItemContext => ({
  type: 'series',
  color: context.color,
  label: context.label,
  seriesId: context.seriesId!,
  itemId: context.itemId,
  dataIndex: context.dataIndex,
});
```

**Estimated gzip savings:** ~3 bytes

---

## Finding 10: Verbose Conditional in ChartsLabelMark Rendering

**Type:** Verbose conditional

**File:** `packages/x-charts/src/ChartsLabel/ChartsLabelMark.tsx` lines 101-124

**Current code:**
```tsx
<React.Fragment>
  {type === 'circle' && (
    <svg viewBox="0 0 15 15">
      <circle className={classes?.fill} r="7.5" cx="7.5" cy="7.5" fill={color} />
    </svg>
  )}
  {type === 'line' && (
    <svg viewBox="0 0 16 8" preserveAspectRatio="none">
      <path
        className={classes?.fill}
        d="M 2 4 L 14 4"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )}
  {type !== 'line' && type !== 'circle' && (
    <svg viewBox="0 0 13 13">
      <rect className={classes?.fill} width="13" height="13" fill={color} />
    </svg>
  )}
</React.Fragment>
```

The third branch `type !== 'line' && type !== 'circle'` is equivalent to `type === 'square'` in this context (since custom function types are handled in the outer condition). The double negation is more bytes.

**Suggested fix:** Replace the third condition:
```tsx
{type === 'square' && (
  <svg viewBox="0 0 13 13">
    <rect className={classes?.fill} width="13" height="13" fill={color} />
  </svg>
)}
```

Or, even better, replace the three JSX conditionals with a single `if/else if/else` block:
```tsx
{type === 'circle' ? (
  <svg viewBox="0 0 15 15">
    <circle className={classes?.fill} r="7.5" cx="7.5" cy="7.5" fill={color} />
  </svg>
) : type === 'line' ? (
  <svg viewBox="0 0 16 8" preserveAspectRatio="none">
    <path ... />
  </svg>
) : (
  <svg viewBox="0 0 13 13">
    <rect className={classes?.fill} width="13" height="13" fill={color} />
  </svg>
)}
```

The ternary chain is smaller than three separate JSX conditional blocks because it avoids evaluating all three conditions and wrapping in a Fragment.

**Estimated gzip savings:** ~18 bytes

---

## Finding 11: Duplicate Button-Reset CSS in ChartsLegend and PiecewiseColorLegend

**Type:** Duplicate code

**Files:**
- `packages/x-charts/src/ChartsLegend/ChartsLegend.tsx` lines 73-83
- `packages/x-charts/src/ChartsLegend/PiecewiseColorLegend.tsx` lines 80-91

**Current code (ChartsLegend.tsx):**
```tsx
[`button.${legendClasses.series}`]: {
  // Reset button styles
  background: 'none',
  border: 'none',
  padding: 0,
  fontFamily: 'inherit',
  fontWeight: 'inherit',
  fontSize: 'inherit',
  letterSpacing: 'inherit',
  color: 'inherit',
},
```

**Current code (PiecewiseColorLegend.tsx):**
```tsx
[`button.${classes.item}`]: {
  // Reset button styles
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: ownerState.onItemClick ? 'pointer' : 'unset',
  fontFamily: 'inherit',
  fontWeight: 'inherit',
  fontSize: 'inherit',
  letterSpacing: 'inherit',
  color: 'inherit',
},
```

These are nearly identical button reset style blocks.

**Suggested fix:** Extract a shared `buttonResetStyles` constant:
```ts
const buttonResetStyles = {
  background: 'none',
  border: 'none',
  padding: 0,
  fontFamily: 'inherit',
  fontWeight: 'inherit',
  fontSize: 'inherit',
  letterSpacing: 'inherit',
  color: 'inherit',
};
```

Then spread it in both styled components.

**Estimated gzip savings:** ~40 bytes

---

## Finding 12: Repeated `(theme.vars || theme).palette.text.primary` Pattern

**Type:** Shared constant opportunity / string repetition

**Files and lines:**
- `packages/x-charts/src/ChartsLegend/ChartsLegend.tsx` line 58
- `packages/x-charts/src/ChartsLegend/ContinuousColorLegend.tsx` line 119
- `packages/x-charts/src/ChartsLegend/PiecewiseColorLegend.tsx` line 68
- `packages/x-charts/src/ChartsOverlay/ChartsLoadingOverlay.tsx` line 13
- `packages/x-charts/src/ChartsOverlay/ChartsNoDataOverlay.tsx` line 13
- `packages/x-charts/src/ChartsTooltip/ChartsTooltipTable.ts` line 14 and line 66

**Current pattern:**
```ts
color: (theme.vars || theme).palette.text.primary,
```

This exact expression appears at least 7 times across the analyzed files.

**Suggested fix:** While each occurrence is in a different styled callback scope, gzip generally handles this well. A potential micro-optimization is to destructure at the top of each callback:
```ts
(({ theme }) => {
  const palette = (theme.vars || theme).palette;
  return {
    color: palette.text.primary,
    // ...
  };
})
```

This is most useful in `ChartsTooltipTable.ts` which uses `(theme.vars || theme).palette` four times.

**Estimated gzip savings:** ~15 bytes (mainly in ChartsTooltipTable.ts)

---

## Finding 13: Repeated `(theme.vars || theme).palette` in ChartsTooltipTable

**Type:** Shared constant opportunity

**File:** `packages/x-charts/src/ChartsTooltip/ChartsTooltipTable.ts`

**Lines:** 13-16, 33, 66, 77

**Current code (across all four styled components in the file):**
```ts
// ChartsTooltipPaper (lines 13-16)
backgroundColor: (theme.vars || theme).palette.background.paper,
color: (theme.vars || theme).palette.text.primary,
borderRadius: (theme.vars || theme).shape?.borderRadius,
border: `solid ${(theme.vars || theme).palette.divider} 1px`,

// ChartsTooltipTable (line 33)
borderBottom: `solid ${(theme.vars || theme).palette.divider} 1px`,

// ChartsTooltipCell (lines 66, 77)
color: (theme.vars || theme).palette.text.secondary,
color: (theme.vars || theme).palette.text.primary,
```

`(theme.vars || theme)` appears 7 times in this single file.

**Suggested fix:** In each styled callback, destructure once:
```ts
const t = theme.vars || theme;
```

For `ChartsTooltipPaper`:
```ts
(({ theme }) => {
  const t = theme.vars || theme;
  return {
    backgroundColor: t.palette.background.paper,
    color: t.palette.text.primary,
    borderRadius: t.shape?.borderRadius,
    border: `solid ${t.palette.divider} 1px`,
  };
})
```

**Estimated gzip savings:** ~25 bytes

---

## Finding 14: Repeated Shared Style Properties Across Legend Root Elements

**Type:** Duplicate code

**Files:**
- `packages/x-charts/src/ChartsLegend/ChartsLegend.tsx` lines 56-69
- `packages/x-charts/src/ChartsLegend/ContinuousColorLegend.tsx` lines 117-128
- `packages/x-charts/src/ChartsLegend/PiecewiseColorLegend.tsx` lines 64-79

**Common styles present in all three:**
```ts
...theme.typography.caption,
color: (theme.vars || theme).palette.text.primary,
lineHeight: '100%',
flexShrink: 0,
listStyleType: 'none',
paddingInlineStart: 0,
marginBlock: theme.spacing(1),
marginInline: theme.spacing(1),
gridArea: 'legend',
```

These 9 properties are identical in all three styled `RootElement` components.

**Suggested fix:** Extract a shared base styles factory:
```ts
const legendBaseStyles = (theme: Theme) => ({
  ...theme.typography.caption,
  color: (theme.vars || theme).palette.text.primary,
  lineHeight: '100%',
  flexShrink: 0,
  listStyleType: 'none',
  paddingInlineStart: 0,
  marginBlock: theme.spacing(1),
  marginInline: theme.spacing(1),
  gridArea: 'legend',
});
```

Then in each styled component:
```ts
(({ theme, ownerState }) => ({
  ...legendBaseStyles(theme),
  display: 'flex',
  // ... component-specific styles
}))
```

**Estimated gzip savings:** ~70 bytes

---

## Finding 15: `templateAreas` Function Called Multiple Times with Same `reverse` Argument

**Type:** Verbose pattern

**File:** `packages/x-charts/src/ChartsLegend/ContinuousColorLegend.tsx` lines 76-112 (definition) and 133-165 (usage)

**Current code:**
```tsx
[`&.${continuousColorLegendClasses.start}`]: {
  gridTemplateAreas: templateAreas(ownerState.reverse).row.start,
},
[`&.${continuousColorLegendClasses.end}`]: {
  gridTemplateAreas: templateAreas(ownerState.reverse).row.end,
},
[`&.${continuousColorLegendClasses.extremes}`]: {
  gridTemplateAreas: templateAreas(ownerState.reverse).row.extremes,
  // ...
},
// ... and 3 more for column
```

`templateAreas(ownerState.reverse)` is called 6 times with the same argument, each time constructing a new object.

**Suggested fix:** Call `templateAreas` once and store the result:
```tsx
(({ theme, ownerState }) => {
  const areas = templateAreas(ownerState.reverse);
  return {
    // ...
    [`&.${continuousColorLegendClasses.start}`]: {
      gridTemplateAreas: areas.row.start,
    },
    [`&.${continuousColorLegendClasses.end}`]: {
      gridTemplateAreas: areas.row.end,
    },
    // ...
  };
})
```

**Estimated gzip savings:** ~30 bytes

---

## Finding 16: Repeated `clsx(classes?.labelCell, classes?.cell)` in Tooltip Content Components

**Type:** Duplicate code

**Files:**
- `packages/x-charts/src/ChartsTooltip/ChartsAxisTooltipContent.tsx` lines 53, 61
- `packages/x-charts/src/ChartsTooltip/ChartsItemTooltipContent.tsx` lines 50, 53, 71, 77

**Current code pattern (repeated 6 times across both files):**
```tsx
<ChartsTooltipCell className={clsx(classes.labelCell, classes.cell)} component="th">
// ...
<ChartsTooltipCell className={clsx(classes.valueCell, classes.cell)} component="td">
```

**Suggested fix:** Compute the combined class names once at the top of each render function:
```tsx
const labelCellClass = clsx(classes.labelCell, classes.cell);
const valueCellClass = clsx(classes.valueCell, classes.cell);
```

Then reference them:
```tsx
<ChartsTooltipCell className={labelCellClass} component="th">
<ChartsTooltipCell className={valueCellClass} component="td">
```

**Estimated gzip savings:** ~20 bytes

---

## Finding 17: Duplicate Tooltip Content JSX Structure

**Type:** Duplicate code

**File:** `packages/x-charts/src/ChartsTooltip/ChartsItemTooltipContent.tsx`

**Lines 39-61 and 67-84 share a similar structure:**
```tsx
// Branch 1 (radar - lines 39-61):
<ChartsTooltipPaper sx={sx} className={classes.paper}>
  <ChartsTooltipTable className={classes.table}>
    <Typography component="caption">...</Typography>
    <tbody>
      {tooltipData.values.map(({ formattedValue, label }) => (
        <ChartsTooltipRow key={label} className={classes.row}>
          <ChartsTooltipCell className={clsx(classes.labelCell, classes.cell)} component="th">
            {label}
          </ChartsTooltipCell>
          <ChartsTooltipCell className={clsx(classes.valueCell, classes.cell)} component="td">
            {formattedValue}
          </ChartsTooltipCell>
        </ChartsTooltipRow>
      ))}
    </tbody>
  </ChartsTooltipTable>
</ChartsTooltipPaper>

// Branch 2 (single item - lines 67-84):
<ChartsTooltipPaper sx={sx} className={classes.paper}>
  <ChartsTooltipTable className={classes.table}>
    <tbody>
      <ChartsTooltipRow className={classes.row}>
        <ChartsTooltipCell className={clsx(classes.labelCell, classes.cell)} component="th">
          <div className={classes.markContainer}>
            <ChartsLabelMark type={markType} color={color} className={classes.mark} />
          </div>
          {label}
        </ChartsTooltipCell>
        <ChartsTooltipCell className={clsx(classes.valueCell, classes.cell)} component="td">
          {formattedValue}
        </ChartsTooltipCell>
      </ChartsTooltipRow>
    </tbody>
  </ChartsTooltipTable>
</ChartsTooltipPaper>
```

The outer wrapping (`ChartsTooltipPaper > ChartsTooltipTable > tbody > ChartsTooltipRow > two ChartsTooltipCells`) is duplicated.

**Suggested fix:** Extract a `TooltipRow` helper that renders the row with a label cell and value cell. Also extract the `Paper > Table > tbody` wrapper pattern. Due to the complexity of this refactor, savings are modest but real.

**Estimated gzip savings:** ~35 bytes

---

## Finding 18: `return []` Instead of `return` in useAxesTooltip forEach Callbacks

**Type:** Dead code / verbose pattern

**File:** `packages/x-charts/src/ChartsTooltip/useAxesTooltip.tsx` lines 148-149 and 197-198

**Current code:**
```tsx
if (!seriesOfType) {
  return [];
}
return seriesOfType.seriesOrder.forEach((seriesId) => {
```

The `forEach` method always returns `undefined`, not an array. The `return []` on the guard clause and the `return` before `forEach` are both unnecessary in a `.forEach()` callback.

**Suggested fix:**
```tsx
if (!seriesOfType) {
  return;
}
seriesOfType.seriesOrder.forEach((seriesId) => {
```

**Estimated gzip savings:** ~6 bytes

---

## Finding 19: Repeated `isButton ? ... : undefined` Pattern in ChartsLegend

**Type:** Verbose pattern

**File:** `packages/x-charts/src/ChartsLegend/ChartsLegend.tsx` lines 162-166

**Current code:**
```tsx
<Element
  className={clsx(classes?.series, !isVisible && classes?.hidden)}
  role={isButton ? 'button' : undefined}
  type={isButton ? 'button' : undefined}
  // @ts-expect-error onClick is only attached to a button
  onClick={isButton ? handleClick(item, i) : undefined}
>
```

The `isButton` check is performed three times for three attributes.

**Suggested fix:** Use a spread for the conditional button props:
```tsx
const buttonProps = isButton ? {
  role: 'button' as const,
  type: 'button' as const,
  onClick: handleClick(item, i),
} : {};

// In JSX:
<Element
  className={clsx(classes?.series, !isVisible && classes?.hidden)}
  {...buttonProps}
>
```

**Estimated gzip savings:** ~12 bytes

---

## Finding 20: Similar `isButton ? ... : undefined` Pattern in PiecewiseColorLegend

**Type:** Verbose pattern

**File:** `packages/x-charts/src/ChartsLegend/PiecewiseColorLegend.tsx` lines 265-271

**Current code:**
```tsx
<Element
  role={onItemClick ? 'button' : undefined}
  type={onItemClick ? 'button' : undefined}
  onClick={
    // @ts-ignore onClick is only attached to a button
    onItemClick ? (event) => onItemClick(event, clickObject, index) : undefined
  }
  className={clsx(classes?.item, {
    [`${startClass}`]: index === 0,
    [`${endClass}`]: index === orderedColors.length - 1,
  })}
>
```

Same repeated check pattern as Finding 19.

**Suggested fix:** Use the same spread approach.

**Estimated gzip savings:** ~10 bytes

---

## Finding 21: Unnecessary Template Literal in clsx Call

**Type:** Verbose pattern

**File:** `packages/x-charts/src/ChartsLegend/PiecewiseColorLegend.tsx` lines 273-274

**Current code:**
```tsx
className={clsx(classes?.item, {
  [`${startClass}`]: index === 0,
  [`${endClass}`]: index === orderedColors.length - 1,
})}
```

The template literals `` [`${startClass}`] `` are equivalent to `[startClass]`.

**Suggested fix:**
```tsx
className={clsx(classes?.item, {
  [startClass]: index === 0,
  [endClass]: index === orderedColors.length - 1,
})}
```

**Estimated gzip savings:** ~4 bytes

---

## Finding 22: direction.ts Is a One-Line Type-Only File

**Type:** Import optimization

**File:** `packages/x-charts/src/ChartsLegend/direction.ts`

**Current code:**
```ts
export type Direction = 'vertical' | 'horizontal';
```

This file is imported in three other files:
- `ChartsLegend.tsx` (type import)
- `ContinuousColorLegend.tsx` (type import)
- `PiecewiseColorLegend.tsx` (type import)

Since this is a type-only export, it adds no runtime cost. However, it does cause an extra module resolution step in the bundler.

**Suggested fix:** Inline the type where used, or move it to a shared types file that already exists.

**Estimated gzip savings:** ~0 bytes (types are erased at compile time, but removing the module can slightly help bundler overhead)

---

## Finding 23: Repeated `{ location: 'legend' }` Object Literals

**Type:** Shared constant opportunity

**Files:**
- `packages/x-charts/src/ChartsLegend/ContinuousColorLegend.tsx` lines 237, 241
- `packages/x-charts/src/ChartsLegend/PiecewiseColorLegend.tsx` line 194

**Current code:**
```tsx
valueFormatter(minValue, { location: 'legend' })
// ...
valueFormatter(maxValue, { location: 'legend' })
// ...
(axisItem as ComputedAxis).valueFormatter?.(v, { location: 'legend' })
```

**Suggested fix:** Define a module-level constant:
```ts
const LEGEND_LOCATION = { location: 'legend' } as const;
```

**Estimated gzip savings:** ~8 bytes

---

## Finding 24: Duplicate PropTypes Definitions for ChartsTooltip and ChartsTooltipContainer

**Type:** Duplicate code

**Files:**
- `packages/x-charts/src/ChartsTooltip/ChartsTooltip.tsx` lines 40-285
- `packages/x-charts/src/ChartsTooltip/ChartsTooltipContainer.tsx` lines 286-535

**Issue:** The PropTypes definitions for both components are nearly identical. `ChartsTooltip.propTypes` has all the same Popper-related PropTypes as `ChartsTooltipContainer.propTypes` because `ChartsTooltipProps` extends `ChartsTooltipContainerProps`. The placement arrays are repeated 3 times within each file (in `placement`, `popperOptions.placement`, and `popperRef.current.state.placement`), and then duplicated across the two files.

The placement array alone:
```ts
PropTypes.oneOf([
  'auto-end', 'auto-start', 'auto',
  'bottom-end', 'bottom-start', 'bottom',
  'left-end', 'left-start', 'left',
  'right-end', 'right-start', 'right',
  'top-end', 'top-start', 'top',
])
```

Appears 6 times across the two files.

**Note:** PropTypes are auto-generated by `pnpm proptypes` so they cannot be manually edited. However, if production builds strip PropTypes via a Babel plugin, this is a dev-only concern.

**Estimated gzip savings:** ~250 bytes (if PropTypes could be deduplicated; gzip already helps here significantly though)

---

## Finding 25: Redundant `React.Fragment` Wrapper in ChartsLabelMark

**Type:** Verbose pattern

**File:** `packages/x-charts/src/ChartsLabel/ChartsLabelMark.tsx` lines 101, 124

**Current code:**
```tsx
<React.Fragment>
  {type === 'circle' && (...)}
  {type === 'line' && (...)}
  {type !== 'line' && type !== 'circle' && (...)}
</React.Fragment>
```

If the three branches were replaced with a ternary chain (as suggested in Finding 10), the `React.Fragment` wrapper becomes unnecessary since a ternary expression returns a single node.

**Suggested fix (combined with Finding 10):**
```tsx
{type === 'circle' ? (
  <svg viewBox="0 0 15 15">...</svg>
) : type === 'line' ? (
  <svg viewBox="0 0 16 8" ...>...</svg>
) : (
  <svg viewBox="0 0 13 13">...</svg>
)}
```

**Estimated gzip savings:** ~12 bytes (combined with Finding 10, total ~30 bytes for that section)

---

## Finding 26: `useUtilityClasses` Called Differently in Tooltip Files

**Type:** Inconsistent naming / missed dedup

**Files:**
- `packages/x-charts/src/ChartsTooltip/ChartsTooltip.tsx` line 27: `const classes = useUtilityClasses(propClasses);`
- `packages/x-charts/src/ChartsTooltip/ChartsTooltipContainer.tsx` line 138: `const classes = useUtilityClasses(propClasses);`
- `packages/x-charts/src/ChartsTooltip/ChartsAxisTooltipContent.tsx` line 28: `const classes = useUtilityClasses(props.classes);`
- `packages/x-charts/src/ChartsTooltip/ChartsItemTooltipContent.tsx` line 30: `const classes = useUtilityClasses(propClasses);`

In `ChartsTooltip.tsx`, `useUtilityClasses` is called and the result is passed to child components. Then the child components (`ChartsAxisTooltipContent` and `ChartsItemTooltipContent`) each call `useUtilityClasses` again. This means the same `composeClasses` computation runs twice for tooltip content components.

**Suggested fix:** Accept already-composed classes in child components instead of recomposing. Since `ChartsTooltip.tsx` already passes `classes` to children, children could use them directly without recomposing.

**Estimated gzip savings:** ~15 bytes (removing duplicate useUtilityClasses calls in children)

---

## Finding 27: `useMouseTracker` Is Deprecated But Still Exported

**Type:** Dead code

**File:** `packages/x-charts/src/ChartsTooltip/utils.tsx` lines 17-52

**Current code:**
```tsx
/**
 * @deprecated We recommend using vanilla JS to let popper track mouse position.
 */
export function useMouseTracker(): UseMouseTrackerReturnValue {
```

This function is marked `@deprecated` and its export from `index.ts` at line 16:
```ts
export { useMouseTracker } from './utils';
```

While it may still be needed for backward compatibility, it could be a candidate for removal in the next major version.

**Estimated gzip savings:** ~180 bytes (if removed)

---

## Finding 28: Inconsistent Return in useAxesTooltip forEach

**Type:** Dead code

**File:** `packages/x-charts/src/ChartsTooltip/useAxesTooltip.tsx` lines 148-149

**Current code:**
```tsx
.forEach(<SeriesT extends CartesianChartSeriesType>(seriesType: SeriesT) => {
  const seriesOfType = series[seriesType];
  if (!seriesOfType) {
    return [];  // <-- returns empty array from forEach callback, which is discarded
  }
  return seriesOfType.seriesOrder.forEach((seriesId) => {  // <-- returns undefined from forEach
```

`forEach` ignores return values. Both `return []` and `return seriesOfType.seriesOrder.forEach(...)` return values that are never used.

**Suggested fix:**
```tsx
.forEach(<SeriesT extends CartesianChartSeriesType>(seriesType: SeriesT) => {
  const seriesOfType = series[seriesType];
  if (!seriesOfType) {
    return;
  }
  seriesOfType.seriesOrder.forEach((seriesId) => {
```

**Estimated gzip savings:** ~6 bytes (same as Finding 18 -- duplicated finding, applies to both cartesian block at line 148 and polar block at line 197)

---

## Summary Table

| # | Finding | Type | Primary Files | Est. Gzip Savings |
|---|---------|------|---------------|-------------------|
| 1 | Duplicate StyledText in overlays | Duplicate code | ChartsLoadingOverlay, ChartsNoDataOverlay | ~180 bytes |
| 2 | Nearly-identical overlay components | Duplicate code | ChartsLoadingOverlay, ChartsNoDataOverlay | ~90 bytes |
| 3 | Unnecessary object spreads in PiecewiseColorLegend | Unnecessary object spreads | PiecewiseColorLegend.tsx | ~32 bytes |
| 4 | Repeated axis forEach pattern | Duplicate code | useAxesTooltip.tsx | ~60 bytes |
| 5 | Repeated series processing loop | Duplicate code | useAxesTooltip.tsx | ~50 bytes |
| 6 | Redundant null-check chain (continuous) | Verbose conditional | ContinuousColorLegend.tsx | ~4 bytes |
| 7 | Redundant null-check chain (piecewise) | Verbose conditional | PiecewiseColorLegend.tsx | ~4 bytes |
| 8 | Duplicate getLegendUtilityClass pattern | Duplicate code | 6 classes files | ~45 bytes |
| 9 | Unnecessary `as const` | Unnecessary type assertion | onClickContextBuilder.ts | ~3 bytes |
| 10 | Verbose conditional in ChartsLabelMark | Verbose conditional | ChartsLabelMark.tsx | ~18 bytes |
| 11 | Duplicate button-reset CSS | Duplicate code | ChartsLegend.tsx, PiecewiseColorLegend.tsx | ~40 bytes |
| 12 | Repeated `(theme.vars \|\| theme).palette.text.primary` | String repetition | Multiple files | ~15 bytes |
| 13 | Repeated `(theme.vars \|\| theme)` in ChartsTooltipTable | Shared constant opportunity | ChartsTooltipTable.ts | ~25 bytes |
| 14 | Repeated legend root base styles | Duplicate code | 3 legend root styled components | ~70 bytes |
| 15 | templateAreas called 6 times with same arg | Verbose pattern | ContinuousColorLegend.tsx | ~30 bytes |
| 16 | Repeated clsx(labelCell, cell) in tooltip content | Duplicate code | ChartsAxisTooltipContent, ChartsItemTooltipContent | ~20 bytes |
| 17 | Duplicate tooltip content JSX structure | Duplicate code | ChartsItemTooltipContent.tsx | ~35 bytes |
| 18 | Unnecessary `return []` in forEach | Dead code | useAxesTooltip.tsx | ~6 bytes |
| 19 | Repeated isButton ternaries in ChartsLegend | Verbose pattern | ChartsLegend.tsx | ~12 bytes |
| 20 | Repeated onItemClick ternaries in PiecewiseColorLegend | Verbose pattern | PiecewiseColorLegend.tsx | ~10 bytes |
| 21 | Unnecessary template literal in clsx | Verbose pattern | PiecewiseColorLegend.tsx | ~4 bytes |
| 22 | One-line type-only file (direction.ts) | Import optimization | direction.ts | ~0 bytes |
| 23 | Repeated `{ location: 'legend' }` object literal | Shared constant opportunity | ContinuousColorLegend, PiecewiseColorLegend | ~8 bytes |
| 24 | Duplicate PropTypes (auto-generated) | Duplicate code | ChartsTooltip.tsx, ChartsTooltipContainer.tsx | ~250 bytes |
| 25 | Redundant React.Fragment wrapper | Verbose pattern | ChartsLabelMark.tsx | ~12 bytes |
| 26 | useUtilityClasses called redundantly | Duplicate code | Tooltip content files | ~15 bytes |
| 27 | Deprecated useMouseTracker still exported | Dead code | utils.tsx | ~180 bytes |
| 28 | Inconsistent return in forEach | Dead code | useAxesTooltip.tsx | ~6 bytes |

**Total estimated gzip savings: ~1,284 bytes** (excluding Finding 24/PropTypes which are auto-generated and Finding 27 which requires a deprecation cycle)

**Top 5 highest-impact changes:**
1. Finding 1+2: Shared overlay StyledText and base component (~270 bytes)
2. Finding 14: Shared legend root base styles (~70 bytes)
3. Finding 4: Axis forEach helper in useAxesTooltip (~60 bytes)
4. Finding 5: Series processing dedup in useAxesTooltip (~50 bytes)
5. Finding 8: Shared utility class factory (~45 bytes)
