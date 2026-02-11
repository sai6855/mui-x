# Bundle Size Optimization Findings: `packages/x-charts/src/hooks/`

All `.ts` and `.tsx` source files in the `hooks/` directory (excluding test files) were read and analyzed. Findings are listed below.

---

## Finding 1: Duplicate `offsetRatio` Constants

**Files:**
- `packages/x-charts/src/hooks/useTicks.ts` (Lines 58-63)
- `packages/x-charts/src/hooks/useTicksGrouped.ts` (Lines 8-14)

**Current code in `useTicks.ts`:**
```typescript
const offsetRatio = {
  start: 0,
  extremities: 0,
  end: 1,
  middle: 0.5,
} as const;
```

**Current code in `useTicksGrouped.ts`:**
```typescript
const offsetRatio = {
  start: 0,
  extremities: 0,
  end: 1,
  middle: 0.5,
  tick: 0,
} as const;
```

**Issue:** Nearly identical constant defined in two separate files. `useTicksGrouped.ts` adds one extra key (`tick: 0`). Both could share a single definition.

**Suggested fix:** Define once in a shared location and import in both files. The `useTicks.ts` version can use the superset from `useTicksGrouped.ts` (adding `tick: 0` is harmless since it is never accessed by `useTicks.ts`), or extract a shared module:
```typescript
// hooks/tickOffsetRatio.ts
export const offsetRatio = {
  start: 0,
  extremities: 0,
  end: 1,
  middle: 0.5,
  tick: 0,
} as const;
```

**Estimated gzip savings:** ~40-50 bytes

---

## Finding 2: Repeated Identity Function `(p) => p` in Animation Hooks

**Files and lines:**
- `packages/x-charts/src/hooks/animation/useAnimateArea.ts` (Line 27)
- `packages/x-charts/src/hooks/animation/useAnimateBar.ts` (Line 63)
- `packages/x-charts/src/hooks/animation/useAnimateBarLabel.ts` (Line 59)
- `packages/x-charts/src/hooks/animation/useAnimateLine.ts` (Line 28)

**Current code (same in all four files):**
```typescript
transformProps: (p) => p,
```

**Issue:** Four animation hooks pass an identity function as `transformProps`. Each creates a new arrow function closure.

**Suggested fix:** Define a shared identity function and import it:
```typescript
// hooks/animation/utils.ts
export const identity = <T>(x: T): T => x;

// In each file:
import { identity } from './utils';
// ...
transformProps: identity,
```

**Estimated gzip savings:** ~25-35 bytes

---

## Finding 3: Repetitive Numeric Property Interpolator Functions

**Files:**
- `packages/x-charts/src/hooks/animation/useAnimateBar.ts` (Lines 17-31)
- `packages/x-charts/src/hooks/animation/useAnimateBarLabel.ts` (Lines 17-29)
- `packages/x-charts/src/hooks/animation/useAnimateGaugeValueArc.ts` (Lines 26-45)
- `packages/x-charts/src/hooks/animation/useAnimatePieArc.ts` (Lines 27-45)
- `packages/x-charts/src/hooks/animation/useAnimatePieArcLabel.ts` (Lines 32-53)

**Current code (example from `useAnimateBar.ts`):**
```typescript
function barPropsInterpolator(from: BarInterpolatedProps, to: BarInterpolatedProps) {
  const interpolateX = interpolateNumber(from.x, to.x);
  const interpolateY = interpolateNumber(from.y, to.y);
  const interpolateWidth = interpolateNumber(from.width, to.width);
  const interpolateHeight = interpolateNumber(from.height, to.height);

  return (t: number) => {
    return {
      x: interpolateX(t),
      y: interpolateY(t),
      width: interpolateWidth(t),
      height: interpolateHeight(t),
    };
  };
}
```

**Current code (example from `useAnimatePieArc.ts`):**
```typescript
function pieArcPropsInterpolator(from: PieArcInterpolatedProps, to: PieArcInterpolatedProps) {
  const interpolateStartAngle = interpolateNumber(from.startAngle, to.startAngle);
  const interpolateEndAngle = interpolateNumber(from.endAngle, to.endAngle);
  const interpolateInnerRadius = interpolateNumber(from.innerRadius, to.innerRadius);
  const interpolateOuterRadius = interpolateNumber(from.outerRadius, to.outerRadius);
  const interpolatePaddingAngle = interpolateNumber(from.paddingAngle, to.paddingAngle);
  const interpolateCornerRadius = interpolateNumber(from.cornerRadius, to.cornerRadius);

  return (t: number) => {
    return {
      startAngle: interpolateStartAngle(t),
      endAngle: interpolateEndAngle(t),
      innerRadius: interpolateInnerRadius(t),
      outerRadius: interpolateOuterRadius(t),
      paddingAngle: interpolatePaddingAngle(t),
      cornerRadius: interpolateCornerRadius(t),
    };
  };
}
```

**Issue:** Five files each define a function following the exact same pattern: for each numeric property, create an `interpolateNumber` call, then return a closure that applies each interpolator at time `t`. The structural code is identical; only property names differ.

**Suggested fix:** Create a generic numeric-properties interpolator:
```typescript
// hooks/animation/createNumericInterpolator.ts
import { interpolateNumber } from '@mui/x-charts-vendor/d3-interpolate';

export function createNumericInterpolator<T extends Record<string, number>>(
  from: T,
  to: T,
): (t: number) => T {
  const keys = Object.keys(from) as (keyof T)[];
  const interpolators = keys.map((k) => interpolateNumber(from[k] as number, to[k] as number));

  return (t: number) => {
    const result = {} as T;
    for (let i = 0; i < keys.length; i += 1) {
      (result as any)[keys[i]] = interpolators[i](t);
    }
    return result;
  };
}

// Usage in useAnimateBar.ts:
import { createNumericInterpolator } from './createNumericInterpolator';
// ...
createInterpolator: createNumericInterpolator,
```

This eliminates five separate interpolator functions (approximately 80 lines total).

**Estimated gzip savings:** ~60-90 bytes

---

## Finding 4: Duplicate `pieArcPropsInterpolator` / `pieArcLabelPropsInterpolator`

