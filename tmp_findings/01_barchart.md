# Gzip Bundle Size Optimization Findings - BarChart Components

Analysis of all `.ts` and `.tsx` files under `packages/x-charts/src/BarChart/` in the following subdirectories:
- `BarChart/` (root files)
- `BarChart/AnimatedBarElement/` (exported as `AnimatedBarElement.tsx` at root)
- `BarChart/BarElement/` (exported as `BarElement.tsx` at root)
- `BarChart/BarLabel/`
- `BarChart/BatchBarPlot/`

---

## Finding 1: Redundant Optional Chaining After Truthiness Check

**File:** `packages/x-charts/src/BarChart/BarLabel/getBarLabel.ts`
**Lines:** 15-17

**Current code:**
```typescript
if (barLabel === 'value') {
  // We don't want to show the label if the value is 0
  return value ? value?.toString() : null;
}
```

**Issue:** The ternary already guards with `value ?`, so `value` is guaranteed truthy in the true branch. The optional chaining `value?.toString()` is redundant; `value.toString()` suffices.

**Suggested fix:**
```typescript
if (barLabel === 'value') {
  return value ? value.toString() : null;
}
```

**Estimated gzip savings:** ~2 bytes

---

## Finding 2: Repeated Condition `props.layout === 'vertical'` (4 Times)

**File:** `packages/x-charts/src/BarChart/BarClipPath.tsx`
**Lines:** 48-54

**Current code:**
```typescript
const initialProps = {
  x: props.layout === 'vertical' ? props.x : props.xOrigin,
  y: props.layout === 'vertical' ? props.yOrigin : props.y,
  width: props.layout === 'vertical' ? props.width : 0,
  height: props.layout === 'vertical' ? 0 : props.height,
  borderRadius: props.borderRadius,
};
```

**Issue:** The identical condition `props.layout === 'vertical'` is evaluated four times in a row. Extracting it to a local boolean variable removes three repetitions of the string comparison.

**Suggested fix:**
```typescript
const isVertical = props.layout === 'vertical';
const initialProps = {
  x: isVertical ? props.x : props.xOrigin,
  y: isVertical ? props.yOrigin : props.y,
  width: isVertical ? props.width : 0,
  height: isVertical ? 0 : props.height,
  borderRadius: props.borderRadius,
};
```

**Estimated gzip savings:** ~25 bytes (removes 3 repetitions of `props.layout === 'vertical'`)

---

## Finding 3: Duplicate `React.useMemo` Creating Identical Object Shapes

**File:** `packages/x-charts/src/BarChart/BarElement.tsx`
**Lines:** 71-86

**Current code:**
```typescript
const itemIdentifier = React.useMemo(
  () => ({ type: 'bar' as const, seriesId, dataIndex }),
  [seriesId, dataIndex],
);
const interactionProps = useInteractionItemProps(itemIdentifier);
const { isFaded, isHighlighted } = useItemHighlighted(itemIdentifier);
const isFocused = useIsItemFocused(
  React.useMemo(
    () => ({
      type: 'bar',
      seriesId,
      dataIndex,
    }),
    [seriesId, dataIndex],
  ),
);
```

**Issue:** Two separate `React.useMemo` calls produce objects with an identical shape `{ type: 'bar', seriesId, dataIndex }` with the same dependency arrays `[seriesId, dataIndex]`. The first is stored in `itemIdentifier`; the second is an anonymous inline memo passed directly to `useIsItemFocused`. The already-computed `itemIdentifier` can be reused.

**Suggested fix:**
```typescript
const itemIdentifier = React.useMemo(
  () => ({ type: 'bar' as const, seriesId, dataIndex }),
  [seriesId, dataIndex],
);
const interactionProps = useInteractionItemProps(itemIdentifier);
const { isFaded, isHighlighted } = useItemHighlighted(itemIdentifier);
const isFocused = useIsItemFocused(itemIdentifier);
```

**Estimated gzip savings:** ~60-70 bytes (removes entire second `React.useMemo` call, factory function, and dependency array)

