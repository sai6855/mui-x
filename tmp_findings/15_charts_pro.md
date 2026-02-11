# Bundle Size Findings: `packages/x-charts-pro/src/`

## Overview

Analysis of all `.ts` and `.tsx` files in `packages/x-charts-pro/src/` and subdirectories for gzip bundle size optimization opportunities.

**Note:** Many files in this package are auto-generated barrel re-exports (e.g., `export * from '@mui/x-charts/BarChart'`) and auto-generated PropTypes blocks. These cannot be meaningfully optimized manually. The findings below focus on hand-written code.

---

## Finding 1: Unnecessary `React.Fragment` Wrappers in Toolbar Trigger Components

**Files:**
- `packages/x-charts-pro/src/ChartsToolbarPro/ChartsToolbarImageExportTrigger.tsx` (line 54)
- `packages/x-charts-pro/src/ChartsToolbarPro/ChartsToolbarPrintExportTrigger.tsx` (line 59)
- `packages/x-charts-pro/src/ChartsToolbarPro/ChartsToolbarZoomInTrigger.tsx` (line 45)
- `packages/x-charts-pro/src/ChartsToolbarPro/ChartsToolbarZoomOutTrigger.tsx` (line 45)

**Current code (repeated in 4 files):**
```tsx
return <React.Fragment>{element}</React.Fragment>;
```

**Suggested fix:**
```tsx
return element;
```

**Explanation:** `useComponentRenderer` already returns a React element. Wrapping it in `React.Fragment` adds unnecessary JSX compilation overhead. Each `<React.Fragment>` compiles to `React.createElement(React.Fragment, null, element)` or equivalent JSX runtime call.

**Estimated gzip savings:** ~60-80 bytes (across 4 files, the repeated pattern compresses well but the base overhead per instance is ~15-20 bytes)

---

## Finding 2: Verbose Ternary Operators in Thumb Class Utility

**File:** `packages/x-charts-pro/src/ChartZoomSlider/internals/chartAxisZoomSliderThumbClasses.ts` (lines 37-40)

**Current code:**
```ts
const slots = {
  root: [
    'root',
    orientation === 'horizontal' ? 'horizontal' : 'vertical',
    placement === 'start' ? 'start' : 'end',
  ],
};
```

**Suggested fix:**
```ts
const slots = {
  root: ['root', orientation, placement],
};
```

**Explanation:** Since `orientation` can only be `'horizontal'` or `'vertical'` and `placement` can only be `'start'` or `'end'`, the ternaries are redundant -- the variable already holds the exact string value being selected.

**Estimated gzip savings:** ~5 bytes (ternary expressions vs direct variable references)

---

## Finding 3: Duplicate SVG Path String Between Zoom Icons

**File:** `packages/x-charts-pro/src/internals/material/icons.tsx` (lines 4-15)

**Current code:**
```tsx
export const ChartsZoomInIcon = createSvgIcon(
  <React.Fragment>
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14" />
    <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2z" />
  </React.Fragment>,
  'ZoomIn',
);

export const ChartsZoomOutIcon = createSvgIcon(
  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14M7 9h5v1H7z" />,
  'ZoomOut',
);
```

**Suggested fix:**
```tsx
const SEARCH_ICON_PATH = "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14";

export const ChartsZoomInIcon = createSvgIcon(
  <React.Fragment>
    <path d={SEARCH_ICON_PATH} />
    <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2z" />
  </React.Fragment>,
  'ZoomIn',
);

export const ChartsZoomOutIcon = createSvgIcon(
  <path d={`${SEARCH_ICON_PATH}M7 9h5v1H7z`} />,
  'ZoomOut',
);
```

**Explanation:** The ZoomIn and ZoomOut icons share the same magnifying glass base path (~200 characters). The ZoomOut icon appends a small minus sign path inline. Extracting the shared path to a constant helps gzip since the string literal appears only once.

**Estimated gzip savings:** ~30 bytes (gzip already handles some repetition, but extracting to a variable helps the compressor match the pattern more efficiently)

---

## Finding 4: Unnecessary Fragment Wrapper in ZoomIn Icon

**File:** `packages/x-charts-pro/src/internals/material/icons.tsx` (lines 5-8)

**Current code:**
```tsx
<React.Fragment>
  <path d="..." />
  <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2z" />
</React.Fragment>
```

**Suggested fix:**
This Fragment is actually necessary here since `createSvgIcon` expects a single child and there are two `<path>` elements. This finding is a false positive -- the Fragment is required.

**Estimated gzip savings:** 0 bytes

---

## Finding 5: Duplicate Map/Filter Pattern in ChartZoomSlider

**File:** `packages/x-charts-pro/src/ChartZoomSlider/ChartZoomSlider.tsx` (lines 12-36)

**Current code:**
```tsx
return (
  <React.Fragment>
    {xAxisIds.map((axisId) => {
      const xAxis = xAxes[axisId];
      const slider = xAxis.zoom?.slider;
      if (!slider?.enabled) {
        return null;
      }
      return <ChartAxisZoomSlider key={axisId} axisId={axisId} axisDirection="x" />;
    })}
    {yAxisIds.map((axisId) => {
      const yAxis = yAxes[axisId];
      const slider = yAxis.zoom?.slider;
      if (!slider?.enabled) {
        return null;
      }
      return <ChartAxisZoomSlider key={axisId} axisId={axisId} axisDirection="y" />;
    })}
  </React.Fragment>
);
```

**Suggested fix:**
```tsx
const renderSliders = (ids: string[], axes: Record<string, any>, dir: 'x' | 'y') =>
  ids.map((axisId) => axes[axisId].zoom?.slider?.enabled
    ? <ChartAxisZoomSlider key={axisId} axisId={axisId} axisDirection={dir} />
    : null);

return (
  <React.Fragment>
    {renderSliders(xAxisIds, xAxes, 'x')}
    {renderSliders(yAxisIds, yAxes, 'y')}
  </React.Fragment>
);
```