**Files:**
- `packages/x-charts/src/hooks/animation/useAnimatePieArc.ts` (Lines 27-45)
- `packages/x-charts/src/hooks/animation/useAnimatePieArcLabel.ts` (Lines 32-53)

**Current code (`useAnimatePieArc.ts`):**
```typescript
function pieArcPropsInterpolator(from: PieArcInterpolatedProps, to: PieArcInterpolatedProps) {
  const interpolateStartAngle = interpolateNumber(from.startAngle, to.startAngle);
  const interpolateEndAngle = interpolateNumber(from.endAngle, to.endAngle);
  const interpolateInnerRadius = interpolateNumber(from.innerRadius, to.innerRadius);
  const interpolateOuterRadius = interpolateNumber(from.outerRadius, to.outerRadius);
  const interpolatePaddingAngle = interpolateNumber(from.paddingAngle, to.paddingAngle);
  const interpolateCornerRadius = interpolateNumber(from.cornerRadius, to.cornerRadius);

  return (t: number) => {
    return {
      startAngle: interpolateStartAngle(t),
      endAngle: interpolateEndAngle(t),
      innerRadius: interpolateInnerRadius(t),
      outerRadius: interpolateOuterRadius(t),
      paddingAngle: interpolatePaddingAngle(t),
      cornerRadius: interpolateCornerRadius(t),
    };
  };
}
```

**Current code (`useAnimatePieArcLabel.ts`):**
```typescript
function pieArcLabelPropsInterpolator(
  from: PieArcLabelInterpolatedProps,
  to: PieArcLabelInterpolatedProps,
) {
  const interpolateStartAngle = interpolateNumber(from.startAngle, to.startAngle);
  const interpolateEndAngle = interpolateNumber(from.endAngle, to.endAngle);
  const interpolateInnerRadius = interpolateNumber(from.innerRadius, to.innerRadius);
  const interpolateOuterRadius = interpolateNumber(from.outerRadius, to.outerRadius);
  const interpolatePaddingAngle = interpolateNumber(from.paddingAngle, to.paddingAngle);
  const interpolateCornerRadius = interpolateNumber(from.cornerRadius, to.cornerRadius);

  return (t: number) => {
    return {
      startAngle: interpolateStartAngle(t),
      endAngle: interpolateEndAngle(t),
      innerRadius: interpolateInnerRadius(t),
      outerRadius: interpolateOuterRadius(t),
      paddingAngle: interpolatePaddingAngle(t),
      cornerRadius: interpolateCornerRadius(t),
    };
  };
}
```

**Issue:** These two interpolator functions are character-for-character identical in their body. They interpolate the exact same six properties (`startAngle`, `endAngle`, `innerRadius`, `outerRadius`, `paddingAngle`, `cornerRadius`). The only difference is the function name and type alias.

**Suggested fix:** Extract one shared function used by both hooks:
```typescript
// hooks/animation/pieInterpolator.ts
export function piePropsInterpolator(from: PieInterpolatedProps, to: PieInterpolatedProps) {
  // ... single implementation
}
```

**Estimated gzip savings:** ~40-55 bytes

---

## Finding 5: Redundant `as const` Type Assertions in Ternary

**File:** `packages/x-charts/src/hooks/animation/useAnimatePieArc.ts` (Line 79)

**Current code:**
```typescript
visibility: p.startAngle === p.endAngle ? ('hidden' as const) : ('visible' as const),
```

**Issue:** `as const` type assertions on string literals inside a ternary are unnecessary. TypeScript will infer the correct literal union type from the ternary without them.

**Suggested fix:**
```typescript
visibility: p.startAngle === p.endAngle ? 'hidden' : 'visible',
```

**Estimated gzip savings:** ~15 bytes

---

## Finding 6: Redundant Object Spread for `initialProps` in Pie Animation Hooks

**File:** `packages/x-charts/src/hooks/animation/useAnimatePieArc.ts` (Lines 51-68)

**Current code:**
```typescript
const initialProps = {
  startAngle: (props.startAngle + props.endAngle) / 2,
  endAngle: (props.startAngle + props.endAngle) / 2,
  innerRadius: props.innerRadius,
  outerRadius: props.outerRadius,
  paddingAngle: props.paddingAngle,
  cornerRadius: props.cornerRadius,
};

return useAnimate(
  {
    startAngle: props.startAngle,
    endAngle: props.endAngle,
    innerRadius: props.innerRadius,
    outerRadius: props.outerRadius,
    paddingAngle: props.paddingAngle,
    cornerRadius: props.cornerRadius,
  },
```

**Issue:** Both the `initialProps` object and the first argument to `useAnimate` manually copy four identical properties from `props` (`innerRadius`, `outerRadius`, `paddingAngle`, `cornerRadius`). Only `startAngle` and `endAngle` differ.

**Suggested fix:**
```typescript
const midAngle = (props.startAngle + props.endAngle) / 2;
const shared = {
  innerRadius: props.innerRadius,
  outerRadius: props.outerRadius,
  paddingAngle: props.paddingAngle,
  cornerRadius: props.cornerRadius,
};

return useAnimate(
  { startAngle: props.startAngle, endAngle: props.endAngle, ...shared },
  {
    initialProps: { startAngle: midAngle, endAngle: midAngle, ...shared },
    // ...
  },
);
```

**Estimated gzip savings:** ~35-45 bytes

---

## Finding 7: Same Redundancy in `useAnimatePieArcLabel`

**File:** `packages/x-charts/src/hooks/animation/useAnimatePieArcLabel.ts` (Lines 61-78)

**Current code:**
```typescript
const initialProps = {
  startAngle: (props.startAngle + props.endAngle) / 2,
  endAngle: (props.startAngle + props.endAngle) / 2,
  innerRadius: props.arcLabelRadius ?? props.innerRadius,
  outerRadius: props.arcLabelRadius ?? props.outerRadius,
  paddingAngle: props.paddingAngle,
  cornerRadius: props.cornerRadius,
};

return useAnimate(
  {
    startAngle: props.startAngle,
    endAngle: props.endAngle,
    innerRadius: props.arcLabelRadius ?? props.innerRadius,
    outerRadius: props.arcLabelRadius ?? props.outerRadius,
    paddingAngle: props.paddingAngle,
    cornerRadius: props.cornerRadius,
  },
```