---

## Finding 4: Duplicate `transformOrigin` Template Literals in AnimatedGroup

**File:** `packages/x-charts/src/BarChart/BatchBarPlot/BarGroup.tsx`
**Lines:** 78-131

**Current code:**
```typescript
if (layout === 'horizontal') {
  animateChildren.push(
    <AnimatedRect
      key="left"
      data-orientation="horizontal"
      x={drawingArea.left}
      width={xOrigin - drawingArea.left}
      y={drawingArea.top}
      height={drawingArea.height}
      style={{
        transformOrigin: `${xOrigin}px ${drawingArea.top + drawingArea.height / 2}px`,
      }}
    />,
  );
  animateChildren.push(
    <AnimatedRect
      key="right"
      data-orientation="horizontal"
      x={xOrigin}
      width={drawingArea.left + drawingArea.width - xOrigin}
      y={drawingArea.top}
      height={drawingArea.height}
      style={{
        transformOrigin: `${xOrigin}px ${drawingArea.top + drawingArea.height / 2}px`,
      }}
    />,
  );
} else {
  animateChildren.push(
    <AnimatedRect
      key="top"
      data-orientation="vertical"
      x={drawingArea.left}
      width={drawingArea.width}
      y={drawingArea.top}
      height={yOrigin - drawingArea.top}
      style={{
        transformOrigin: `${drawingArea.left + drawingArea.width / 2}px ${yOrigin}px`,
      }}
    />,
  );
  animateChildren.push(
    <AnimatedRect
      key="bottom"
      data-orientation="vertical"
      x={drawingArea.left}
      width={drawingArea.width}
      y={yOrigin}
      height={drawingArea.top + drawingArea.height - yOrigin}
      style={{
        transformOrigin: `${drawingArea.left + drawingArea.width / 2}px ${yOrigin}px`,
      }}
    />,
  );
}
```

**Issue:** Within each branch, the `transformOrigin` template literal is byte-for-byte identical between the two `<AnimatedRect>` elements, and the `style` object is recreated each time. The horizontal branch computes `\`${xOrigin}px ${drawingArea.top + drawingArea.height / 2}px\`` twice; the vertical branch computes `\`${drawingArea.left + drawingArea.width / 2}px ${yOrigin}px\`` twice. Pre-computing the style object once per branch saves the duplicate template literal and object allocation.

**Suggested fix:**
```typescript
if (layout === 'horizontal') {
  const style = {
    transformOrigin: `${xOrigin}px ${drawingArea.top + drawingArea.height / 2}px`,
  };
  animateChildren.push(
    <AnimatedRect
      key="left"
      data-orientation="horizontal"
      x={drawingArea.left}
      width={xOrigin - drawingArea.left}
      y={drawingArea.top}
      height={drawingArea.height}
      style={style}
    />,
    <AnimatedRect
      key="right"
      data-orientation="horizontal"
      x={xOrigin}
      width={drawingArea.left + drawingArea.width - xOrigin}
      y={drawingArea.top}
      height={drawingArea.height}
      style={style}
    />,
  );
} else {
  const style = {
    transformOrigin: `${drawingArea.left + drawingArea.width / 2}px ${yOrigin}px`,
  };
  animateChildren.push(
    <AnimatedRect
      key="top"
      data-orientation="vertical"
      x={drawingArea.left}
      width={drawingArea.width}
      y={drawingArea.top}
      height={yOrigin - drawingArea.top}
      style={style}
    />,
    <AnimatedRect
      key="bottom"
      data-orientation="vertical"
      x={drawingArea.left}
      width={drawingArea.width}
      y={yOrigin}
      height={drawingArea.top + drawingArea.height - yOrigin}
      style={style}
    />,
  );
}
```

Also note: each branch calls `animateChildren.push(...)` twice when a single `push(item1, item2)` call suffices, saving an additional function call.

**Estimated gzip savings:** ~40-50 bytes (removes duplicate template literals, duplicate style objects, and extra push calls)