**Explanation:** The two `.map()` callbacks are nearly identical, differing only in the axis direction and the axes object. Extracting to a shared helper eliminates the duplication.

**Estimated gzip savings:** ~80 bytes (eliminates ~15 lines of near-duplicate code)

---

## Finding 6: Duplicate Ternary Logic in Track Class Utility

**File:** `packages/x-charts-pro/src/ChartZoomSlider/internals/chartAxisZoomSliderTrackClasses.ts` (lines 36-39)

**Current code:**
```ts
const slots = {
  background: [axisDirection === 'x' ? 'horizontal' : 'vertical', 'background'],
  active: [axisDirection === 'x' ? 'horizontal' : 'vertical', 'active'],
};
```

**Suggested fix:**
```ts
const dir = axisDirection === 'x' ? 'horizontal' : 'vertical';
const slots = {
  background: [dir, 'background'],
  active: [dir, 'active'],
};
```

**Explanation:** The same ternary expression `axisDirection === 'x' ? 'horizontal' : 'vertical'` is evaluated twice. Caching the result in a variable eliminates the duplication.

**Estimated gzip savings:** ~25 bytes

---

## Finding 7: Theme Variable Caching in FunnelSectionLabel

**File:** `packages/x-charts-pro/src/FunnelChart/FunnelSectionLabel.tsx` (lines 45-52)

**Current code:**
```tsx
fontFamily={theme.typography.body2.fontFamily}
fontSize={theme.typography.body2.fontSize}
fontSizeAdjust={theme.typography.body2.fontSizeAdjust}
fontWeight={theme.typography.body2.fontWeight}
letterSpacing={theme.typography.body2.letterSpacing}
fontStretch={theme.typography.body2.fontStretch}
fontStyle={theme.typography.body2.fontStyle}
fontVariant={theme.typography.body2.fontVariant}
```

**Suggested fix:**
```tsx
const { fontFamily, fontSize, fontSizeAdjust, fontWeight, letterSpacing, fontStretch, fontStyle, fontVariant } = theme.typography.body2;
// ...
fontFamily={fontFamily}
fontSize={fontSize}
fontSizeAdjust={fontSizeAdjust}
fontWeight={fontWeight}
letterSpacing={letterSpacing}
fontStretch={fontStretch}
fontStyle={fontStyle}
fontVariant={fontVariant}
```

Or even more concise with a spread of relevant properties:
```tsx
const body2Style = (({ fontFamily, fontSize, fontSizeAdjust, fontWeight, letterSpacing, fontStretch, fontStyle, fontVariant }) =>
  ({ fontFamily, fontSize, fontSizeAdjust, fontWeight, letterSpacing, fontStretch, fontStyle, fontVariant }))(theme.typography.body2);
// ...
<text {...body2Style} ...>
```

**Explanation:** `theme.typography.body2` is accessed 8 times. Destructuring the properties once eliminates the repeated property access chain `theme.typography.body2.` which appears 8 times in the compiled output.

**Estimated gzip savings:** ~30 bytes (the repeated `theme.typography.body2.` string pattern, though gzip handles repetition, shorter references still help)

---

## Finding 8: Empty Array Literals in Conditional Class Slots

**File:** `packages/x-charts-pro/src/FunnelChart/funnelSectionClasses.ts` (lines 38-39)

**Current code:**
```ts
outlined: variant === 'outlined' ? ['outlined'] : [],
filled: variant === 'filled' ? ['filled'] : [],
```

**Suggested fix:**
This is actually a standard MUI pattern used with `composeClasses`. An empty array means "no classes applied." While you could theoretically use `undefined` or a constant empty array, the pattern is idiomatic in MUI and the savings would be minimal (2 bytes per `[]` literal).

**Estimated gzip savings:** ~3-5 bytes (if empty array constant were shared)

---

## Summary Table

| # | Finding | File(s) | Est. Gzip Savings |
|---|---------|---------|-------------------|
| 1 | Unnecessary `React.Fragment` wrappers | 4 Toolbar trigger files | ~60-80 bytes |
| 2 | Verbose ternary operators (identity check) | chartAxisZoomSliderThumbClasses.ts | ~5 bytes |
| 3 | Duplicate SVG path string | icons.tsx | ~30 bytes |
| 4 | Fragment in ZoomIn icon (false positive) | icons.tsx | 0 bytes |
| 5 | Duplicate map/filter pattern | ChartZoomSlider.tsx | ~80 bytes |
| 6 | Duplicate ternary logic | chartAxisZoomSliderTrackClasses.ts | ~25 bytes |
| 7 | Theme variable caching | FunnelSectionLabel.tsx | ~30 bytes |
| 8 | Empty array literals in conditionals | funnelSectionClasses.ts | ~3-5 bytes |
| **Total** | | | **~233-255 bytes** |

## Notes

- The `x-charts-pro` package is already fairly well-optimized in its hand-written code.
- A large portion of the package consists of auto-generated re-export barrel files (`export * from '@mui/x-charts/...'`) which cannot be optimized.
- The largest files by line count (`LineChartPro.tsx` at ~2165 lines, `ScatterChartPro.tsx` at ~2153 lines) are almost entirely auto-generated PropTypes blocks (95%+ of the file) and should not be manually modified.
- The most impactful optimization would be Finding 5 (deduplicating the zoom slider rendering logic) at ~80 bytes.
- Finding 1 (removing unnecessary Fragment wrappers) is the most straightforward change with good savings across 4 files.