**Issue:** Same pattern as Finding 6. Four properties are duplicated between `initialProps` and the first argument (`innerRadius`, `outerRadius`, `paddingAngle`, `cornerRadius`). The `arcLabelRadius ?? props.innerRadius` expression is also repeated.

**Suggested fix:**
```typescript
const midAngle = (props.startAngle + props.endAngle) / 2;
const shared = {
  innerRadius: props.arcLabelRadius ?? props.innerRadius,
  outerRadius: props.arcLabelRadius ?? props.outerRadius,
  paddingAngle: props.paddingAngle,
  cornerRadius: props.cornerRadius,
};

return useAnimate(
  { startAngle: props.startAngle, endAngle: props.endAngle, ...shared },
  {
    initialProps: { startAngle: midAngle, endAngle: midAngle, ...shared },
    // ...
  },
);
```

**Estimated gzip savings:** ~40-50 bytes

---

## Finding 8: Same Redundancy in `useAnimateGaugeValueArc`

**File:** `packages/x-charts/src/hooks/animation/useAnimateGaugeValueArc.ts` (Lines 53-83)

**Current code:**
```typescript
return useAnimate(
  {
    startAngle: props.startAngle,
    endAngle: props.endAngle,
    innerRadius: props.innerRadius,
    outerRadius: props.outerRadius,
    cornerRadius: props.cornerRadius,
  },
  {
    // ...
    initialProps: {
      startAngle: props.startAngle,
      endAngle: props.startAngle,
      innerRadius: props.innerRadius,
      outerRadius: props.outerRadius,
      cornerRadius: props.cornerRadius,
    },
    // ...
  },
);
```

**Issue:** Three properties (`innerRadius`, `outerRadius`, `cornerRadius`) are duplicated between the first argument and `initialProps`. Only `endAngle` differs.

**Suggested fix:**
```typescript
const shared = {
  startAngle: props.startAngle,
  innerRadius: props.innerRadius,
  outerRadius: props.outerRadius,
  cornerRadius: props.cornerRadius,
};

return useAnimate(
  { ...shared, endAngle: props.endAngle },
  {
    initialProps: { ...shared, endAngle: props.startAngle },
    // ...
  },
);
```

**Estimated gzip savings:** ~30-40 bytes

---

## Finding 9: Duplicate `useAnimateArea` and `useAnimateLine` Hooks

**Files:**
- `packages/x-charts/src/hooks/animation/useAnimateArea.ts` (Lines 18-32)
- `packages/x-charts/src/hooks/animation/useAnimateLine.ts` (Lines 18-32)

**Current code (`useAnimateArea.ts`):**
```typescript
export function useAnimateArea(props: UseAnimateAreaParams): UseAnimatedAreaReturn {
  return useAnimate(
    { d: props.d },
    {
      createInterpolator: (lastProps, newProps) => {
        const interpolate = interpolateString(lastProps.d, newProps.d);
        return (t) => ({ d: interpolate(t) });
      },
      applyProps: (element: SVGPathElement, { d }) => element.setAttribute('d', d),
      transformProps: (p) => p,
      skip: props.skipAnimation,
      ref: props.ref,
    },
  );
}
```

**Current code (`useAnimateLine.ts`):**
```typescript
export function useAnimateLine(props: UseAnimateLineParams): UseAnimatedReturnValue {
  return useAnimate(
    { d: props.d },
    {
      createInterpolator: (lastProps, newProps) => {
        const interpolate = interpolateString(lastProps.d, newProps.d);
        return (t) => ({ d: interpolate(t) });
      },
      applyProps: (element: SVGPathElement, { d }) => element.setAttribute('d', d),
      skip: props.skipAnimation,
      transformProps: (p) => p,
      ref: props.ref,
    },
  );
}
```

**Issue:** These two functions are functionally identical. Both animate an SVG path `d` attribute using string interpolation. The only differences are the function name, parameter type alias, and return type alias. The entire body is the same.

**Suggested fix:** Create a shared path animation helper:
```typescript
// hooks/animation/useAnimatePath.ts
function useAnimatePath(props: { d: string; skipAnimation?: boolean; ref?: React.Ref<SVGPathElement> }) {
  return useAnimate(
    { d: props.d },
    {
      createInterpolator: (lastProps, newProps) => {
        const interpolate = interpolateString(lastProps.d, newProps.d);
        return (t) => ({ d: interpolate(t) });
      },
      applyProps: (element: SVGPathElement, { d }) => element.setAttribute('d', d),
      transformProps: (p) => p,
      skip: props.skipAnimation,
      ref: props.ref,
    },
  );
}

// useAnimateArea.ts
export function useAnimateArea(props: UseAnimateAreaParams) {
  return useAnimatePath(props);
}

// useAnimateLine.ts
export function useAnimateLine(props: UseAnimateLineParams) {
  return useAnimatePath(props);
}
```

**Estimated gzip savings:** ~50-65 bytes

---

## Finding 10: Duplicate `applyProps` Patterns Across Bar and BarLabel Animation Hooks

**Files:**
- `packages/x-charts/src/hooks/animation/useAnimateBar.ts` (Lines 57-62)
- `packages/x-charts/src/hooks/animation/useAnimateBarLabel.ts` (Lines 60-65)

**Current code (`useAnimateBar.ts`):**
```typescript
applyProps(element, animatedProps) {
  element.setAttribute('x', animatedProps.x.toString());
  element.setAttribute('y', animatedProps.y.toString());
  element.setAttribute('width', animatedProps.width.toString());
  element.setAttribute('height', animatedProps.height.toString());
},
```

**Current code (`useAnimateBarLabel.ts`):**
```typescript
applyProps(element, animatedProps) {
  element.setAttribute('x', animatedProps.x.toString());
  element.setAttribute('y', animatedProps.y.toString());
  element.setAttribute('width', animatedProps.width.toString());
  element.setAttribute('height', animatedProps.height.toString());
},
```

**Issue:** Identical `applyProps` function body in two files, setting the same four SVG attributes with the same `.toString()` calls.