---

## Finding 5: Verbose `getTextAnchor` and `getDominantBaseline` Can Be Simplified

**File:** `packages/x-charts/src/BarChart/BarLabel/BarLabel.tsx`
**Lines:** 106-144

**Current code:**
```typescript
function getTextAnchor({
  placement,
  layout,
  xOrigin,
  x,
}: Pick<
  BarLabelProps,
  'layout' | 'placement' | 'x' | 'y' | 'xOrigin' | 'yOrigin'
>): React.SVGAttributes<SVGTextElement>['textAnchor'] {
  if (placement === 'outside') {
    if (layout === 'horizontal') {
      return x < xOrigin ? 'end' : 'start';
    }

    return 'middle';
  }

  return 'middle';
}

function getDominantBaseline({
  placement,
  layout,
  yOrigin,
  y,
}: Pick<
  BarLabelProps,
  'layout' | 'placement' | 'x' | 'y' | 'xOrigin' | 'yOrigin'
>): React.SVGAttributes<SVGTextElement>['dominantBaseline'] {
  if (placement === 'outside') {
    if (layout === 'horizontal') {
      return 'central';
    }

    return y < yOrigin ? 'auto' : 'hanging';
  }

  return 'central';
}
```

**Issue 5a:** In `getTextAnchor`, both the `else` of the inner `if` and the `else` of the outer `if` return `'middle'`. The outer and fallback returns can be collapsed.

**Issue 5b:** In `getDominantBaseline`, both the `else` of the inner `if` (not-outside) and the inner `if` body (outside + horizontal) return `'central'`. The only distinct case is `placement === 'outside' && layout !== 'horizontal'`.

**Issue 5c:** Both functions destructure from the same `Pick<BarLabelProps, ...>` type that includes `'x' | 'y' | 'xOrigin' | 'yOrigin'`, but `getTextAnchor` does not use `y` or `yOrigin`, and `getDominantBaseline` does not use `x` or `xOrigin`. The Pick type is over-specified but this is a type-only issue (no runtime cost).

**Suggested fix:**
```typescript
function getTextAnchor(props: Pick<BarLabelProps, 'layout' | 'placement' | 'x' | 'xOrigin'>) {
  if (props.placement === 'outside' && props.layout === 'horizontal') {
    return props.x < props.xOrigin ? 'end' : 'start';
  }
  return 'middle';
}

function getDominantBaseline(props: Pick<BarLabelProps, 'layout' | 'placement' | 'y' | 'yOrigin'>) {
  if (props.placement === 'outside' && props.layout !== 'horizontal') {
    return props.y < props.yOrigin ? 'auto' : 'hanging';
  }
  return 'central';
}
```

**Estimated gzip savings:** ~50-60 bytes (removes nested if/else, duplicate return statements, destructuring, and over-specified Pick types)

---

## Finding 6: Duplicate `onItemEnter` / `onItemLeave` Handler Pattern

**File:** `packages/x-charts/src/BarChart/BatchBarPlot/BatchBarPlot.tsx`
**Lines:** 35-64

**Current code:**
```typescript
const onItemEnter = onItemClick
  ? () => {
      const svg = svgRef.current;

      if (!svg) {
        return;
      }

      if (prevCursorRef.current == null) {
        prevCursorRef.current = svg.style.cursor;
        // eslint-disable-next-line react-compiler/react-compiler
        svg.style.cursor = 'pointer';
      }
    }
  : undefined;

const onItemLeave = onItemClick
  ? () => {
      const svg = svgRef.current;

      if (!svg) {
        return;
      }

      if (prevCursorRef.current != null) {
        svg.style.cursor = prevCursorRef.current;
        prevCursorRef.current = null;
      }
    }
  : undefined;
```

**Issue:** Both handlers start with the same guard: check `onItemClick`, get `svgRef.current`, early-return if null. The pattern `const svg = svgRef.current; if (!svg) { return; }` is duplicated verbatim.

