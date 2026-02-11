# Bundle Size Optimization Findings: Container & Surface Components

## Scope

All `.ts` and `.tsx` source files (excluding test files) in these directories under `packages/x-charts/src/`:

- `ChartContainer/`
- `ChartDataProvider/`
- `ChartsContainer/`
- `ChartsSurface/`
- `ChartsWrapper/`
- `ChartsClipPath/`
- `ChartsBrushOverlay/`

---

## Finding 1: Deprecated ChartContainer Wrapper (entire file is runtime dead weight)

**File:** `packages/x-charts/src/ChartContainer/ChartContainer.tsx`
**Lines:** 1-34 (entire file)
**Category:** Dead code / Deprecated re-export

The entire file exists solely to re-export `ChartsContainer` (with an "s") under the old name `ChartContainer` (without "s"). The only runtime export is a single `const` alias. The type exports are erased at compile time.

```typescript
'use client';
import { type ChartSeriesType } from '../models/seriesType/config';
import { type AllPluginSignatures } from '../internals/plugins/allPlugins';
import { type ChartAnyPluginSignature } from '../internals/plugins/models/plugin';
import {
  ChartsContainer,
  type ChartsContainerProps,
  type ChartsContainerSlotProps,
  type ChartsContainerSlots,
} from '../ChartsContainer';

/**
 * @deprecated Use `ChartsContainerSlots` instead.
 */
export type ChartContainerSlots = ChartsContainerSlots;

/**
 * @deprecated Use `ChartsContainerSlotProps` instead.
 */
export type ChartContainerSlotProps = ChartsContainerSlotProps;

/**
 * @deprecated Use `ChartsContainerProps` instead.
 */
export type ChartContainerProps<
  SeriesType extends ChartSeriesType = ChartSeriesType,
  TSignatures extends readonly ChartAnyPluginSignature[] = AllPluginSignatures<SeriesType>,
> = ChartsContainerProps<SeriesType, TSignatures>;

/**
 * @deprecated Use `ChartsContainer` instead.
 */
export const ChartContainer = ChartsContainer;
```

**Suggested fix:** Remove in next major version. If keeping for backwards compatibility, verify that bundlers can tree-shake this when the deprecated `ChartContainer` name is not imported by the consumer. The `'use client'` directive and the runtime `const` assignment prevent full elimination.

**Estimated gzip savings:** ~500-700 bytes

---

## Finding 2: Deprecated useChartContainerProps Hook Wrapper (entire file is runtime dead weight)

**File:** `packages/x-charts/src/ChartContainer/useChartContainerProps.ts`
**Lines:** 1-32 (entire file)
**Category:** Dead code / Deprecated re-export

Same pattern as Finding 1. The entire file wraps `useChartsContainerProps` (with "s") under the old name. The runtime portion is a thin function that does nothing but forward arguments.

```typescript
'use client';
import type * as React from 'react';
import { type ChartSeriesType } from '../models/seriesType/config';
import { type AllPluginSignatures } from '../internals/plugins/allPlugins';
import { type ChartAnyPluginSignature } from '../internals/plugins/models/plugin';
import {
  useChartsContainerProps,
  type UseChartsContainerPropsReturnValue,
} from '../ChartsContainer/useChartsContainerProps';
import type { ChartContainerProps } from './ChartContainer';

/**
 * @deprecated Use `UseChartsContainerPropsReturnValue` instead.
 */
export type UseChartContainerPropsReturnValue<
  TSeries extends ChartSeriesType,
  TSignatures extends readonly ChartAnyPluginSignature[],
> = UseChartsContainerPropsReturnValue<TSeries, TSignatures>;

/**
 * @deprecated Use `useChartsContainerProps` instead.
 */
export const useChartContainerProps = <
  TSeries extends ChartSeriesType = ChartSeriesType,
  TSignatures extends readonly ChartAnyPluginSignature[] = AllPluginSignatures<TSeries>,
>(
  props: ChartContainerProps<TSeries, TSignatures>,
  ref: React.Ref<SVGSVGElement>,
): UseChartContainerPropsReturnValue<TSeries, TSignatures> => {
  return useChartsContainerProps(props, ref);
};
```

**Suggested fix:** Remove in next major version. The wrapper function adds an extra call frame and prevents inlining.

**Estimated gzip savings:** ~400-550 bytes

---

## Finding 3: Massive PropTypes Block in ChartsContainer (94 KB raw, 1779 PropTypes references)