**Suggested fix:** Extract to shared utility:
```typescript
// hooks/animation/applyRectProps.ts
export function applyRectProps(element: Element, props: { x: number; y: number; width: number; height: number }) {
  element.setAttribute('x', props.x.toString());
  element.setAttribute('y', props.y.toString());
  element.setAttribute('width', props.width.toString());
  element.setAttribute('height', props.height.toString());
}
```

**Estimated gzip savings:** ~30-40 bytes

---

## Finding 11: Repeated `element.setAttribute` + `.toString()` Pattern

**Files:**
- `packages/x-charts/src/hooks/animation/useAnimateBar.ts` (Lines 58-61)
- `packages/x-charts/src/hooks/animation/useAnimateBarLabel.ts` (Lines 61-64)
- `packages/x-charts/src/hooks/animation/useAnimatePieArcLabel.ts` (Lines 93-94)

**Current code:**
```typescript
element.setAttribute('x', animatedProps.x.toString());
element.setAttribute('y', animatedProps.y.toString());
element.setAttribute('width', animatedProps.width.toString());
element.setAttribute('height', animatedProps.height.toString());
```

And in `useAnimatePieArcLabel.ts`:
```typescript
element.setAttribute('x', x.toString());
element.setAttribute('y', y.toString());
```

**Issue:** `.toString()` is called on every numeric value before passing to `setAttribute`. String concatenation or template literals are shorter than `.toString()`.

**Suggested fix:** Use string coercion via template literal or concatenation:
```typescript
element.setAttribute('x', '' + animatedProps.x);
element.setAttribute('y', '' + animatedProps.y);
```
Or even shorter with template literals if used consistently:
```typescript
element.setAttribute('x', `${animatedProps.x}`);
```

**Estimated gzip savings:** ~15-20 bytes (across all occurrences)

---

## Finding 12: Repeated Series Hook Structure (useBarSeries, useLineSeries, useScatterSeries, useRadarSeries, usePieSeries)

**Files:**
- `packages/x-charts/src/hooks/useBarSeries.ts` (Lines 1-46)
- `packages/x-charts/src/hooks/useLineSeries.ts` (Lines 1-46)
- `packages/x-charts/src/hooks/useScatterSeries.ts` (Lines 1-45)
- `packages/x-charts/src/hooks/useRadarSeries.ts` (Lines 1-45)
- `packages/x-charts/src/hooks/usePieSeries.ts` (Lines 1-48)

**Current code (example from `useBarSeries.ts`):**
```typescript
'use client';
import { type ProcessedSeries } from '../internals/plugins/corePlugins/useChartSeries/useChartSeries.types';
import { type SeriesId } from '../models/seriesType/common';
import { type ChartSeriesDefaultized } from '../models/seriesType/config';
import { useSeriesOfType, useAllSeriesOfType } from '../internals/seriesSelectorOfType';

export type UseBarSeriesReturnValue = ChartSeriesDefaultized<'bar'>;
export type UseBarSeriesContextReturnValue = ProcessedSeries['bar'];

export function useBarSeries(seriesId: SeriesId): UseBarSeriesReturnValue | undefined;
export function useBarSeries(): UseBarSeriesReturnValue[];
export function useBarSeries(seriesIds: SeriesId[]): UseBarSeriesReturnValue[];
export function useBarSeries(seriesIds?: SeriesId | SeriesId[]) {
  return useSeriesOfType('bar', seriesIds);
}

export function useBarSeriesContext(): UseBarSeriesContextReturnValue {
  return useAllSeriesOfType('bar');
}
```

**Issue:** All five series hook files follow the exact same structure. The only differences are the series type string (`'bar'`, `'line'`, `'scatter'`, `'radar'`, `'pie'`) and the corresponding type aliases. Each file has the same imports, same overload signatures, same implementation. This is approximately 40 lines of near-identical code per file, totaling ~200 lines.

**Suggested fix:** Create a factory function:
```typescript
// hooks/createSeriesHooks.ts
export function createSeriesHook<T extends ChartSeriesType>(type: T) {
  function hook(seriesIds?: SeriesId | SeriesId[]) {
    return useSeriesOfType(type, seriesIds);
  }
  return hook;
}
export function createSeriesContextHook<T extends ChartSeriesType>(type: T) {
  return () => useAllSeriesOfType(type);
}

// useBarSeries.ts
export const useBarSeries = createSeriesHook('bar');
export const useBarSeriesContext = createSeriesContextHook('bar');
```

Note: TypeScript overload signatures would need to be preserved for public API, so savings apply mainly to the runtime code, not the type declarations.

**Estimated gzip savings:** ~80-120 bytes

---

## Finding 13: Repeated `const store = useStore()` + `store.use(selector)` Pattern

**Files (every file using this pattern):**
- `packages/x-charts/src/hooks/useAxis.ts` (Lines 41-42, 63-64, 88-89, 115-116, 139-140, 161-162, 189-190, 219-220)
- `packages/x-charts/src/hooks/useChartId.ts` (Lines 10-11)
- `packages/x-charts/src/hooks/useDrawingArea.ts` (Lines 40-41)
- `packages/x-charts/src/hooks/useSeries.ts` (Lines 13-14)
- `packages/x-charts/src/hooks/useDataset.ts` (Lines 12-13)
- `packages/x-charts/src/hooks/useFocusedItem.ts` (Lines 9-10)
- `packages/x-charts/src/hooks/useSkipAnimation.ts` (Lines 11-12)
- `packages/x-charts/src/hooks/useBrush.ts` (Lines 16-18)
- `packages/x-charts/src/hooks/useIsItemFocused.ts` (Lines 18-19)
- `packages/x-charts/src/hooks/useItemHighlighted.ts` (Lines 36-39)
- `packages/x-charts/src/hooks/useItemHighlightedGetter.tsx` (Lines 18-21)
- `packages/x-charts/src/hooks/useZAxis.ts` (Lines 9-13)
- `packages/x-charts/src/hooks/useLegend.ts` (Lines 36-37)
- `packages/x-charts/src/hooks/usePieSeries.ts` (Lines 55-57)
- `packages/x-charts/src/hooks/useAxisSystem.tsx` (Lines 17-19)