**Suggested fix:** Extract the SVG access into a shared helper:
```typescript
const getSvg = () => svgRef.current;

const onItemEnter = onItemClick
  ? () => {
      const svg = getSvg();
      if (!svg) return;
      if (prevCursorRef.current == null) {
        prevCursorRef.current = svg.style.cursor;
        svg.style.cursor = 'pointer';
      }
    }
  : undefined;

const onItemLeave = onItemClick
  ? () => {
      const svg = getSvg();
      if (!svg) return;
      if (prevCursorRef.current != null) {
        svg.style.cursor = prevCursorRef.current;
        prevCursorRef.current = null;
      }
    }
  : undefined;
```

**Estimated gzip savings:** ~10-15 bytes (gzip deduplicates the repeated `svgRef.current` and guard pattern better with a shared reference)

---

## Finding 7: Repeated `.find()` Pattern With Identical Lambda

**File:** `packages/x-charts/src/BarChart/BatchBarPlot/BatchBarPlot.tsx`
**Lines:** 156-164

**Current code:**
```typescript
const seriesHighlightedItem =
  seriesHighlightedDataIndex != null
    ? processedSeries.data.find((v) => v.dataIndex === seriesHighlightedDataIndex) || null
    : null;

const seriesUnfadedItem =
  seriesUnfadedDataIndex != null
    ? processedSeries.data.find((v) => v.dataIndex === seriesUnfadedDataIndex) || null
    : null;
```

**Issue:** Two nearly identical ternary + `.find()` expressions. They share the same structure: check if index is not null, find the item in the same array with the same lambda shape, fallback to null. A small helper function would deduplicate the pattern.

**Suggested fix:**
```typescript
const findItem = (idx: number | null) =>
  idx != null ? processedSeries.data.find((v) => v.dataIndex === idx) ?? null : null;

const seriesHighlightedItem = findItem(seriesHighlightedDataIndex);
const seriesUnfadedItem = findItem(seriesUnfadedDataIndex);
```

**Estimated gzip savings:** ~30-35 bytes (removes duplicated ternary, `.find()`, lambda, and `|| null`)

---

## Finding 8: Verbose Conditional `? ... : undefined` for Boolean Data Attributes

**File:** `packages/x-charts/src/BarChart/AnimatedBarElement.tsx`
**Lines:** 57-60

**Current code:**
```typescript
filter={ownerState.isHighlighted ? 'brightness(120%)' : undefined}
opacity={ownerState.isFaded ? 0.3 : 1}
data-highlighted={ownerState.isHighlighted || undefined}
data-faded={ownerState.isFaded || undefined}
```

**Issue:** The `filter` prop uses the verbose `? ... : undefined` pattern. Since React omits attributes when the value is `undefined` or `false`, the `||` short-circuit works identically for the `filter` attribute:

**Suggested fix:**
```typescript
filter={ownerState.isHighlighted && 'brightness(120%)'}
```

**Estimated gzip savings:** ~8 bytes

---

## Finding 9: Repeated String `'brightness(120%)'`

**Files:**
- `packages/x-charts/src/BarChart/AnimatedBarElement.tsx` line 57
- `packages/x-charts/src/BarChart/BatchBarPlot/BatchBarPlot.tsx` line 172

**Current code (AnimatedBarElement.tsx):**
```typescript
filter={ownerState.isHighlighted ? 'brightness(120%)' : undefined}
```

**Current code (BatchBarPlot.tsx):**
```typescript
filter="brightness(120%)"
```

**Issue:** The literal string `'brightness(120%)'` appears in two separate files. If these files end up in the same chunk, a shared constant would aid gzip dictionary reuse.

**Suggested fix:** Define once in a shared location:
```typescript
export const HIGHLIGHT_FILTER = 'brightness(120%)';
```

**Estimated gzip savings:** ~5-8 bytes (depends on chunk boundaries)

---

## Finding 10: Repeated Opacity Value `0.3` for Faded State