**File:** `packages/x-charts/src/ChartsContainer/ChartsContainer.tsx`
**Lines:** 69-2380
**Category:** String repetition hurting gzip / Shared constant opportunities

The file is 94,162 bytes, with the vast majority being auto-generated PropTypes definitions. There are 1,779 references to `PropTypes.*`. Within this block, many sub-patterns are repeated dozens of times verbatim:

**Repeated sub-pattern example (appears 50+ times):**
```typescript
PropTypes.oneOfType([
  PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool])),
  PropTypes.func,
  PropTypes.object,
])
```

This is the `sx` prop validator. It appears for every axis config, every slot, etc.

**Another repeated sub-pattern (colorMap, appears 20+ times):**
```typescript
PropTypes.oneOfType([
  PropTypes.shape({
    color: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string.isRequired),
      PropTypes.func,
    ]).isRequired,
    max: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.number]),
    min: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.number]),
    type: PropTypes.oneOf(['continuous']).isRequired,
  }),
  PropTypes.shape({
    colors: PropTypes.arrayOf(PropTypes.string).isRequired,
    thresholds: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.number]).isRequired,
    ).isRequired,
    type: PropTypes.oneOf(['piecewise']).isRequired,
  }),
])
```

**Suggested fix:** Extract repeated PropTypes sub-validators into shared constants at the top of the file (or in a shared utility). For example:

```typescript
const sxPropType = PropTypes.oneOfType([
  PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool])),
  PropTypes.func,
  PropTypes.object,
]);

const colorMapPropType = PropTypes.oneOfType([
  PropTypes.shape({ /* continuous */ }),
  PropTypes.shape({ /* piecewise */ }),
]);
```

Then reference `sxPropType` and `colorMapPropType` inline. Gzip already deduplicates somewhat, but extracting to variables reduces the raw repeated token sequences that gzip cannot fully compress across long distances (gzip window is 32 KB; the PropTypes block is ~94 KB).

**Note:** These PropTypes are auto-generated by `pnpm proptypes`, so any fix would need to modify the generation script rather than editing manually.

**Estimated gzip savings:** ~800-1200 bytes

---

## Finding 4: Repeated String Literals in ChartsWrapper Layout Helpers

**File:** `packages/x-charts/src/ChartsWrapper/ChartsWrapper.tsx`
**Lines:** 44-118
**Category:** String repetition hurting gzip / Shared constant opportunities

Multiple string literals are repeated across the layout helper functions:

| Literal | Occurrences |
|---------|-------------|
| `'horizontal'` | 7 |
| `'center'` | 6 |
| `'bottom'` | 6 |
| `'start'` | 5 |
| `'vertical'` | 4 |
| `'end'` | 4 |
| `'top'` | 3 |
| `'toolbar'` | 2 |

**Current code example (getJustifyItems, lines 44-52):**
```typescript
const getJustifyItems = (position: Position | undefined) => {
  if (position?.horizontal === 'start') {
    return 'start';
  }
  if (position?.horizontal === 'end') {
    return 'end';
  }
  return 'center';
};
```

**Suggested fix:** Use a lookup object instead of branching:

```typescript
const JUSTIFY_MAP: Record<string, string> = { start: 'start', end: 'end' };
const getJustifyItems = (position: Position | undefined) =>
  JUSTIFY_MAP[position?.horizontal ?? ''] ?? 'center';
```

Similarly for `getAlignItems`:

```typescript
const ALIGN_MAP: Record<string, string> = { top: 'flex-start', bottom: 'flex-end' };
const getAlignItems = (position: Position | undefined) =>
  ALIGN_MAP[position?.vertical ?? ''] ?? 'center';
```

This reduces both branching verbosity and string repetition.

**Estimated gzip savings:** ~150-250 bytes

---

## Finding 5: Redundant Conditional Branches in getTemplateColumns and getTemplateRows

**File:** `packages/x-charts/src/ChartsWrapper/ChartsWrapper.tsx`
**Lines:** 87-118
**Category:** Verbose conditionals

Both `getTemplateColumns` and `getTemplateRows` have the same pattern: check for direction, then check for `hideLegend`, but the `hideLegend` check returns the same value as the direction mismatch case.