**Current code (example from `useChartId.ts`):**
```typescript
export function useChartId(): string | undefined {
  const store = useStore();
  return store.use(selectorChartId);
}
```

**Issue:** The two-line pattern `const store = useStore(); return store.use(selector);` is repeated in nearly every simple hook. While each hook legitimately exists as a separate export, the intermediate `store` variable is unnecessary.

**Suggested fix:** Inline the store usage where only a single selector is called:
```typescript
export function useChartId(): string | undefined {
  return useStore().use(selectorChartId);
}
```

This saves one `const store = ` declaration per occurrence. Across ~15 hooks with this pattern, the savings are modest but consistent.

**Estimated gzip savings:** ~30-40 bytes total

---

## Finding 14: Repeated `useStore<[UseChartCartesianAxisSignature]>()` Calls in `useAxis.ts`

**File:** `packages/x-charts/src/hooks/useAxis.ts` (Lines 41, 63, 88, 115)

**Current code:**
```typescript
export function useXAxes() {
  const store = useStore<[UseChartCartesianAxisSignature]>();
  const { axis: xAxis, axisIds: xAxisIds } = store.use(selectorChartXAxis);
  return { xAxis, xAxisIds };
}

export function useYAxes() {
  const store = useStore<[UseChartCartesianAxisSignature]>();
  const { axis: yAxis, axisIds: yAxisIds } = store.use(selectorChartYAxis);
  return { yAxis, yAxisIds };
}

export function useXAxis<T extends keyof AxisScaleConfig>(axisId?: AxisId) {
  const store = useStore<[UseChartCartesianAxisSignature]>();
  const { axis: xAxis, axisIds: xAxisIds } = store.use(selectorChartXAxis);
  const id = axisId ?? xAxisIds[0];
  return xAxis[id] as ComputedAxis<T, any, ChartsXAxisProps>;
}

export function useYAxis<T extends keyof AxisScaleConfig>(axisId?: AxisId) {
  const store = useStore<[UseChartCartesianAxisSignature]>();
  const { axis: yAxis, axisIds: yAxisIds } = store.use(selectorChartYAxis);
  const id = axisId ?? yAxisIds[0];
  return yAxis[id] as ComputedAxis<T, any, ChartsYAxisProps>;
}
```

**Issue:** `useStore<[UseChartCartesianAxisSignature]>()` is called four times in the same file with the same type parameter. `useXAxis` duplicates the selector call from `useXAxes`; `useYAxis` duplicates the selector call from `useYAxes`.

**Suggested fix:** Have `useXAxis` call `useXAxes` instead of duplicating the store access:
```typescript
export function useXAxis<T extends keyof AxisScaleConfig>(axisId?: AxisId) {
  const { xAxis, xAxisIds } = useXAxes();
  const id = axisId ?? xAxisIds[0];
  return xAxis[id] as ComputedAxis<T, any, ChartsXAxisProps>;
}

export function useYAxis<T extends keyof AxisScaleConfig>(axisId?: AxisId) {
  const { yAxis, yAxisIds } = useYAxes();
  const id = axisId ?? yAxisIds[0];
  return yAxis[id] as ComputedAxis<T, any, ChartsYAxisProps>;
}
```

Similarly for the polar axis hooks: `useRotationAxis` should call `useRotationAxes`, and `useRadiusAxis` should call `useRadiusAxes`.

**Estimated gzip savings:** ~40-55 bytes

---

## Finding 15: Duplicated `getInteractionItemProps` Logic in `useInteractionItemProps.ts`

**File:** `packages/x-charts/src/hooks/useInteractionItemProps.ts` (Lines 22-109)

**Current code:**
```typescript
export const useInteractionItemProps = <SeriesType extends ChartSeriesType>(
  data: SeriesItemIdentifierWithData<SeriesType>,
  skip?: boolean,
) => {
  // ...
  const onPointerEnter = useEventCallback(() => {
    interactionActive.current = true;
    instance.setLastUpdateSource('pointer');
    instance.setTooltipItem(data);
    instance.setHighlight(
      // @ts-ignore
      data.type === 'sankey' ? data : { seriesId: data.seriesId, dataIndex: data.dataIndex },
    );
  });

  const onPointerLeave = useEventCallback(() => {
    interactionActive.current = false;
    instance.removeTooltipItem(data);
    instance.clearHighlight();
  });
  // ...
};

export function getInteractionItemProps(instance, item) {
  function onPointerEnter() {
    if (!item) { return; }
    instance.setLastUpdateSource('pointer');
    instance.setTooltipItem(item);
    instance.setHighlight(
      // @ts-ignore
      item.type === 'sankey' ? item : { seriesId: item.seriesId, dataIndex: item.dataIndex },
    );
  }

  function onPointerLeave() {
    if (!item) { return; }
    instance.removeTooltipItem(item);
    instance.clearHighlight();
  }
  // ...
}
```

**Issue:** The `onPointerEnter` and `onPointerLeave` logic is duplicated between the hook version (`useInteractionItemProps`) and the non-hook version (`getInteractionItemProps`). Both contain the same `setLastUpdateSource`, `setTooltipItem`, `setHighlight`, `removeTooltipItem`, `clearHighlight` calls and the same sankey type check.

**Suggested fix:** Extract shared logic into helpers:
```typescript
function enterItem(instance, item) {
  instance.setLastUpdateSource('pointer');
  instance.setTooltipItem(item);
  instance.setHighlight(
    item.type === 'sankey' ? item : { seriesId: item.seriesId, dataIndex: item.dataIndex },
  );
}

function leaveItem(instance, item) {
  instance.removeTooltipItem(item);
  instance.clearHighlight();
}
```

**Estimated gzip savings:** ~35-45 bytes

---

## Finding 16: Redundant `!== undefined` Check Pattern

**File:** `packages/x-charts/src/hooks/useAxisSystem.tsx` (Lines 21, 24)

**Current code:**
```typescript
if (rawRotationAxis !== undefined) {
  return 'polar';
}
if (rawXAxis !== undefined) {
  return 'cartesian';
}
return 'none';
```

**Issue:** `!== undefined` checks could be replaced with looser truthiness checks if the values are known to be either an object or `undefined` (never `null`, `0`, `''`, or `false`).