**Files:**
- `packages/x-charts/src/BarChart/AnimatedBarElement.tsx` line 58: `opacity={ownerState.isFaded ? 0.3 : 1}`
- `packages/x-charts/src/BarChart/BatchBarPlot/BarGroup.tsx` line 10: `opacity: 0.3,`
- `packages/x-charts/src/BarChart/BarLabel/BarLabel.tsx` line 93: `const fadedOpacity = isFaded ? 0.3 : 1;`

**Issue:** The faded opacity value `0.3` is used in three files across the bar chart subsystem. A shared constant would improve consistency and gzip efficiency.

**Suggested fix:**
```typescript
export const FADED_OPACITY = 0.3;
```

**Estimated gzip savings:** ~5-8 bytes

---

## Finding 11: `useCreateBarPaths` Is Not Actually a Hook

**File:** `packages/x-charts/src/BarChart/BatchBarPlot/useCreateBarPaths.ts`
**Lines:** 53-77

**Current code:**
```typescript
export function useCreateBarPaths(seriesData: ProcessedBarSeriesData, borderRadius: number) {
  const paths = new Map<string, string[]>();
  const temporaryPaths = new Map<string, string[]>();

  for (let j = 0; j < seriesData.data.length; j += 1) {
    const barData = seriesData.data[j];
    const pathString = createPath(barData, borderRadius);
    const tempPath = appendAtKey(temporaryPaths, barData.color, pathString);

    if (tempPath.length >= MAX_POINTS_PER_PATH) {
      appendAtKey(paths, barData.color, tempPath.join(''));
      temporaryPaths.delete(barData.color);
    }
  }

  for (const [fill, tempPath] of temporaryPaths.entries()) {
    if (tempPath.length > 0) {
      appendAtKey(paths, fill, tempPath.join(''));
    }
  }

  return paths;
}
```

**Issue:** `useCreateBarPaths` is named as a hook (prefix `use`) but does not call any React hooks. It is a pure function that transforms data. The `use` prefix adds 3 bytes to the name and misleads the React compiler/linter into treating it as a hook. This is a naming/convention issue rather than a pure size issue, but renaming to `createBarPaths` would save 3 bytes at each call site (1 definition + 1 import + 1 call = 9 bytes raw, ~3 bytes gzipped).

**Suggested fix:** Rename to `createBarPaths`.

**Estimated gzip savings:** ~3 bytes

---

## Finding 12: Over-Specified Pick Types in Helper Functions

**File:** `packages/x-charts/src/BarChart/BarLabel/BarLabel.tsx`
**Lines:** 110-113, 131-133

**Current code (getTextAnchor):**
```typescript
}: Pick<
  BarLabelProps,
  'layout' | 'placement' | 'x' | 'y' | 'xOrigin' | 'yOrigin'
>
```

**Current code (getDominantBaseline):**
```typescript
}: Pick<
  BarLabelProps,
  'layout' | 'placement' | 'x' | 'y' | 'xOrigin' | 'yOrigin'
>
```

**Issue:** Both functions specify the same 6-field Pick type, but `getTextAnchor` only uses `placement`, `layout`, `xOrigin`, and `x` (not `y` or `yOrigin`), and `getDominantBaseline` only uses `placement`, `layout`, `yOrigin`, and `y` (not `x` or `xOrigin`). While this is erased at compile time and has zero runtime cost, the identical verbose Pick declaration is duplicated across both functions. Since these are private module functions, they could accept simpler inline parameter types or just accept the full props object.

**Estimated gzip savings:** 0 bytes (type-only, erased at compile time -- included for correctness)

---

## Finding 13: Repeated `borderRadiusSide` String Comparisons

**File:** `packages/x-charts/src/BarChart/BatchBarPlot/useCreateBarPaths.ts`
**Lines:** 39-45

