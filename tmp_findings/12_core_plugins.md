# Gzip Bundle Size Optimization: corePlugins Directory

**Scope:** `packages/x-charts/src/internals/plugins/corePlugins/` and all subdirectories
**Files Analyzed:** 54 (.ts and .tsx)

---

## Finding 1: Duplicate Margin Object Reconstruction

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartDimensions/useChartDimensions.ts`
**Lines:** 40-46 and 72-78

The same margin object is manually reconstructed in two places inside the plugin:

```typescript
// Lines 40-46 (inside computeSize callback)
margin: {
  top: params.margin.top,
  right: params.margin.right,
  bottom: params.margin.bottom,
  left: params.margin.left,
},

// Lines 72-78 (inside useEffectAfterFirstRender)
margin: {
  top: params.margin.top,
  right: params.margin.right,
  bottom: params.margin.bottom,
  left: params.margin.left,
},
```

**Suggested Fix:** `params.margin` is already typed as `ChartMargin` (from `getDefaultizedParams`), so pass it directly:

```typescript
margin: params.margin,
```

**Estimated gzip savings:** ~70 bytes (removes ~120 bytes of source per occurrence, gzip compresses well but repetition still costs)

---

## Finding 2: Duplicate isAnimationDisabledEnvironment Check

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartAnimation/useChartAnimation.ts`
**Lines:** 36 and 75

Identical expression appears in both the plugin body and `getInitialState`:

```typescript
// Line 36 (inside useEnhancedEffect)
const isAnimationDisabledEnvironment = typeof window === 'undefined' || !window?.matchMedia;

// Line 75 (inside getInitialState)
const isAnimationDisabledEnvironment = typeof window === 'undefined' || !window?.matchMedia;
```

**Suggested Fix:** Extract to a module-level helper:

```typescript
const isAnimationDisabledEnv = () => typeof window === 'undefined' || !window?.matchMedia;
```

Then call `isAnimationDisabledEnv()` at both sites.

**Estimated gzip savings:** ~50 bytes

---

## Finding 3: Verbose Store Spread Pattern for Animation State

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartAnimation/useChartAnimation.ts`
**Lines:** 9, 15-18, 27-30

Three `store.set('animation', ...)` calls each spread `store.state.animation` to change a single property:

```typescript
// Line 9
store.set('animation', { ...store.state.animation, skip: params.skipAnimation });

// Lines 15-18
store.set('animation', {
  ...store.state.animation,
  skipAnimationRequests: store.state.animation.skipAnimationRequests + 1,
});

// Lines 27-30
store.set('animation', {
  ...store.state.animation,
  skipAnimationRequests: store.state.animation.skipAnimationRequests - 1,
});
```

**Suggested Fix:** Cache `store.state.animation` in a local variable to reduce repeated property access:

```typescript
const anim = store.state.animation;
store.set('animation', { ...anim, skipAnimationRequests: anim.skipAnimationRequests + 1 });
```

Alternatively, if the store supports partial updates, use that instead of spreading.

**Estimated gzip savings:** ~18 bytes

---

## Finding 4: Unnecessary Margin Deconstruction in Dimensions Store Update

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartDimensions/useChartDimensions.ts`
**Lines:** 40-51 and 72-83

Both `store.set('dimensions', ...)` calls manually reconstruct the margin object from individual properties. Since `params.margin` is already a defaultized `ChartMargin` object (set by `getDefaultizedParams` which calls `defaultizeMargin`), this deconstruction/reconstruction is unnecessary.

```typescript
// Current (lines 40-51)
store.set('dimensions', {
  margin: {
    top: params.margin.top,
    right: params.margin.right,
    bottom: params.margin.bottom,
    left: params.margin.left,
  },
  width: params.width ?? newWidth,
  height: params.height ?? newHeight,
  propsWidth: params.width,
  propsHeight: params.height,
});
```

**Suggested Fix:**

```typescript
store.set('dimensions', {
  margin: params.margin,
  width: params.width ?? newWidth,
  height: params.height ?? newHeight,
  propsWidth: params.width,
  propsHeight: params.height,
});
```

This applies to both call sites (lines 40-51 and lines 72-83).

**Note:** The comments at lines 62-63 and 88-89 state the reason for listing individual margin properties is to prevent infinite loops in dependency arrays. The dependency arrays themselves should remain as-is. Only the object passed to `store.set()` can be simplified.

**Estimated gzip savings:** ~70 bytes

---