**Suggested fix:**
```typescript
if (rawRotationAxis) {
  return 'polar';
}
if (rawXAxis) {
  return 'cartesian';
}
return 'none';
```

Note: Only valid if the selectors never return falsy non-undefined values. Given these appear to be axis configuration objects, this should be safe.

**Estimated gzip savings:** ~10-15 bytes

---

## Finding 17: `useAnimateBar` Verbose `initialProps` with Repeated `props.layout === 'vertical'` Check

**File:** `packages/x-charts/src/hooks/animation/useAnimateBar.ts` (Lines 41-46)

**Current code:**
```typescript
const initialProps = {
  x: props.layout === 'vertical' ? props.x : props.xOrigin,
  y: props.layout === 'vertical' ? props.yOrigin : props.y,
  width: props.layout === 'vertical' ? props.width : 0,
  height: props.layout === 'vertical' ? 0 : props.height,
};
```

**Issue:** `props.layout === 'vertical'` is evaluated four times. While JavaScript engines optimize this, the string `props.layout === 'vertical'` is repeated four times in source, hurting gzip slightly due to the long repeated check.

**Suggested fix:**
```typescript
const isVertical = props.layout === 'vertical';
const initialProps = {
  x: isVertical ? props.x : props.xOrigin,
  y: isVertical ? props.yOrigin : props.y,
  width: isVertical ? props.width : 0,
  height: isVertical ? 0 : props.height,
};
```

**Estimated gzip savings:** ~15-20 bytes

---

## Finding 18: Verbose Object Construction in `useAnimateBar`

**File:** `packages/x-charts/src/hooks/animation/useAnimateBar.ts` (Lines 49-54)

**Current code:**
```typescript
return useAnimate(
  {
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
  },
```

**Issue:** Manually copying four properties from `props` into a new object when destructuring or a pick helper could be used.

**Suggested fix:**
```typescript
const { x, y, width, height } = props;
return useAnimate(
  { x, y, width, height },
```

This uses shorthand property notation after destructuring, which compresses better under gzip due to shorter repeated tokens.

**Estimated gzip savings:** ~10-15 bytes

---

## Finding 19: Repeated `useXAxisCoordinates` / `useYAxisCoordinates` Structure

**File:** `packages/x-charts/src/hooks/useAxisCoordinates.ts` (Lines 49-65, 102-121)

**Current code:**
```typescript
export function useXAxisCoordinates(axisId: AxisId): AxisCoordinates | null {
  const { xAxis: xAxes } = useXAxes();
  const drawingArea = useDrawingArea();
  const axis = xAxes[axisId];

  // FIXME(v9): Remove
  // eslint-disable-next-line mui/material-ui-name-matches-component-name
  const themedProps = useThemeProps({ props: axis, name: 'MuiChartsXAxis' });

  if (!axis) {
    return null;
  }

  const defaultizedProps = { ...defaultProps, ...themedProps };

  return getXAxisCoordinates(drawingArea, defaultizedProps);
}

export function useYAxisCoordinates(axisId: AxisId): AxisCoordinates | null {
  const { yAxis: yAxes } = useYAxes();
  const drawingArea = useDrawingArea();
  const axis = yAxes[axisId];

  // FIXME(v9): Remove
  // eslint-disable-next-line mui/material-ui-name-matches-component-name
  const themedProps = useThemeProps({ props: axis, name: 'MuiChartsYAxis' });

  if (!axis) {
    return null;
  }

  const defaultizedProps = {
    ...defaultProps,
    ...themedProps,
  };

  return getYAxisCoordinates(drawingArea, defaultizedProps);
}
```

**Issue:** These two functions are structurally identical. The pattern (get axes, get drawing area, look up axis, get themed props, merge with defaults, call coordinate getter) is duplicated. The same pattern also appears in `useAxisTicks.ts`.

**Suggested fix:** Create a helper that abstracts the common pattern:
```typescript
function useAxisCoordinatesHelper(
  axesFn: () => { [key: string]: any },
  axisId: AxisId,
  themeName: string,
  coordinatesFn: Function,
) {
  const axes = axesFn();
  const drawingArea = useDrawingArea();
  const axis = axes[axisId];
  const themedProps = useThemeProps({ props: axis, name: themeName });
  if (!axis) return null;
  return coordinatesFn(drawingArea, { ...defaultProps, ...themedProps });
}
```

**Estimated gzip savings:** ~40-55 bytes

---

## Finding 20: Repeated `useXAxisTicks` / `useYAxisTicks` Structure

**File:** `packages/x-charts/src/hooks/useAxisTicks.ts` (Lines 12-69)

**Current code:**
```typescript
export function useXAxisTicks(axisId: AxisId): TickItem[] {
  const { xAxis: xAxes } = useXAxes();
  const axis = xAxes[axisId];

  // eslint-disable-next-line mui/material-ui-name-matches-component-name
  const themedProps = useThemeProps({ props: axis, name: 'MuiChartsXAxis' });

  const defaultizedProps = {
    ...defaultProps,
    ...themedProps,
  };

  return useTicks({
    scale: axis.scale,
    tickNumber: axis.tickNumber,
    valueFormatter: defaultizedProps.valueFormatter,
    tickInterval: defaultizedProps.tickInterval,
    tickPlacement: defaultizedProps.tickPlacement,
    tickLabelPlacement: defaultizedProps.tickLabelPlacement,
    tickSpacing: defaultizedProps.tickSpacing,
    direction: 'x',
    ordinalTimeTicks:
      'ordinalTimeTicks' in defaultizedProps ? defaultizedProps.ordinalTimeTicks : undefined,
  });
}

export function useYAxisTicks(axisId: AxisId): TickItem[] {
  const { yAxis: yAxes } = useYAxes();
  const axis = yAxes[axisId];

  // eslint-disable-next-line mui/material-ui-name-matches-component-name
  const themedProps = useThemeProps({ props: axis, name: 'MuiChartsYAxis' });

  const defaultizedProps = {
    ...defaultProps,
    ...themedProps,
  };

  return useTicks({
    scale: axis.scale,
    tickNumber: axis.tickNumber,
    valueFormatter: defaultizedProps.valueFormatter,
    tickInterval: defaultizedProps.tickInterval,
    tickPlacement: defaultizedProps.tickPlacement,
    tickLabelPlacement: defaultizedProps.tickLabelPlacement,
    tickSpacing: defaultizedProps.tickSpacing,
    direction: 'y',
    // @ts-expect-error
    ordinalTimeTicks: defaultizedProps.ordinalTimeTicks,
  });
}
```