**Current code:**
```typescript
export function createPath(barData: ProcessedBarData, borderRadius: number) {
  return generateBarPath(
    barData.x,
    barData.y,
    barData.width,
    barData.height,
    barData.borderRadiusSide === 'left' || barData.borderRadiusSide === 'top' ? borderRadius : 0,
    barData.borderRadiusSide === 'right' || barData.borderRadiusSide === 'top' ? borderRadius : 0,
    barData.borderRadiusSide === 'right' || barData.borderRadiusSide === 'bottom'
      ? borderRadius
      : 0,
    barData.borderRadiusSide === 'left' || barData.borderRadiusSide === 'bottom' ? borderRadius : 0,
  );
}
```

**Issue:** `barData.borderRadiusSide` is accessed 8 times. Each access is a property lookup on the same object. Extracting to a local variable `const s = barData.borderRadiusSide` reduces the repeated property path. The string comparisons `=== 'left'`, `=== 'top'`, `=== 'right'`, `=== 'bottom'` each appear twice.

**Suggested fix:**
```typescript
export function createPath(barData: ProcessedBarData, borderRadius: number) {
  const s = barData.borderRadiusSide;
  const r = borderRadius;
  return generateBarPath(
    barData.x,
    barData.y,
    barData.width,
    barData.height,
    s === 'left' || s === 'top' ? r : 0,
    s === 'right' || s === 'top' ? r : 0,
    s === 'right' || s === 'bottom' ? r : 0,
    s === 'left' || s === 'bottom' ? r : 0,
  );
}
```

**Estimated gzip savings:** ~30-35 bytes (eliminates 7 repetitions of `barData.borderRadiusSide` and 4 of `borderRadius`)

---

## Finding 14: Two Separate Early Returns Can Be Merged

**File:** `packages/x-charts/src/BarChart/BarLabel/BarLabelItem.tsx`
**Lines:** 156-171

**Current code:**
```typescript
if (!barLabel) {
  return null;
}

const formattedLabelText = getBarLabel({
  barLabel,
  value,
  dataIndex,
  seriesId,
  height,
  width,
});

if (!formattedLabelText) {
  return null;
}
```

**Issue:** The first guard (`!barLabel`) is followed by a function call, then a second guard (`!formattedLabelText`). The first guard is necessary to avoid calling `getBarLabel` with a falsy `barLabel`, but structurally these could be expressed more concisely by combining them:

**Suggested fix:**
```typescript
const formattedLabelText = barLabel && getBarLabel({
  barLabel,
  value,
  dataIndex,
  seriesId,
  height,
  width,
});

if (!formattedLabelText) {
  return null;
}
```

**Estimated gzip savings:** ~15-18 bytes (removes one `if` block and one `return null`)

---

## Finding 15: `React.Fragment` Can Use Short Syntax

**Files:**
- `packages/x-charts/src/BarChart/BatchBarPlot/BarGroup.tsx` lines 135, 141
- `packages/x-charts/src/BarChart/BatchBarPlot/BatchBarPlot.tsx` lines 70, 80, 100, 114, 136, 189
- `packages/x-charts/src/BarChart/IndividualBarPlot.tsx` lines 34, 98

**Current code (example):**
```tsx
<React.Fragment>{children}</React.Fragment>
```

**Issue:** `<React.Fragment>` is used throughout instead of the short syntax `<>`. Each occurrence adds ~14 characters vs `<>...</>`.

**Suggested fix:**
```tsx
<>{children}</>
```

**Note:** There may be project-level lint rules mandating `React.Fragment`. If not, this is a straightforward savings.

**Estimated gzip savings:** ~20-30 bytes across all occurrences (gzip compresses repeated `React.Fragment` well, but the shorter form is still smaller)

---

## Finding 16: Unused `hidden` Prop Destructured But Never Used in AnimatedBarElement

**File:** `packages/x-charts/src/BarChart/BarElement.tsx`
**Lines:** 68, 124

**Current code:**
```typescript
const {
  // ... other props
  hidden,
  ...other
} = props;
// ...
additionalProps: {
  // ... other props
  hidden,
},
```