**Current code (getTemplateColumns, lines 87-102):**
```typescript
const getTemplateColumns = (
  hideLegend: boolean = false,
  direction: Direction = 'horizontal',
  horizontalPosition: Position['horizontal'] = 'end',
  width: number | undefined = undefined,
) => {
  const drawingAreaColumn = width ? 'auto' : '1fr';
  if (direction === 'horizontal') {
    return drawingAreaColumn;
  }

  if (hideLegend) {
    return drawingAreaColumn;
  }
  return horizontalPosition === 'start' ? `auto ${drawingAreaColumn}` : `${drawingAreaColumn} auto`;
};
```

**Suggested fix:** Merge the two early-return conditions:

```typescript
const getTemplateColumns = (
  hideLegend: boolean = false,
  direction: Direction = 'horizontal',
  horizontalPosition: Position['horizontal'] = 'end',
  width: number | undefined = undefined,
) => {
  const drawingAreaColumn = width ? 'auto' : '1fr';
  if (direction === 'horizontal' || hideLegend) {
    return drawingAreaColumn;
  }
  return horizontalPosition === 'start' ? `auto ${drawingAreaColumn}` : `${drawingAreaColumn} auto`;
};
```

Same applies to `getTemplateRows` (lines 104-118):

```typescript
// Before:
const getTemplateRows = (
  hideLegend: boolean = false,
  direction: Direction = 'horizontal',
  verticalPosition: Position['vertical'] = 'top',
) => {
  const drawingAreaRow = '1fr';
  if (direction === 'vertical') {
    return drawingAreaRow;
  }

  if (hideLegend) {
    return drawingAreaRow;
  }
  return verticalPosition === 'bottom' ? `${drawingAreaRow} auto` : `auto ${drawingAreaRow}`;
};

// After:
const getTemplateRows = (
  hideLegend: boolean = false,
  direction: Direction = 'horizontal',
  verticalPosition: Position['vertical'] = 'top',
) => {
  if (direction === 'vertical' || hideLegend) {
    return '1fr';
  }
  return verticalPosition === 'bottom' ? '1fr auto' : 'auto 1fr';
};
```

The `getTemplateRows` fix also eliminates the `drawingAreaRow` variable entirely and inlines `'1fr'` since it is short and used in template literals anyway.

**Estimated gzip savings:** ~80-120 bytes

---

## Finding 6: Verbose Grid Template Areas String Construction

**File:** `packages/x-charts/src/ChartsWrapper/ChartsWrapper.tsx`
**Lines:** 160-167
**Category:** Verbose patterns

The toolbar grid-template-areas construction splits a string, maps every element to `'toolbar'`, then joins -- just to repeat the word "toolbar" N times.

**Current code:**
```typescript
[`&:has(.${chartsToolbarClasses.root})`]: {
  gridTemplateRows: `auto ${gridTemplateRows}`,
  gridTemplateAreas: `"${gridTemplateColumns
    .split(' ')
    .map(() => 'toolbar')
    .join(' ')}"
    ${gridTemplateAreas}`,
},
```

**Suggested fix:** Count the tokens and use `Array(n).fill('toolbar').join(' ')` or even simpler, use `.replace(/\S+/g, 'toolbar')`:

```typescript
gridTemplateAreas: `"${gridTemplateColumns.replace(/\S+/g, 'toolbar')}"
    ${gridTemplateAreas}`,
```

This avoids creating an intermediate array with `.split()` and `.map()`.

**Estimated gzip savings:** ~40-70 bytes

---

## Finding 7: Default Offset Object Created on Every Render in ChartsClipPath

**File:** `packages/x-charts/src/ChartsClipPath/ChartsClipPath.tsx`
**Line:** 28
**Category:** Unnecessary object spreads

A new default offset object is created and spread on every render call.

**Current code:**
```typescript
function ChartsClipPath(props: ChartsClipPathProps) {
  const { id, offset: offsetProps } = props;
  const { left, top, width, height } = useDrawingArea();

  const offset = { top: 0, right: 0, bottom: 0, left: 0, ...offsetProps };
  return (
    <clipPath id={id}>
      <rect
        x={left - offset.left}
        y={top - offset.top}
        width={width + offset.left + offset.right}
        height={height + offset.top + offset.bottom}
      />
    </clipPath>
  );
}
```

**Suggested fix:** Extract the default object as a module-level constant to avoid re-creation:

```typescript
const DEFAULT_OFFSET = { top: 0, right: 0, bottom: 0, left: 0 };

function ChartsClipPath(props: ChartsClipPathProps) {
  const { id, offset: offsetProps } = props;
  const { left, top, width, height } = useDrawingArea();

  const offset = offsetProps ? { ...DEFAULT_OFFSET, ...offsetProps } : DEFAULT_OFFSET;
  // ...
}
```

When `offsetProps` is undefined (the common case), this avoids both the object literal creation and the spread.

**Estimated gzip savings:** ~20-30 bytes

---

## Finding 8: Theme Palette Color Ternary in ChartsBrushOverlay

**File:** `packages/x-charts/src/ChartsBrushOverlay/ChartsBrushOverlay.tsx`
**Line:** 67-68
**Category:** Verbose patterns

Long property chain repeated on both sides of a ternary.

**Current code:**
```typescript
const rectColor =
  theme.palette.mode === 'light' ? theme.palette.common.black : theme.palette.common.white;
```

**Suggested fix:** Destructure or alias `theme.palette` to reduce the repeated chain:

```typescript
const { common, mode } = theme.palette;
const rectColor = mode === 'light' ? common.black : common.white;
```

This also improves readability.

**Estimated gzip savings:** ~30-50 bytes

---

## Finding 9: Repeated `store.use()` Calls in ChartsBrushOverlay

**File:** `packages/x-charts/src/ChartsBrushOverlay/ChartsBrushOverlay.tsx`
**Lines:** 37-46
**Category:** Verbose patterns / String repetition

Five separate `store.use()` calls, each on a different selector.

**Current code:**
```typescript
const store = useStore<[UseChartBrushSignature]>();
const drawingArea = store.use(selectorChartDrawingArea);

const theme = useTheme();

const brushStartX = store.use(selectorBrushStartX);
const brushStartY = store.use(selectorBrushStartY);
const brushCurrentX = store.use(selectorBrushCurrentX);
const brushCurrentY = store.use(selectorBrushCurrentY);
const brushConfig = store.use(selectorBrushConfig);
```

**Suggested fix:** If the store supports a combined selector, a single composite selector could reduce both overhead and code:

```typescript
// If the store API supports it:
const { startX, startY, currentX, currentY, config } = store.use(selectorBrushState);
```

This is an architectural change and depends on whether the store API supports composite selectors. If not, this is acceptable as-is.

**Estimated gzip savings:** ~40-60 bytes (if composite selector is feasible)

---

## Finding 10: Repeated BrushRect Rendering Pattern in ChartsBrushOverlay

**File:** `packages/x-charts/src/ChartsBrushOverlay/ChartsBrushOverlay.tsx`
**Lines:** 71-116
**Category:** Duplicate code

Three near-identical render blocks for the three brush modes (`'xy'`, `'y'`, and default `'x'`). Each follows the same pattern: wrap in `<g className={clsx(...)}>`, render `<BrushRect fill={rectColor} ... {...props} />`.

**Current code (abbreviated):**
```typescript
// 'xy' mode (lines 71-87)
if (brushConfig === 'xy') {
  const rectWidth = currentX - startX;
  const rectHeight = currentY - startY;
  return (
    <g className={clsx(brushOverlayClasses.root, brushOverlayClasses.x, brushOverlayClasses.y)}>
      <BrushRect
        fill={rectColor}
        x={rectWidth >= 0 ? startX : currentX}
        y={rectHeight >= 0 ? startY : currentY}
        width={Math.abs(rectWidth)}
        height={Math.abs(rectHeight)}
        {...props}
      />
    </g>
  );
}

// 'y' mode (lines 89-106)
if (brushConfig === 'y') {
  const minY = Math.min(startY, currentY);
  const maxY = Math.max(startY, currentY);
  const rectHeight = maxY - minY;
  return (
    <g className={clsx(brushOverlayClasses.root, brushOverlayClasses.y)}>
      <BrushRect
        fill={rectColor}
        x={left}
        y={minY}
        width={width}
        height={rectHeight}
        {...props}
      />
    </g>
  );
}

// 'x' mode (lines 108-116)
const minX = Math.min(startX, currentX);
const maxX = Math.max(startX, currentX);
const rectWidth = maxX - minX;
return (
  <g className={clsx(brushOverlayClasses.root, brushOverlayClasses.x)}>
    <BrushRect fill={rectColor} x={minX} y={top} width={rectWidth} height={height} {...props} />
  </g>
);
```

**Suggested fix:** Compute x/y/width/height based on brushConfig, then render once:

```typescript
let rectX: number, rectY: number, rectW: number, rectH: number;
const classes = [brushOverlayClasses.root];

if (brushConfig === 'xy') {
  const dw = currentX - startX;
  const dh = currentY - startY;
  rectX = dw >= 0 ? startX : currentX;
  rectY = dh >= 0 ? startY : currentY;
  rectW = Math.abs(dw);
  rectH = Math.abs(dh);
  classes.push(brushOverlayClasses.x, brushOverlayClasses.y);
} else if (brushConfig === 'y') {
  rectX = left;
  rectY = Math.min(startY, currentY);
  rectW = width;
  rectH = Math.max(startY, currentY) - rectY;
  classes.push(brushOverlayClasses.y);
} else {
  rectX = Math.min(startX, currentX);
  rectY = top;
  rectW = Math.max(startX, currentX) - rectX;
  rectH = height;
  classes.push(brushOverlayClasses.x);
}

return (
  <g className={clsx(...classes)}>
    <BrushRect fill={rectColor} x={rectX} y={rectY} width={rectW} height={rectH} {...props} />
  </g>
);
```

This eliminates three separate JSX return blocks, reducing duplicated `<g>` and `<BrushRect>` element creation code.

**Estimated gzip savings:** ~120-180 bytes

---

## Finding 11: Unnecessary `pointerEvents` String Quoting in BrushRect

**File:** `packages/x-charts/src/ChartsBrushOverlay/ChartsBrushOverlay.tsx`
**Line:** 25
**Category:** Verbose patterns

**Current code:**
```typescript
function BrushRect(props: React.SVGProps<SVGRectElement>) {
  return (
    <rect
      className={brushOverlayClasses.rect}
      strokeWidth={1}
      fillOpacity={0.2}
      pointerEvents={'none'}
      {...props}
    />
  );
}
```

**Suggested fix:** Remove the unnecessary curly braces around the string literal:

```typescript
pointerEvents="none"
```

JSX string props do not need `{'...'}` wrapping. This saves a few bytes in raw source (though minifiers may handle this).

**Estimated gzip savings:** ~2-4 bytes

---

## Finding 12: Empty Interface Declarations in ChartsContainer and ChartDataProvider

**File:** `packages/x-charts/src/ChartsContainer/ChartsContainer.tsx`
**Lines:** 16-18

**File:** `packages/x-charts/src/ChartDataProvider/ChartDataProvider.tsx`
**Lines:** 22-24

**Category:** Dead code (types only, no runtime impact)

**Current code (ChartsContainer):**
```typescript
export interface ChartsContainerSlots extends ChartDataProviderSlots {}
export interface ChartsContainerSlotProps extends ChartDataProviderSlotProps {}
```

**Current code (ChartDataProvider):**
```typescript
export interface ChartDataProviderSlots extends ChartsSlots {}
export interface ChartDataProviderSlotProps extends ChartsSlotProps {}
```

These are empty interfaces that simply extend a parent type. They exist purely for naming/API documentation purposes. Since they compile to nothing at runtime, they have zero bundle impact, but they add noise to the type surface area.

**Suggested fix:** Consider using `type X = Y` instead of empty extending interfaces, which is semantically clearer. No runtime savings.

**Estimated gzip savings:** 0 bytes (types are erased)

---

## Finding 13: Barrel File Wildcard Re-exports

**Files:**
- `packages/x-charts/src/ChartContainer/index.ts` -- `export * from './ChartContainer';`
- `packages/x-charts/src/ChartDataProvider/index.ts` -- `export * from './ChartDataProvider';`
- `packages/x-charts/src/ChartsContainer/index.ts` -- `export * from './ChartsContainer';`
- `packages/x-charts/src/ChartsWrapper/index.ts` -- `export * from './ChartsWrapper';`
- `packages/x-charts/src/ChartsClipPath/index.ts` -- `export * from './ChartsClipPath';`

**Category:** Unnecessary re-exports / Import optimization

Wildcard `export *` can hinder tree-shaking in some bundler configurations because the bundler must analyze the entire module graph to determine what is actually used. Named exports are more explicit and allow better dead code elimination.

**Suggested fix:** Replace wildcard exports with named exports:

```typescript
// Instead of:
export * from './ChartsContainer';

// Use:
export { ChartsContainer } from './ChartsContainer';
export type { ChartsContainerProps, ChartsContainerSlots, ChartsContainerSlotProps } from './ChartsContainer';
```