**Issue:** Both functions follow the same pattern: get axis, theme it, merge defaults, pass to `useTicks`. Eight of the nine `useTicks` properties are read from the same `defaultizedProps` and `axis` objects. Only `direction` differs between the two.

**Suggested fix:** Extract shared logic:
```typescript
function useAxisTicksHelper(
  axes: Record<AxisId, any>,
  axisId: AxisId,
  themeName: string,
  direction: 'x' | 'y',
): TickItem[] {
  const axis = axes[axisId];
  const themedProps = useThemeProps({ props: axis, name: themeName });
  const d = { ...defaultProps, ...themedProps };

  return useTicks({
    scale: axis.scale,
    tickNumber: axis.tickNumber,
    valueFormatter: d.valueFormatter,
    tickInterval: d.tickInterval,
    tickPlacement: d.tickPlacement,
    tickLabelPlacement: d.tickLabelPlacement,
    tickSpacing: d.tickSpacing,
    direction,
    ordinalTimeTicks: 'ordinalTimeTicks' in d ? d.ordinalTimeTicks : undefined,
  });
}
```

**Estimated gzip savings:** ~45-60 bytes

---

## Finding 21: Verbose Error Message Construction in `useChartsLocalization`

**File:** `packages/x-charts/src/hooks/useChartsLocalization.ts` (Lines 8-14)

**Current code:**
```typescript
throw new Error(
  [
    'MUI X Charts: Can not find the charts localization context.',
    'It looks like you forgot to wrap your component in ChartsLocalizationProvider.',
    'This can also happen if you are bundling multiple versions of the `@mui/x-charts` package',
  ].join('\n'),
);
```

**Issue:** Creating an array and calling `.join('\n')` is more verbose than string concatenation.

**Suggested fix:**
```typescript
throw new Error(
  'MUI X Charts: Can not find the charts localization context.\n' +
  'It looks like you forgot to wrap your component in ChartsLocalizationProvider.\n' +
  'This can also happen if you are bundling multiple versions of the `@mui/x-charts` package'
);
```

**Estimated gzip savings:** ~15-20 bytes

---

## Finding 22: Arrow Function Export in `useChartsLocalization`

**File:** `packages/x-charts/src/hooks/useChartsLocalization.ts` (Line 5)

**Current code:**
```typescript
export const useChartsLocalization = () => {
```

**Issue:** Every other hook in this directory uses `export function` syntax. This one uses `export const ... = () => {`. The `export function` form is marginally smaller and consistent with the rest of the codebase.

**Suggested fix:**
```typescript
export function useChartsLocalization() {
```

**Estimated gzip savings:** ~5-8 bytes

---

## Finding 23: `useAnimate.ts` Redundant `transform` Variable

**File:** `packages/x-charts/src/hooks/animation/useAnimate.ts` (Line 93)

**Current code:**
```typescript
const transform = transformProps ?? ((p) => p);

const [animateRef, lastInterpolatedProps] = useAnimateInternal<Props, Elem>(props, {
  initialProps,
  createInterpolator,
  applyProps: (element, animatedProps) => applyProps(element, transform(animatedProps)),
  skip,
});

const usedProps = skip ? transformProps(props) : transformProps(lastInterpolatedProps);
```