**And in AnimatedBarElement.tsx, `hidden` is not in the destructured props nor used in the JSX output.** The `hidden` prop is destructured in `BarElement`, passed through `additionalProps`, ends up in `...other` in `AnimatedBarElement`, and is spread onto the `<rect>` element. The SVG `hidden` attribute on a `<rect>` is non-standard and has no visual effect in most browsers. This may be dead code.

**Estimated gzip savings:** ~10-12 bytes if confirmed dead and removed

---

## Finding 17: `animateChildren` Array Can Use Direct `push` With Multiple Arguments

**File:** `packages/x-charts/src/BarChart/BatchBarPlot/BarGroup.tsx`
**Lines:** 76-131

**Current code:**
```typescript
const animateChildren: React.ReactNode[] = [];

if (layout === 'horizontal') {
  animateChildren.push(
    <AnimatedRect ... />,
  );
  animateChildren.push(
    <AnimatedRect ... />,
  );
} else {
  animateChildren.push(
    <AnimatedRect ... />,
  );
  animateChildren.push(
    <AnimatedRect ... />,
  );
}
```

**Issue:** Each branch calls `.push()` twice. A single `.push(item1, item2)` call per branch removes one function call overhead.

**Suggested fix:**
```typescript
if (layout === 'horizontal') {
  animateChildren.push(
    <AnimatedRect key="left" ... />,
    <AnimatedRect key="right" ... />,
  );
} else {
  animateChildren.push(
    <AnimatedRect key="top" ... />,
    <AnimatedRect key="bottom" ... />,
  );
}
```

**Estimated gzip savings:** ~10-12 bytes (removes duplicate `.push(` calls and closing `);` lines)

---

## Finding 18: `siblings` Array in `FadedHighlightedBars` Could Be Direct JSX

**File:** `packages/x-charts/src/BarChart/BatchBarPlot/BatchBarPlot.tsx`
**Lines:** 166-189

**Current code:**
```typescript
const siblings: React.ReactNode[] = [];
if (seriesHighlightedItem != null) {
  siblings.push(
    <path
      key={`highlighted-${processedSeries.seriesId}`}
      fill={seriesHighlightedItem.color}
      filter="brightness(120%)"
      data-highlighted
      d={createPath(seriesHighlightedItem, borderRadius)}
    />,
  );
}

if (seriesUnfadedItem != null) {
  siblings.push(
    <path
      key={`unfaded-${seriesUnfadedItem.seriesId}`}
      fill={seriesUnfadedItem.color}
      d={createPath(seriesUnfadedItem, borderRadius)}
    />,
  );
}

return <React.Fragment>{siblings}</React.Fragment>;
```

**Issue:** An array is constructed imperatively then wrapped in a fragment. This can be expressed directly as JSX with conditional rendering, eliminating the array allocation and `.push()` calls.

**Suggested fix:**
```tsx
return (
  <>
    {seriesHighlightedItem != null && (
      <path
        key={`highlighted-${processedSeries.seriesId}`}
        fill={seriesHighlightedItem.color}
        filter="brightness(120%)"
        data-highlighted
        d={createPath(seriesHighlightedItem, borderRadius)}
      />
    )}
    {seriesUnfadedItem != null && (
      <path
        key={`unfaded-${seriesUnfadedItem.seriesId}`}
        fill={seriesUnfadedItem.color}
        d={createPath(seriesUnfadedItem, borderRadius)}
      />
    )}
  </>
);
```

**Estimated gzip savings:** ~20-25 bytes (removes array declaration, two `.push()` calls, wrapping Fragment reference)

---

## Finding 19: Repeated `processedSeries.seriesId` in FadedHighlightedBars

**File:** `packages/x-charts/src/BarChart/BatchBarPlot/BatchBarPlot.tsx`
**Lines:** 147-189

**Current code:** `processedSeries.seriesId` is accessed 4 times within the function body (lines 149, 153, 170, 182).

**Suggested fix:** Destructure at the top:
```typescript
const { seriesId, data } = processedSeries;
```