## Finding 5: Repeated Selector Boilerplate in Dimensions Selectors

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartDimensions/useChartDimensions.selectors.ts`
**Lines:** 34-52

Four selectors follow an identical pattern, differing only in the property name accessed:

```typescript
export const selectorChartSvgWidth = createSelector(
  selectorChartDimensionsState,
  (dimensionsState) => dimensionsState.width,
);

export const selectorChartSvgHeight = createSelector(
  selectorChartDimensionsState,
  (dimensionsState) => dimensionsState.height,
);

export const selectorChartPropsWidth = createSelector(
  selectorChartDimensionsState,
  (dimensionsState) => dimensionsState.propsWidth,
);

export const selectorChartPropsHeight = createSelector(
  selectorChartDimensionsState,
  (dimensionsState) => dimensionsState.propsHeight,
);
```

**Suggested Fix:** Use a factory function:

```typescript
const dimSelector = <K extends keyof UseChartDimensionsState['dimensions']>(key: K) =>
  createSelector(selectorChartDimensionsState, (s) => s[key]);

export const selectorChartSvgWidth = dimSelector('width');
export const selectorChartSvgHeight = dimSelector('height');
export const selectorChartPropsWidth = dimSelector('propsWidth');
export const selectorChartPropsHeight = dimSelector('propsHeight');
```

**Estimated gzip savings:** ~80 bytes

---

## Finding 6: Repeated Object.keys() Cast Pattern

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartSeries/processSeries.ts`
**Lines:** 73 and 100

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartSeries/useColorProcessor.ts`
**Line:** 20

The same `(Object.keys(...) as TSeriesType[]).forEach(...)` cast pattern appears three times across two files:

```typescript
// processSeries.ts line 73
(Object.keys(seriesConfig) as TSeriesType[]).forEach((type) => {

// processSeries.ts line 100
(Object.keys(processedSeries) as TSeriesType[]).forEach((type) => {

// useColorProcessor.ts line 20
(Object.keys(seriesConfig) as ChartSeriesType[]).forEach(
```

**Suggested Fix:** Extract a shared utility:

```typescript
const forEachKey = <T extends string>(obj: Record<string, unknown>, cb: (key: T) => void) =>
  (Object.keys(obj) as T[]).forEach(cb);
```

**Estimated gzip savings:** ~48 bytes

---

## Finding 7: Repeated addEventListener/removeEventListener for Gesture Events

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartInteractionListener/useChartInteractionListener.ts`
**Lines:** 174-181

Three gesture events are individually added and removed:

```typescript
svg?.addEventListener('gesturestart', preventDefault);
svg?.addEventListener('gesturechange', preventDefault);
svg?.addEventListener('gestureend', preventDefault);

return () => {
  svg?.removeEventListener('gesturestart', preventDefault);
  svg?.removeEventListener('gesturechange', preventDefault);
  svg?.removeEventListener('gestureend', preventDefault);
};
```

**Suggested Fix:** Use an array and loop:

```typescript
const gestureEvents = ['gesturestart', 'gesturechange', 'gestureend'] as const;
gestureEvents.forEach((e) => svg?.addEventListener(e, preventDefault));
return () => {
  gestureEvents.forEach((e) => svg?.removeEventListener(e, preventDefault));
};
```

**Estimated gzip savings:** ~35 bytes

---

## Finding 8: Verbose selectorChartDrawingArea Destructuring

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartDimensions/useChartDimensions.selectors.ts`
**Lines:** 18-31

The selector destructures margin and axis-size objects into 8 individual variables with verbose names:

```typescript
function selectorChartDrawingArea(
  { width, height },
  { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft },
  { left: axisSizeLeft, right: axisSizeRight, top: axisSizeTop, bottom: axisSizeBottom },
) {
  return {
    width: width - marginLeft - marginRight - axisSizeLeft - axisSizeRight,
    left: marginLeft + axisSizeLeft,
    right: marginRight + axisSizeRight,
    height: height - marginTop - marginBottom - axisSizeTop - axisSizeBottom,
    top: marginTop + axisSizeTop,
    bottom: marginBottom + axisSizeBottom,
  };
}
```

**Suggested Fix:** Use shorter parameter names or access properties directly:

```typescript
function selectorChartDrawingArea({ width, height }, m, a) {
  return {
    width: width - m.left - m.right - a.left - a.right,
    left: m.left + a.left,
    right: m.right + a.right,
    height: height - m.top - m.bottom - a.top - a.bottom,
    top: m.top + a.top,
    bottom: m.bottom + a.bottom,
  };
}
```

**Estimated gzip savings:** ~20 bytes

---

## Finding 9: EMPTY_ARRAY Constant and Verbose Series Check

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartSeries/useChartSeries.ts`
**Lines:** 35-39

```typescript
const EMPTY_ARRAY: any[] = [];

useChartSeries.getDefaultizedParams = ({ params }) => ({
  ...params,
  series: params.series?.length ? params.series : EMPTY_ARRAY,
  colors: params.colors ?? rainbowSurgePalette,
  theme: params.theme ?? 'light',
});
```

**Issue:** The `EMPTY_ARRAY` constant is defined at module scope to provide a stable reference for empty series. However, using `any[]` type assertion adds unnecessary type annotation overhead. The check `params.series?.length ? params.series : EMPTY_ARRAY` could be more compact.

**Suggested Fix:**

```typescript
const EMPTY_ARRAY: readonly never[] = [];

// Or simply:
series: params.series?.length ? params.series : [],
```

Note: If referential stability of the empty array is important (to avoid re-renders), the constant should stay. But `any[]` could become `never[]`.

**Estimated gzip savings:** ~12 bytes

---

## Finding 10: Verbose Conditional in useChartId

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartId/useChartId.ts`
**Lines:** 9-15

```typescript
if (
  params.id === undefined ||
  (params.id === store.state.id.providedChartId && store.state.id.chartId !== undefined)
) {
  return;
}
store.set('id', { ...store.state.id, chartId: params.id ?? createChartDefaultId() });
```

**Issue:** `params.id === undefined` check followed by `params.id ?? createChartDefaultId()` is partially redundant. If `params.id` is undefined, we already returned. So the `?? createChartDefaultId()` fallback on line 15 can never trigger.

**Suggested Fix:**

```typescript
if (
  params.id === undefined ||
  (params.id === store.state.id.providedChartId && store.state.id.chartId !== undefined)
) {
  return;
}
store.set('id', { ...store.state.id, chartId: params.id });
```

The `?? createChartDefaultId()` fallback is dead code in this context because `params.id` is guaranteed to be defined at that point (the `undefined` case already returned).

**Estimated gzip savings:** ~22 bytes

---

## Finding 11: Duplicate colors Resolution Logic in useChartSeries

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartSeries/useChartSeries.ts`
**Lines:** 18 and 49

The same colors resolution expression appears in both the effect and getInitialState:

```typescript
// Line 18 (inside useEffectAfterFirstRender)
colors: typeof colors === 'function' ? colors(theme) : colors,

// Line 49 (inside getInitialState)
colors: typeof colors === 'function' ? colors(theme) : colors,
```

**Suggested Fix:** Extract to a module-level helper:

```typescript
const resolveColors = (colors: ChartsColorPalette, theme: string) =>
  typeof colors === 'function' ? colors(theme) : colors;
```

**Estimated gzip savings:** ~20 bytes

---

## Finding 12: Unnecessary Optional Chaining on svgRef

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartDimensions/useChartDimensions.ts`
**Line:** 27

```typescript
const mainEl = svgRef?.current;
```

`svgRef` is destructured from `instance` on line 19 (`const { svgRef } = instance;`). The `instance` object is always present and `svgRef` is always a ref object (never null/undefined). The optional chaining `?.` is unnecessary.

**Suggested Fix:**

```typescript
const mainEl = svgRef.current;
```

**Estimated gzip savings:** ~1 byte

---

## Finding 13: Verbose getInitialState Pattern

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartInteractionListener/useChartInteractionListener.ts`
**Lines:** 195-197

```typescript
useChartInteractionListener.getInitialState = () => {
  return {};
};
```

**Suggested Fix:** Use arrow function shorthand:

```typescript
useChartInteractionListener.getInitialState = () => ({});
```

**Estimated gzip savings:** ~5 bytes

---

## Finding 14: Verbose getInitialState in useChartExperimentalFeature

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartExperimentalFeature/useChartExperimentalFeature.ts`
**Lines:** 21-25

```typescript
useChartExperimentalFeatures.getInitialState = ({ experimentalFeatures }) => {
  return {
    experimentalFeatures,
  };
};
```

**Suggested Fix:** Use arrow function shorthand:

```typescript
useChartExperimentalFeatures.getInitialState = ({ experimentalFeatures }) => ({
  experimentalFeatures,
});
```

**Estimated gzip savings:** ~5 bytes

---

## Finding 15: Verbose getInitialState in useChartDimensions

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartDimensions/useChartDimensions.ts`
**Lines:** 217-227

```typescript
useChartDimensions.getInitialState = ({ width, height, margin }) => {
  return {
    dimensions: {
      margin,
      width: width ?? 0,
      height: height ?? 0,
      propsWidth: width,
      propsHeight: height,
    },
  };
};
```

**Suggested Fix:** Use arrow function shorthand:

```typescript
useChartDimensions.getInitialState = ({ width, height, margin }) => ({
  dimensions: {
    margin,
    width: width ?? 0,
    height: height ?? 0,
    propsWidth: width,
    propsHeight: height,
  },
});
```

**Estimated gzip savings:** ~5 bytes

---

## Finding 16: Verbose getInitialState in useChartSeriesConfig

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartSeriesConfig/useChartSeriesConfig.ts`
**Lines:** 43-49

```typescript
useChartSeriesConfig.getInitialState = ({ seriesConfig }) => {
  return {
    seriesConfig: {
      config: seriesConfig,
    },
  };
};
```

**Suggested Fix:** Use arrow function shorthand:

```typescript
useChartSeriesConfig.getInitialState = ({ seriesConfig }) => ({
  seriesConfig: { config: seriesConfig },
});
```

**Estimated gzip savings:** ~5 bytes

---

## Finding 17: Type Assertion to `any` in addInteractionListener

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartInteractionListener/useChartInteractionListener.ts`
**Lines:** 144-145

```typescript
// Forcefully cast the svgRef to any, it is annoying to fix the types.
const svg = svgRef.current as any;
```

**Issue:** `as any` adds bytes to the output. Proper typing or an interface extension would remove this.

**Suggested Fix:** Properly type the ref or suppress with a more specific cast. After minification `as any` is stripped, but the comment adds dead weight in source (though comments are stripped by bundlers).

**Estimated gzip savings:** ~5 bytes (the `as any` itself is stripped by tsc; the comment is the main overhead, stripped by minifier)

---

## Finding 18: Structural Similarity Between serializeIdentifier and cleanIdentifier Utils

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartSeriesConfig/utils/serializeIdentifier.ts`
**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartSeriesConfig/utils/cleanIdentifier.ts`

These two files have nearly identical structure:

```typescript
// serializeIdentifier.ts
export const serializeIdentifier = <T extends ChartSeriesType, U extends { type: T }>(
  seriesConfig: ChartSeriesConfig<T>,
  identifier: U,
): string => {
  const serializer = seriesConfig[identifier.type]?.identifierSerializer;
  if (!serializer) {
    throw new Error(
      `MUI X Charts: No identifier serializer found for series type "${identifier.type}".`,
    );
  }
  return serializer(identifier);
};

// cleanIdentifier.ts
export const cleanIdentifier = <T extends ChartSeriesType, U extends { type: T }>(
  seriesConfig: ChartSeriesConfig<T>,
  identifier: U,
): SeriesItemIdentifier<T> => {
  const cleaner = seriesConfig[identifier.type]?.identifierCleaner;
  if (!cleaner) {
    throw new Error(
      `MUI X Charts: No identifier cleaner found for series type "${identifier.type}".`,
    );
  }
  return cleaner(identifier);
};
```

**Suggested Fix:** Create a generic factory:

```typescript
const createConfigLookup = <R>(
  configKey: string,
  label: string,
) => <T extends ChartSeriesType, U extends { type: T }>(
  seriesConfig: ChartSeriesConfig<T>,
  identifier: U,
): R => {
  const fn = seriesConfig[identifier.type]?.[configKey];
  if (!fn) {
    throw new Error(`MUI X Charts: No ${label} found for series type "${identifier.type}".`);
  }
  return fn(identifier);
};
```

**Estimated gzip savings:** ~40 bytes

---

## Finding 19: Repeated Error Message Prefix

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartSeriesConfig/utils/serializeIdentifier.ts` (line 20)
**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartSeriesConfig/utils/cleanIdentifier.ts` (line 20)
**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartSeries/processSeries.ts` (line 46)
**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartDimensions/useChartDimensions.ts` (lines 164, 170)

The string `MUI X Charts:` appears 5 times across these files as an error/warning prefix.

```typescript
`MUI X Charts: No identifier serializer found for series type "${identifier.type}".`
`MUI X Charts: No identifier cleaner found for series type "${identifier.type}".`
`MUI X Charts: series' id "${id}" is not unique.`
`MUI X Charts: ChartContainer does not have \`width\` prop, and its container has no \`width\` defined.`
`MUI X Charts: ChartContainer does not have \`height\` prop, and its container has no \`height\` defined.`
```

**Suggested Fix:** Extract a shared error prefix constant:

```typescript
const PREFIX = 'MUI X Charts:';
```

Gzip handles repeated strings well, but 5 occurrences still adds a few bytes of overhead vs a shared constant reference.

**Estimated gzip savings:** ~8 bytes

---

## Finding 20: Verbose Return in computeSize

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartDimensions/useChartDimensions.ts`
**Lines:** 128-131

```typescript
if (hasInSize) {
  return () => {};
}
```

**Issue:** `return () => {}` is a verbose way to return an empty cleanup function. This pattern appears at line 130 and again at line 136-137 (as a conditional early return).

**Suggested Fix:** Define a no-op function at module level:

```typescript
const noop = () => {};
// Then:
if (hasInSize) return noop;
```

Since `() => {}` appears twice in the same function, a shared reference saves a small amount.

**Estimated gzip savings:** ~8 bytes

---

## Finding 21: Unused Import Type in useChartAnimation.types.ts

**File:** `packages/x-charts/src/internals/plugins/corePlugins/useChartAnimation/useChartAnimation.types.ts`
**Line:** 2

```typescript
import type { UseChartCartesianAxisSignature } from '../../featurePlugins/useChartCartesianAxis';
```

This is used on line 43 in the `optionalDependencies` field. It is not dead code, but it creates a cross-plugin dependency from a core plugin to a feature plugin. This is architecturally unusual (a core plugin depending on a feature plugin type). Same pattern exists in `useChartDimensions.types.ts` line 2.

**Status:** Not dead code, but worth noting as an architectural concern. No gzip savings.

**Estimated gzip savings:** 0 bytes (type imports are stripped)

---

## Summary Table

| # | File | Issue | Est. Gzip Savings |
|---|------|-------|-------------------|
| 1 | useChartDimensions.ts | Duplicate margin object reconstruction | ~70 bytes |
| 2 | useChartAnimation.ts | Duplicate isAnimationDisabledEnvironment expression | ~50 bytes |
| 3 | useChartAnimation.ts | Verbose store spread pattern (3 calls) | ~18 bytes |
| 4 | useChartDimensions.ts | Unnecessary margin deconstruction/reconstruction | covered by #1 |
| 5 | useChartDimensions.selectors.ts | Repeated selector boilerplate (4 selectors) | ~80 bytes |
| 6 | processSeries.ts, useColorProcessor.ts | Repeated Object.keys() cast pattern (3 occurrences) | ~48 bytes |
| 7 | useChartInteractionListener.ts | Repeated gesture addEventListener/removeEventListener | ~35 bytes |
| 8 | useChartDimensions.selectors.ts | Verbose destructuring in selectorChartDrawingArea | ~20 bytes |
| 9 | useChartSeries.ts | EMPTY_ARRAY constant and verbose series check | ~12 bytes |
| 10 | useChartId.ts | Dead nullish coalescing (`?? createChartDefaultId()`) | ~22 bytes |
| 11 | useChartSeries.ts | Duplicate colors resolution expression | ~20 bytes |
| 12 | useChartDimensions.ts | Unnecessary optional chaining on svgRef | ~1 byte |
| 13 | useChartInteractionListener.ts | Verbose getInitialState (block body) | ~5 bytes |
| 14 | useChartExperimentalFeature.ts | Verbose getInitialState (block body) | ~5 bytes |
| 15 | useChartDimensions.ts | Verbose getInitialState (block body) | ~5 bytes |
| 16 | useChartSeriesConfig.ts | Verbose getInitialState (block body) | ~5 bytes |
| 17 | useChartInteractionListener.ts | Type assertion to any (comment overhead) | ~5 bytes |
| 18 | serializeIdentifier.ts, cleanIdentifier.ts | Structurally identical utility functions | ~40 bytes |
| 19 | Multiple files | Repeated "MUI X Charts:" error prefix string | ~8 bytes |
| 20 | useChartDimensions.ts | Repeated `() => {}` empty cleanup return | ~8 bytes |
| 21 | useChartAnimation.types.ts | Architectural note: core plugin importing feature plugin type | 0 bytes |

**Total estimated gzip savings: ~457 bytes**

### Top Priority Changes (highest impact, lowest risk)

1. **Finding 1/4** -- Direct margin object assignment in useChartDimensions.ts (~70 bytes)
2. **Finding 5** -- Selector factory for dimension selectors (~80 bytes)
3. **Finding 2** -- Extract isAnimationDisabledEnvironment helper (~50 bytes)
4. **Finding 6** -- Shared Object.keys cast utility (~48 bytes)
5. **Finding 18** -- Merge serializeIdentifier/cleanIdentifier into generic factory (~40 bytes)
6. **Finding 7** -- Loop gesture event listeners (~35 bytes)
7. **Finding 10** -- Remove dead nullish coalescing in useChartId (~22 bytes)