The `ChartsBrushOverlay/index.ts` already uses this better pattern with explicit named exports.

**Estimated gzip savings:** ~20-40 bytes per barrel file (140-280 bytes total across 7 files)

---

## Finding 14: Redundant `'use client'` Directive in Deprecated Wrappers

**Files:**
- `packages/x-charts/src/ChartContainer/ChartContainer.tsx` (line 1)
- `packages/x-charts/src/ChartContainer/useChartContainerProps.ts` (line 1)

**Category:** Dead code

Both files have `'use client'` but the actual components they re-export already have their own `'use client'` directives. The duplicated directive is redundant since the real implementation lives in `ChartsContainer/`.

**Suggested fix:** Remove `'use client'` from the deprecated wrapper files.

**Estimated gzip savings:** ~20-30 bytes

---

## Finding 15: Double Type Assertion in useChartsContainerProps

**File:** `packages/x-charts/src/ChartsContainer/useChartsContainerProps.ts`
**Line:** 113 (approximate, from grep)
**Category:** Unnecessary type assertions

**Current code:**
```typescript
} as unknown as ChartDataProviderProps<TSeries, TSignatures>;
```

**Suggested fix:** Refactor the object construction so the intermediate `unknown` cast is not needed. This is a code smell indicating type mismatch that the code papers over. If unavoidable, `as any` is 8 bytes shorter than `as unknown as` (12 bytes).

**Estimated gzip savings:** ~4-8 bytes

---

## Summary

| # | Finding | File(s) | Category | Est. Gzip Savings |
|---|---------|---------|----------|--------------------|
| 1 | Deprecated ChartContainer wrapper | ChartContainer/ChartContainer.tsx | Dead code | 500-700 B |
| 2 | Deprecated useChartContainerProps wrapper | ChartContainer/useChartContainerProps.ts | Dead code | 400-550 B |
| 3 | Massive repeated PropTypes block | ChartsContainer/ChartsContainer.tsx | String repetition | 800-1200 B |
| 4 | Repeated string literals in layout helpers | ChartsWrapper/ChartsWrapper.tsx | String repetition | 150-250 B |
| 5 | Redundant conditional branches | ChartsWrapper/ChartsWrapper.tsx | Verbose conditionals | 80-120 B |
| 6 | Verbose grid template string construction | ChartsWrapper/ChartsWrapper.tsx | Verbose patterns | 40-70 B |
| 7 | Default offset object on every render | ChartsClipPath/ChartsClipPath.tsx | Unnecessary object spreads | 20-30 B |
| 8 | Long theme palette ternary chain | ChartsBrushOverlay/ChartsBrushOverlay.tsx | Verbose patterns | 30-50 B |
| 9 | Repeated store.use() calls | ChartsBrushOverlay/ChartsBrushOverlay.tsx | Verbose patterns | 40-60 B |
| 10 | Triplicated BrushRect render blocks | ChartsBrushOverlay/ChartsBrushOverlay.tsx | Duplicate code | 120-180 B |
| 11 | Unnecessary JSX string quoting | ChartsBrushOverlay/ChartsBrushOverlay.tsx | Verbose patterns | 2-4 B |
| 12 | Empty extending interfaces | ChartsContainer + ChartDataProvider | Dead code (types) | 0 B |
| 13 | Barrel file wildcard re-exports | Multiple index.ts files | Import optimization | 140-280 B |
| 14 | Redundant 'use client' in deprecated wrappers | ChartContainer/ (2 files) | Dead code | 20-30 B |
| 15 | Double type assertion (`as unknown as`) | ChartsContainer/useChartsContainerProps.ts | Unnecessary type assertions | 4-8 B |

**Total estimated gzip savings: ~2.35-3.53 KB**

### Priority Ranking

**High impact (remove deprecated code in next major):**
- Finding 1 + 2: ~900-1250 bytes combined from deprecated ChartContainer wrappers

**High impact (requires tooling change):**
- Finding 3: ~800-1200 bytes from PropTypes extraction (needs changes to proptypes generator)

**Medium impact (straightforward code changes):**
- Finding 4 + 5 + 6: ~270-440 bytes from ChartsWrapper layout refactoring
- Finding 10: ~120-180 bytes from BrushRect render deduplication
- Finding 13: ~140-280 bytes from barrel file explicit exports

**Low impact (micro-optimizations):**
- Findings 7, 8, 9, 11, 14, 15: ~116-182 bytes combined