**Issue:** `transform` is defined as `transformProps ?? ((p) => p)` but is only used once in the `applyProps` callback. Meanwhile, `transformProps` is used directly on line 102. If `transformProps` can be undefined, line 102 would fail. If it cannot be undefined (the interface says it's required), then the `?? ((p) => p)` fallback is dead code.

**Suggested fix:** Remove the fallback since `transformProps` is a required parameter in `UseAnimateParams`:
```typescript
const [animateRef, lastInterpolatedProps] = useAnimateInternal<Props, Elem>(props, {
  initialProps,
  createInterpolator,
  applyProps: (element, animatedProps) => applyProps(element, transformProps(animatedProps)),
  skip,
});
```

**Estimated gzip savings:** ~25-30 bytes

---

## Finding 24: `useAnimateBarLabel` Redundant Width/Height in `initialProps` and `currentProps`

**File:** `packages/x-charts/src/hooks/animation/useAnimateBarLabel.ts` (Lines 44-55)

**Current code:**
```typescript
const initialProps = {
  x: initialX,
  y: initialY,
  width: props.width,
  height: props.height,
};
const currentProps = {
  x: currentX,
  y: currentY,
  width: props.width,
  height: props.height,
};
```

**Issue:** `width: props.width` and `height: props.height` are duplicated in both objects.

**Suggested fix:**
```typescript
const size = { width: props.width, height: props.height };
const initialProps = { x: initialX, y: initialY, ...size };
const currentProps = { x: currentX, y: currentY, ...size };
```

**Estimated gzip savings:** ~15-20 bytes

---

## Finding 25: `getOutsidePlacement` Redundant Initializations

**File:** `packages/x-charts/src/hooks/animation/useAnimateBarLabel.ts` (Lines 83-124)

**Current code:**
```typescript
function getOutsidePlacement(props: UseAnimateBarLabelParams) {
  let initialY = 0;
  let currentY = 0;
  let initialX = 0;
  let currentX = 0;

  if (props.layout === 'vertical') {
    const shouldPlaceAbove = props.y < props.yOrigin;

    if (shouldPlaceAbove) {
      initialY = props.yOrigin - LABEL_OFFSET;
      currentY = props.y - LABEL_OFFSET;
    } else {
      initialY = props.yOrigin + LABEL_OFFSET;
      currentY = props.y + props.height + LABEL_OFFSET;
    }

    return {
      initialX: props.x + props.width / 2,
      currentX: props.x + props.width / 2,
      initialY,
      currentY,
    };
  }

  const shouldPlaceToTheLeft = props.x < props.xOrigin;

  if (shouldPlaceToTheLeft) {
    initialX = props.xOrigin;
    currentX = props.x - LABEL_OFFSET;
  } else {
    initialX = props.xOrigin;
    currentX = props.x + props.width + LABEL_OFFSET;
  }

  return {
    initialX,
    currentX,
    initialY: props.y + props.height / 2,
    currentY: props.y + props.height / 2,
  };
}
```

**Issue:** `initialX` and `currentX` are initialized to `0` but immediately overwritten in the non-vertical branch. `initialY` and `currentY` are initialized to `0` but overwritten in the vertical branch. The initial `= 0` assignments are dead code.

Additionally, in the horizontal branch, `initialX = props.xOrigin` is the same in both the `if` and `else`, so it can be hoisted.

Also, `props.x + props.width / 2` is computed twice in the vertical return.

**Suggested fix:**
```typescript
function getOutsidePlacement(props: UseAnimateBarLabelParams) {
  if (props.layout === 'vertical') {
    const shouldPlaceAbove = props.y < props.yOrigin;
    const centerX = props.x + props.width / 2;

    return {
      initialX: centerX,
      currentX: centerX,
      initialY: shouldPlaceAbove ? props.yOrigin - LABEL_OFFSET : props.yOrigin + LABEL_OFFSET,
      currentY: shouldPlaceAbove ? props.y - LABEL_OFFSET : props.y + props.height + LABEL_OFFSET,
    };
  }

  const shouldPlaceToTheLeft = props.x < props.xOrigin;
  const centerY = props.y + props.height / 2;

  return {
    initialX: props.xOrigin,
    currentX: shouldPlaceToTheLeft ? props.x - LABEL_OFFSET : props.x + props.width + LABEL_OFFSET,
    initialY: centerY,
    currentY: centerY,
  };
}
```

**Estimated gzip savings:** ~25-35 bytes

---

## Finding 26: Repeated `(props.startAngle + props.endAngle) / 2` Expression

**Files:**
- `packages/x-charts/src/hooks/animation/useAnimatePieArc.ts` (Lines 52-53)
- `packages/x-charts/src/hooks/animation/useAnimatePieArcLabel.ts` (Lines 62-63)

**Current code (both files):**
```typescript
startAngle: (props.startAngle + props.endAngle) / 2,
endAngle: (props.startAngle + props.endAngle) / 2,
```

**Issue:** The expression `(props.startAngle + props.endAngle) / 2` is computed twice in each file for both `startAngle` and `endAngle` of the initial props.

**Suggested fix:**
```typescript
const midAngle = (props.startAngle + props.endAngle) / 2;
// ...
startAngle: midAngle,
endAngle: midAngle,
```

**Estimated gzip savings:** ~15-20 bytes per file (2 files)

---

## Summary Table

| # | Finding | Category | Files | Est. Savings |
|---|---------|----------|-------|-------------|
| 1 | Duplicate `offsetRatio` constants | Duplicate Code | 2 | 40-50 bytes |
| 2 | Repeated identity function `(p) => p` | Duplicate Code | 4 | 25-35 bytes |
| 3 | Repetitive numeric property interpolators | Duplicate Code | 5 | 60-90 bytes |
| 4 | Duplicate pie arc interpolator functions | Duplicate Code | 2 | 40-55 bytes |
| 5 | Redundant `as const` in ternary | Unnecessary Type Assertion | 1 | 15 bytes |
| 6 | Redundant `initialProps` overlap in `useAnimatePieArc` | Unnecessary Object Spread | 1 | 35-45 bytes |
| 7 | Redundant `initialProps` overlap in `useAnimatePieArcLabel` | Unnecessary Object Spread | 1 | 40-50 bytes |
| 8 | Redundant `initialProps` overlap in `useAnimateGaugeValueArc` | Unnecessary Object Spread | 1 | 30-40 bytes |
| 9 | Duplicate `useAnimateArea` / `useAnimateLine` bodies | Duplicate Code | 2 | 50-65 bytes |
| 10 | Duplicate `applyProps` for bar rect attributes | Duplicate Code | 2 | 30-40 bytes |
| 11 | `.toString()` vs `'' +` for setAttribute | Verbose Pattern | 3 | 15-20 bytes |
| 12 | Repeated series hook structure | Duplicate Code | 5 | 80-120 bytes |
| 13 | Repeated `const store = useStore(); store.use(...)` | Verbose Pattern | 15 | 30-40 bytes |
| 14 | Repeated `useStore<[UseChartCartesianAxisSignature]>()` in `useAxis.ts` | Duplicate Code | 1 | 40-55 bytes |
| 15 | Duplicated interaction item enter/leave logic | Duplicate Code | 1 | 35-45 bytes |
| 16 | `!== undefined` where truthiness check suffices | Verbose Pattern | 1 | 10-15 bytes |
| 17 | Repeated `props.layout === 'vertical'` check | Verbose Pattern | 1 | 15-20 bytes |
| 18 | Verbose prop copying in `useAnimateBar` | Verbose Pattern | 1 | 10-15 bytes |
| 19 | Duplicate `useXAxisCoordinates` / `useYAxisCoordinates` structure | Duplicate Code | 1 | 40-55 bytes |
| 20 | Duplicate `useXAxisTicks` / `useYAxisTicks` structure | Duplicate Code | 1 | 45-60 bytes |
| 21 | Array `.join('\n')` for error message | Verbose Pattern | 1 | 15-20 bytes |
| 22 | Arrow function export vs function declaration | Verbose Pattern | 1 | 5-8 bytes |
| 23 | Dead code: `transform` fallback in `useAnimate` | Dead Code | 1 | 25-30 bytes |
| 24 | Duplicate `width`/`height` in bar label props | Unnecessary Object Spread | 1 | 15-20 bytes |
| 25 | Dead initializations and duplicate expressions in `getOutsidePlacement` | Dead Code / Verbose | 1 | 25-35 bytes |
| 26 | Repeated `(startAngle + endAngle) / 2` expression | Verbose Pattern | 2 | 30-40 bytes |

**Total estimated gzip savings: ~850-1,150 bytes**