**Estimated gzip savings:** ~10-12 bytes

---

## Finding 20: `width / 2` and `height / 2` Repeated in `generateBarPath`

**File:** `packages/x-charts/src/BarChart/BatchBarPlot/useCreateBarPaths.ts`
**Lines:** 16-19

**Current code:**
```typescript
const tLBR = Math.min(topLeftBorderRadius, width / 2, height / 2);
const tRBR = Math.min(topRightBorderRadius, width / 2, height / 2);
const bRBR = Math.min(bottomRightBorderRadius, width / 2, height / 2);
const bLBR = Math.min(bottomLeftBorderRadius, width / 2, height / 2);
```

**Issue:** `width / 2` and `height / 2` are computed 4 times each.

**Suggested fix:**
```typescript
const hw = width / 2;
const hh = height / 2;
const tLBR = Math.min(topLeftBorderRadius, hw, hh);
const tRBR = Math.min(topRightBorderRadius, hw, hh);
const bRBR = Math.min(bottomRightBorderRadius, hw, hh);
const bLBR = Math.min(bottomLeftBorderRadius, hw, hh);
```

**Estimated gzip savings:** ~15-18 bytes (removes 6 repeated `width / 2` and `height / 2` expressions)

---

## Summary

| # | File | Category | Est. Gzip Savings |
|---|------|----------|-------------------|
| 1 | getBarLabel.ts | Redundant optional chaining | ~2 bytes |
| 2 | BarClipPath.tsx | Repeated condition extraction | ~25 bytes |
| 3 | BarElement.tsx | Duplicate useMemo | ~60-70 bytes |
| 4 | BarGroup.tsx | Duplicate template literals + style objects | ~40-50 bytes |
| 5 | BarLabel.tsx | Verbose conditionals in helpers | ~50-60 bytes |
| 6 | BatchBarPlot.tsx | Duplicate handler guard pattern | ~10-15 bytes |
| 7 | BatchBarPlot.tsx | Duplicate .find() pattern | ~30-35 bytes |
| 8 | AnimatedBarElement.tsx | Verbose ternary for filter | ~8 bytes |
| 9 | AnimatedBarElement.tsx + BatchBarPlot.tsx | Repeated brightness string | ~5-8 bytes |
| 10 | Multiple files | Repeated faded opacity 0.3 | ~5-8 bytes |
| 11 | useCreateBarPaths.ts | Misleading hook naming | ~3 bytes |
| 12 | BarLabel.tsx | Over-specified Pick types | 0 bytes (type-only) |
| 13 | useCreateBarPaths.ts | Repeated property access | ~30-35 bytes |
| 14 | BarLabelItem.tsx | Mergeable early returns | ~15-18 bytes |
| 15 | Multiple files | React.Fragment vs short syntax | ~20-30 bytes |
| 16 | BarElement.tsx | Potentially dead `hidden` prop | ~10-12 bytes |
| 17 | BarGroup.tsx | Multiple push calls | ~10-12 bytes |
| 18 | BatchBarPlot.tsx | Imperative array vs JSX | ~20-25 bytes |
| 19 | BatchBarPlot.tsx | Repeated property path | ~10-12 bytes |
| 20 | useCreateBarPaths.ts | Repeated division expressions | ~15-18 bytes |
| **Total** | | | **~370-450 bytes** |

### Highest-Impact Findings (by estimated savings)

1. **Finding 3** (~60-70 bytes): Duplicate `React.useMemo` in BarElement.tsx
2. **Finding 5** (~50-60 bytes): Verbose helper functions in BarLabel.tsx
3. **Finding 4** (~40-50 bytes): Duplicate template literals in BarGroup.tsx
4. **Finding 7** (~30-35 bytes): Duplicate `.find()` in BatchBarPlot.tsx
5. **Finding 13** (~30-35 bytes): Repeated `borderRadiusSide` property access
6. **Finding 2** (~25 bytes): Repeated layout condition in BarClipPath.tsx
