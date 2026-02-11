# Bundle Size Optimization Report: `packages/x-charts-premium/src/`

## Overview

The x-charts-premium package consists primarily of pure re-export barrel files (~30 files) that forward exports from `@mui/x-charts` and `@mui/x-charts-pro`, combined with a smaller set of premium-specific components: `BarChartPremium`, `HeatmapPremium`, `ChartsRenderer`, `ChartDataProviderPremium`, `ChartContainerPremium`, `ChartsContainerPremium`, and supporting RangeBar series config files.

Total files analyzed: ~90 `.ts` and `.tsx` files.

---

## Finding 1: Conditional Empty Object Spreads in Configuration

**File:** `packages/x-charts-premium/src/ChartsRenderer/configuration.tsx`
**Lines:** 83-100 and 101-113

**Current Code:**
```typescript
...(tickOptions
  ? {
      tickPlacement: {
        label: localeText.chartConfigurationTickPlacement,
        type: 'select',
        default: 'extremities',
        options: [
          { content: localeText.chartConfigurationOptionEnd, value: 'end' },
          {
            content: localeText.chartConfigurationOptionExtremities,
            value: 'extremities',
          },
          { content: localeText.chartConfigurationOptionMiddle, value: 'middle' },
          { content: localeText.chartConfigurationOptionStart, value: 'start' },
        ],
      },
    }
  : {}),
...(tickOptions
  ? {
      tickLabelPlacement: {
        label: localeText.chartConfigurationTickLabelPlacement,
        type: 'select',
        default: 'middle',
        options: [
          { content: localeText.chartConfigurationOptionMiddle, value: 'middle' },
          { content: localeText.chartConfigurationOptionTick, value: 'tick' },
        ],
      },
    }
  : {}),
```

**Issue:** Two separate conditional spreads both check the same `tickOptions` boolean. Each false branch spreads an empty object `{}`, which is unnecessary runtime work and extra syntax in the bundle. Also, two spreads that depend on the same condition can be merged into one.

**Suggested Fix:**
```typescript
...(tickOptions
  ? {
      tickPlacement: {
        label: localeText.chartConfigurationTickPlacement,
        type: 'select',
        default: 'extremities',
        options: [
          { content: localeText.chartConfigurationOptionEnd, value: 'end' },
          { content: localeText.chartConfigurationOptionExtremities, value: 'extremities' },
          { content: localeText.chartConfigurationOptionMiddle, value: 'middle' },
          { content: localeText.chartConfigurationOptionStart, value: 'start' },
        ],
      },
      tickLabelPlacement: {
        label: localeText.chartConfigurationTickLabelPlacement,
        type: 'select',
        default: 'middle',
        options: [
          { content: localeText.chartConfigurationOptionMiddle, value: 'middle' },
          { content: localeText.chartConfigurationOptionTick, value: 'tick' },
        ],
      },
    }
  : {}),
```

**Estimated Gzip Savings:** ~40-50 bytes (removes one full conditional spread expression)

---

## Finding 2: Duplicate Legend Position Options Arrays

**File:** `packages/x-charts-premium/src/ChartsRenderer/configuration.tsx`
**Lines:** 162-202 (inside `getLegendSection`)

**Current Code:**
```typescript
// PositionHorizontal options (lines 163-171):
options: [
  { content: localeText.chartConfigurationOptionNone, value: 'none' },
  { content: localeText.chartConfigurationOptionTopLeft, value: 'topLeft' },
  { content: localeText.chartConfigurationOptionTop, value: 'top' },
  { content: localeText.chartConfigurationOptionTopRight, value: 'topRight' },
  { content: localeText.chartConfigurationOptionBottomLeft, value: 'bottomLeft' },
  { content: localeText.chartConfigurationOptionBottom, value: 'bottom' },
  { content: localeText.chartConfigurationOptionBottomRight, value: 'bottomRight' },
],

// PositionVertical options (lines 180-187):
options: [
  { content: localeText.chartConfigurationOptionNone, value: 'none' },
  { content: localeText.chartConfigurationOptionTopLeft, value: 'topLeft' },
  { content: localeText.chartConfigurationOptionLeft, value: 'left' },
  { content: localeText.chartConfigurationOptionBottomLeft, value: 'bottomLeft' },
  { content: localeText.chartConfigurationOptionTopRight, value: 'topRight' },
  { content: localeText.chartConfigurationOptionRight, value: 'right' },
  { content: localeText.chartConfigurationOptionBottomRight, value: 'bottomRight' },
],
```

**Issue:** Both arrays share 5 of 7 entries (`none`, `topLeft`, `topRight`, `bottomLeft`, `bottomRight`). The `{ content: ..., value: ... }` object literal pattern is repeated 14 times with very similar keys. The `localeText.chartConfigurationOption` prefix is repeated in every single entry.

**Suggested Fix:** Extract a helper to build options from a list of position keys:
```typescript
const positionOption = (localeText: ChartsLocaleText, key: string) => ({
  content: localeText[`chartConfigurationOption${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof ChartsLocaleText],
  value: key,
});

// Then in getLegendSection:
const horizontalPositions = ['none', 'topLeft', 'top', 'topRight', 'bottomLeft', 'bottom', 'bottomRight'];
const verticalPositions = ['none', 'topLeft', 'left', 'bottomLeft', 'topRight', 'right', 'bottomRight'];
```

**Estimated Gzip Savings:** ~80-120 bytes

---

## Finding 3: Duplicate Tooltip Placement Options

**File:** `packages/x-charts-premium/src/ChartsRenderer/configuration.tsx`
**Lines:** 130-136 (in `getTooltipSection`) and 457-463 (in the inline pie tooltip config)

**Current Code (getTooltipSection, line 130):**
```typescript
tooltipPlacement: {
  label: localeText.chartConfigurationTooltipPlacement,
  type: 'select',
  default: 'auto',
  options: [
    { content: localeText.chartConfigurationOptionAuto, value: 'auto' },
    { content: localeText.chartConfigurationOptionTop, value: 'top' },
    { content: localeText.chartConfigurationOptionBottom, value: 'bottom' },
    { content: localeText.chartConfigurationOptionLeft, value: 'left' },
    { content: localeText.chartConfigurationOptionRight, value: 'right' },
  ],
},
```

**Current Code (inline pie config, line 454):**
```typescript
tooltipPlacement: {
  label: localeText.chartConfigurationTooltipPlacement,
  type: 'select',
  default: 'auto',
  options: [
    { content: localeText.chartConfigurationOptionAuto, value: 'auto' },
    { content: localeText.chartConfigurationOptionTop, value: 'top' },
    { content: localeText.chartConfigurationOptionBottom, value: 'bottom' },
    { content: localeText.chartConfigurationOptionLeft, value: 'left' },
    { content: localeText.chartConfigurationOptionRight, value: 'right' },
  ],
},
```

**Issue:** The tooltip placement control config is defined identically in two places: once in `getTooltipSection` and once inline in the pie chart customization section.

**Suggested Fix:** Extract the tooltip placement control into a reusable function:
```typescript
const getTooltipPlacementControl = (localeText: ChartsLocaleText) => ({
  label: localeText.chartConfigurationTooltipPlacement,
  type: 'select',
  default: 'auto',
  options: [
    { content: localeText.chartConfigurationOptionAuto, value: 'auto' },
    { content: localeText.chartConfigurationOptionTop, value: 'top' },
    { content: localeText.chartConfigurationOptionBottom, value: 'bottom' },
    { content: localeText.chartConfigurationOptionLeft, value: 'left' },
    { content: localeText.chartConfigurationOptionRight, value: 'right' },
  ],
});
```

**Estimated Gzip Savings:** ~40-60 bytes

---

## Finding 4: Duplicate Grid Check Pattern in ChartsRenderer

**File:** `packages/x-charts-premium/src/ChartsRenderer/ChartsRenderer.tsx`
**Lines:** 176-179 (bar/column branch) and 238-241 (line/area branch)

**Current Code (bar/column, line 176):**
```typescript
grid: {
  vertical: chartConfiguration.grid === 'vertical' || chartConfiguration.grid === 'both',
  horizontal: chartConfiguration.grid === 'horizontal' || chartConfiguration.grid === 'both',
},
```

**Current Code (line/area, line 238):**
```typescript
grid: {
  vertical: chartConfiguration.grid === 'vertical' || chartConfiguration.grid === 'both',
  horizontal: chartConfiguration.grid === 'horizontal' || chartConfiguration.grid === 'both',
},
```

**Issue:** The exact same grid transformation logic is duplicated across chart type branches.

**Suggested Fix:** Extract to a helper:
```typescript
const getGridProp = (grid: string) => ({
  vertical: grid === 'vertical' || grid === 'both',
  horizontal: grid === 'horizontal' || grid === 'both',
});
// Usage:
grid: getGridProp(chartConfiguration.grid),
```

**Estimated Gzip Savings:** ~30-45 bytes

---

## Finding 5: Duplicate Legend Position Calculation in ChartsRenderer

**File:** `packages/x-charts-premium/src/ChartsRenderer/ChartsRenderer.tsx`
**Lines:** 163-167 (bar/column), 224-228 (line/area), 296-299 (pie)

**Current Code (bar/column, line 163):**
```typescript
const legendPosition = getLegendPosition(
  chartConfiguration.legendDirection === 'vertical'
    ? chartConfiguration.legendPositionVertical
    : chartConfiguration.legendPositionHorizontal,
);
```

**Current Code (line/area, line 224):**
```typescript
const legendPosition = getLegendPosition(
  chartConfiguration.legendDirection === 'vertical'
    ? chartConfiguration.legendPositionVertical
    : chartConfiguration.legendPositionHorizontal,
);
```

**Current Code (pie, line 296):**
```typescript
const legendPosition = getLegendPosition(
  chartConfiguration.pieLegendDirection === 'vertical'
    ? chartConfiguration.pieLegendPositionVertical
    : chartConfiguration.pieLegendPositionHorizontal,
);
```

**Issue:** The bar/column and line/area branches have identical `legendPosition` derivation. The pie version is nearly identical but uses different prefixes.

**Suggested Fix:** Extract a helper:
```typescript
const resolveLegendPosition = (config: Record<string, any>, prefix = 'legend') =>
  getLegendPosition(
    config[`${prefix}Direction`] === 'vertical'
      ? config[`${prefix}PositionVertical`]
      : config[`${prefix}PositionHorizontal`],
  );
```

**Estimated Gzip Savings:** ~40-60 bytes

---

## Finding 6: Duplicate SlotProps Structure in ChartsRenderer

**File:** `packages/x-charts-premium/src/ChartsRenderer/ChartsRenderer.tsx`
**Lines:** 183-192 (bar/column), 242-251 (line/area)

**Current Code (bar/column, line 183):**
```typescript
slotProps: {
  tooltip: {
    trigger: chartConfiguration.tooltipTrigger,
    placement: chartConfiguration.tooltipPlacement,
  },
  legend: {
    direction: chartConfiguration.legendDirection,
    position: legendPosition,
  },
},
```

**Current Code (line/area, line 242):**
```typescript
slotProps: {
  tooltip: {
    trigger: chartConfiguration.tooltipTrigger,
    placement: chartConfiguration.tooltipPlacement,
  },
  legend: {
    direction: chartConfiguration.legendDirection,
    position: legendPosition,
  },
},
```

**Issue:** These two slotProps blocks are character-for-character identical.

**Suggested Fix:** Extract common slotProps building before the `if` branches:
```typescript
const tooltipSlotProps = {
  trigger: chartConfiguration.tooltipTrigger,
  placement: chartConfiguration.tooltipPlacement,
};
const legendSlotProps = (dir: string, pos: ReturnType<typeof getLegendPosition>) => ({
  direction: dir,
  position: pos,
});
```

**Estimated Gzip Savings:** ~35-50 bytes

---

## Finding 7: Palette Key Strings Duplicated Across Files

**File 1:** `packages/x-charts-premium/src/ChartsRenderer/colors.ts`
**Lines:** 18-32

**File 2:** `packages/x-charts-premium/src/ChartsRenderer/configuration.tsx`
**Lines:** 205-219

**Current Code (colors.ts):**
```typescript
export const colorPaletteLookup: Map<string, ChartsColorPaletteCallback> = new Map([
  ['blueberryTwilightPalette', blueberryTwilightPalette],
  ['mangoFusionPalette', mangoFusionPalette],
  ['cheerfulFiestaPalette', cheerfulFiestaPalette],
  ['strawberrySkyPalette', strawberrySkyPalette],
  ['rainbowSurgePalette', rainbowSurgePalette],
  ['bluePalette', bluePalette],
  ['greenPalette', greenPalette],
  ['purplePalette', purplePalette],
  ['redPalette', redPalette],
  ['orangePalette', orangePalette],
  ['yellowPalette', yellowPalette],
  ['cyanPalette', cyanPalette],
  ['pinkPalette', pinkPalette],
]);
```

**Current Code (configuration.tsx):**
```typescript
const getColors = (localeText: ChartsLocaleText) => [
  { key: 'rainbowSurgePalette', name: localeText.chartPaletteNameRainbowSurge },
  { key: 'blueberryTwilightPalette', name: localeText.chartPaletteNameBlueberryTwilight },
  { key: 'mangoFusionPalette', name: localeText.chartPaletteNameMangoFusion },
  { key: 'cheerfulFiestaPalette', name: localeText.chartPaletteNameCheerfulFiesta },
  { key: 'strawberrySkyPalette', name: localeText.chartPaletteNameStrawberrySky },
  { key: 'bluePalette', name: localeText.chartPaletteNameBlue },
  { key: 'greenPalette', name: localeText.chartPaletteNameGreen },
  { key: 'purplePalette', name: localeText.chartPaletteNamePurple },
  { key: 'redPalette', name: localeText.chartPaletteNameRed },
  { key: 'orangePalette', name: localeText.chartPaletteNameOrange },
  { key: 'yellowPalette', name: localeText.chartPaletteNameYellow },
  { key: 'cyanPalette', name: localeText.chartPaletteNameCyan },
  { key: 'pinkPalette', name: localeText.chartPaletteNamePink },
];
```

**Issue:** All 13 palette key strings (`'blueberryTwilightPalette'`, `'mangoFusionPalette'`, etc.) appear as string literals in both files. While gzip can deduplicate within a single file, cross-file duplication cannot be deduplicated as effectively by gzip.

**Suggested Fix:** Define a shared constant array of palette keys in `colors.ts` and import it in `configuration.tsx`:
```typescript
// colors.ts
export const PALETTE_KEYS = [
  'rainbowSurgePalette',
  'blueberryTwilightPalette',
  'mangoFusionPalette',
  'cheerfulFiestaPalette',
  'strawberrySkyPalette',
  'bluePalette',
  'greenPalette',
  'purplePalette',
  'redPalette',
  'orangePalette',
  'yellowPalette',
  'cyanPalette',
  'pinkPalette',
] as const;

const palettes = [
  blueberryTwilightPalette, mangoFusionPalette, cheerfulFiestaPalette,
  strawberrySkyPalette, rainbowSurgePalette, bluePalette, greenPalette,
  purplePalette, redPalette, orangePalette, yellowPalette, cyanPalette, pinkPalette,
];

export const colorPaletteLookup = new Map(
  PALETTE_KEYS.map((key, i) => [key, palettes[i]])
);
```

**Estimated Gzip Savings:** ~50-80 bytes

---

## Finding 8: Redundant Re-export Barrel Files

**Files (all are pure re-exports with no added value):**
- `packages/x-charts-premium/src/BarChart/index.ts` -> `@mui/x-charts/BarChart`
- `packages/x-charts-premium/src/BarChartPro/index.ts` -> `@mui/x-charts-pro/BarChartPro`
- `packages/x-charts-premium/src/ChartContainer/index.ts` -> `@mui/x-charts/ChartContainer`
- `packages/x-charts-premium/src/ChartContainerPro/index.ts` -> `@mui/x-charts-pro/ChartContainerPro`
- `packages/x-charts-premium/src/ChartDataProvider/index.ts` -> `@mui/x-charts/ChartDataProvider`
- `packages/x-charts-premium/src/ChartDataProviderPro/index.ts` -> `@mui/x-charts-pro/ChartDataProviderPro`
- `packages/x-charts-premium/src/ChartsAxis/index.ts` -> `@mui/x-charts/ChartsAxis`
- `packages/x-charts-premium/src/ChartsAxisHighlight/index.ts` -> `@mui/x-charts/ChartsAxisHighlight`
- `packages/x-charts-premium/src/ChartsClipPath/index.ts` -> `@mui/x-charts/ChartsClipPath`
- `packages/x-charts-premium/src/ChartZoomSlider/index.ts` -> `@mui/x-charts-pro/ChartZoomSlider`
- `packages/x-charts-premium/src/ChartsGrid/index.ts` -> `@mui/x-charts/ChartsGrid`
- `packages/x-charts-premium/src/ChartsLabel/index.ts` -> `@mui/x-charts/ChartsLabel`
- `packages/x-charts-premium/src/ChartsLegend/index.ts` -> `@mui/x-charts/ChartsLegend`
- `packages/x-charts-premium/src/ChartsLocalizationProvider/index.ts` -> `@mui/x-charts/ChartsLocalizationProvider`
- `packages/x-charts-premium/src/ChartsOverlay/index.ts` -> `@mui/x-charts/ChartsOverlay`
- `packages/x-charts-premium/src/ChartsReferenceLine/index.ts` -> `@mui/x-charts/ChartsReferenceLine`
- `packages/x-charts-premium/src/ChartsSurface/index.ts` -> `@mui/x-charts/ChartsSurface`
- `packages/x-charts-premium/src/ChartsText/index.ts` -> `@mui/x-charts/ChartsText`
- `packages/x-charts-premium/src/ChartsToolbarPro/index.ts` -> `@mui/x-charts-pro/ChartsToolbarPro`
- `packages/x-charts-premium/src/ChartsTooltip/index.ts` -> `@mui/x-charts/ChartsTooltip`
- `packages/x-charts-premium/src/ChartsWrapper/index.ts` -> `@mui/x-charts/ChartsWrapper`
- `packages/x-charts-premium/src/ChartsXAxis/index.ts` -> `@mui/x-charts/ChartsXAxis`
- `packages/x-charts-premium/src/ChartsYAxis/index.ts` -> `@mui/x-charts/ChartsYAxis`
- `packages/x-charts-premium/src/FunnelChart/index.ts` -> `@mui/x-charts-pro/FunnelChart`
- `packages/x-charts-premium/src/Gauge/index.ts` -> `@mui/x-charts/Gauge`
- `packages/x-charts-premium/src/Heatmap/index.ts` -> `@mui/x-charts-pro/Heatmap`
- `packages/x-charts-premium/src/LineChart/index.ts` -> `@mui/x-charts/LineChart`
- `packages/x-charts-premium/src/LineChartPro/index.ts` -> `@mui/x-charts-pro/LineChartPro`
- `packages/x-charts-premium/src/PieChart/index.ts` -> `@mui/x-charts/PieChart`
- `packages/x-charts-premium/src/PieChartPro/index.ts` -> `@mui/x-charts-pro/PieChartPro`
- `packages/x-charts-premium/src/RadarChart/index.ts` -> `@mui/x-charts/RadarChart`
- `packages/x-charts-premium/src/RadarChartPro/index.ts` -> `@mui/x-charts-pro/RadarChartPro`
- `packages/x-charts-premium/src/SankeyChart/index.ts` -> `@mui/x-charts-pro/SankeyChart`
- `packages/x-charts-premium/src/ScatterChart/index.ts` -> `@mui/x-charts/ScatterChart`
- `packages/x-charts-premium/src/ScatterChartPro/index.ts` -> `@mui/x-charts-pro/ScatterChartPro`
- `packages/x-charts-premium/src/SparkLineChart/index.ts` -> `@mui/x-charts/SparkLineChart`
- `packages/x-charts-premium/src/Toolbar/index.ts` -> `@mui/x-charts/Toolbar`
- `packages/x-charts-premium/src/plugins/index.ts` -> `@mui/x-charts-pro/plugins`
- `packages/x-charts-premium/src/ChartsBrushOverlay/index.ts` -> `@mui/x-charts/ChartsBrushOverlay`
- `packages/x-charts-premium/src/ChartsContainerPro/index.ts` -> `@mui/x-charts-pro/ChartsContainerPro`
- `packages/x-charts-premium/src/ChartsContainer/index.ts` -> (unknown, re-export)
- `packages/x-charts-premium/src/utils/index.ts` -> `@mui/x-charts/utils`
- `packages/x-charts-premium/src/colorPalettes/index.ts` -> `@mui/x-charts/colorPalettes`
- `packages/x-charts-premium/src/constants/index.ts` -> `@mui/x-charts/constants`
- `packages/x-charts-premium/src/locales/index.ts` -> `@mui/x-charts/locales`

**Pattern:**
```typescript
// Re-export automatically generated, to customize, simply remove this line.
export * from '@mui/x-charts/SomeComponent';
```

**Issue:** Each file is a separate module that the bundler must resolve at build time. These add module resolution overhead and each file contributes its own module wrapper in the output bundle. Many of these same exports are also duplicated in the main `index.ts` file.

**Note:** These are auto-generated barrel files typical of the MUI X package architecture pattern, so they likely serve a deep-import purpose (`@mui/x-charts-premium/BarChart`). Removing them would break that API. However, if deep imports are not used by consumers, consolidating would save bytes.

**Suggested Fix:** If the deep-import paths are not a public API requirement, these directories could be removed and the re-exports consolidated only in `index.ts`. This is an architectural decision.

**Estimated Gzip Savings:** ~200-300 bytes (if consolidatable)

---

## Finding 9: Duplicate `index.ts` Re-exports Also Appear in Main `index.ts`

**File:** `packages/x-charts-premium/src/index.ts`
**Lines:** 4-25

**Current Code:**
```typescript
export * from '@mui/x-charts/ChartsClipPath';
export * from '@mui/x-charts/ChartsReferenceLine';
export * from '@mui/x-charts/ChartsAxis';
export * from '@mui/x-charts/ChartsXAxis';
export * from '@mui/x-charts/ChartsYAxis';
export * from '@mui/x-charts/ChartsGrid';
export * from '@mui/x-charts/ChartsText';
export * from '@mui/x-charts/ChartsTooltip';
export * from '@mui/x-charts/ChartsLegend';
export * from '@mui/x-charts/ChartsLocalizationProvider';
export * from '@mui/x-charts/ChartsAxisHighlight';
export * from '@mui/x-charts/BarChart';
export * from '@mui/x-charts/LineChart';
export * from '@mui/x-charts/PieChart';
export * from '@mui/x-charts/ScatterChart';
export * from '@mui/x-charts/SparkLineChart';
export * from '@mui/x-charts/Gauge';
export * from '@mui/x-charts/RadarChart';
export * from '@mui/x-charts/ChartsSurface';
export * from '@mui/x-charts/ChartDataProvider';
export * from '@mui/x-charts/ChartsLabel';
```

**Issue:** The main `index.ts` re-exports directly from `@mui/x-charts/*`, while each individual barrel file (e.g., `BarChart/index.ts`) also re-exports from the same path. This means there are two entry points to the same re-export, doubling the module resolution overhead for consumers who import from both the root and deep paths.

**Suggested Fix:** Have the main `index.ts` re-export from the local barrel files instead:
```typescript
export * from './ChartsClipPath';
export * from './ChartsReferenceLine';
// etc.
```
This way each re-export is resolved only once, and the barrel files serve as the single source of truth.

**Estimated Gzip Savings:** ~10-20 bytes (marginal, but improves consistency)

---

## Finding 10: Verbose `getLegendPosition` Function

**File:** `packages/x-charts-premium/src/ChartsRenderer/ChartsRenderer.tsx`
**Lines:** 9-34

**Current Code:**
```typescript
const getLegendPosition = (position: string) => {
  let horizontal: 'start' | 'center' | 'end' | undefined = 'center';
  let vertical: 'top' | 'middle' | 'bottom' | undefined = 'middle';

  if (position === 'none') {
    return undefined;
  }

  if (position === 'top' || position === 'topLeft' || position === 'topRight') {
    vertical = 'top';
  }

  if (position === 'bottom' || position === 'bottomLeft' || position === 'bottomRight') {
    vertical = 'bottom';
  }

  if (position === 'left' || position === 'topLeft' || position === 'bottomLeft') {
    horizontal = 'start';
  }

  if (position === 'right' || position === 'topRight' || position === 'bottomRight') {
    horizontal = 'end';
  }

  return { horizontal, vertical };
};
```

**Issue:** The function uses multiple independent `if` statements with repeated string comparisons. The strings `'topLeft'`, `'topRight'`, `'bottomLeft'`, `'bottomRight'` each appear in two different `if` blocks. This is verbose.

**Suggested Fix:** Use `includes`/`startsWith`/`endsWith` or a lookup map:
```typescript
const getLegendPosition = (position: string) => {
  if (position === 'none') return undefined;
  return {
    horizontal: position.includes('Left') ? 'start' : position.includes('Right') ? 'end' : 'center',
    vertical: position.startsWith('top') ? 'top' : position.startsWith('bottom') ? 'bottom' : 'middle',
  } as const;
};
```

Or a map approach:
```typescript
const LEGEND_MAP: Record<string, { horizontal: string; vertical: string } | undefined> = {
  none: undefined,
  top: { horizontal: 'center', vertical: 'top' },
  topLeft: { horizontal: 'start', vertical: 'top' },
  // etc.
};
const getLegendPosition = (position: string) => LEGEND_MAP[position];
```

**Estimated Gzip Savings:** ~30-50 bytes (the `includes`/`startsWith` approach compresses much better)

---

## Finding 11: Redundant `React.useMemo` with Non-Stable Dependencies

**File:** `packages/x-charts-premium/src/ChartsRenderer/ChartsRenderer.tsx`
**Lines:** 110-115

**Current Code:**
```typescript
const chartConfiguration = React.useMemo(() => {
  return {
    ...defaultOptions,
    ...configuration,
  };
}, [defaultOptions, configuration]);
```

**Issue:** `defaultOptions` is computed on every render (lines 103-107), meaning it will always be a new reference, making the `useMemo` dependency always trigger. The `useMemo` provides no caching benefit here.

```typescript
// defaultOptions is created fresh every render:
const defaultOptions = Object.fromEntries(
  sections.flatMap((section) =>
    Object.entries(section.controls).map(([key, value]) => [key, value.default]),
  ),
);
```

**Suggested Fix:** Either memoize `defaultOptions` as well, or remove the `useMemo` wrapper:
```typescript
// Option A: Remove useMemo since it's not effective
const chartConfiguration = {
  ...defaultOptions,
  ...configuration,
};

// Option B: Memoize both properly
const defaultOptions = React.useMemo(() =>
  Object.fromEntries(
    sections.flatMap((section) =>
      Object.entries(section.controls).map(([key, value]) => [key, value.default]),
    ),
  ),
  [sections]
);
const chartConfiguration = React.useMemo(() => ({
  ...defaultOptions,
  ...configuration,
}), [defaultOptions, configuration]);
```

**Estimated Gzip Savings:** ~15-25 bytes (Option A removes `useMemo` + deps array)

---

## Finding 12: Unnecessary `as const` Type Assertion

**File:** `packages/x-charts-premium/src/ChartsRenderer/configuration.tsx`
**Line:** 223

**Current Code:**
```typescript
type: 'select' as const,
```

**Issue:** The `as const` assertion narrows `'select'` to its literal type. However, in this context the value is already a string literal, and the consuming interface likely accepts `string`, making the assertion unnecessary at runtime (it only affects type-checking). Since TypeScript is stripped at build time, the `as const` is erased, but it does add source bytes that may marginally affect source maps.

**Suggested Fix:**
```typescript
type: 'select',
```

**Estimated Gzip Savings:** ~8-10 bytes

---

## Finding 13: Verbose Spread-and-Destructure in `useBarChartPremiumProps`

**File:** `packages/x-charts-premium/src/BarChartPremium/BarChartPremium.tsx`
**Lines:** 93, 110-122

**Current Code:**
```typescript
const { initialZoom, zoomData, onZoomChange, apiRef, showToolbar, ...other } = props;

// Then later:
const { chartDataProviderProProps, chartsSurfaceProps } = useChartContainerProProps<
  'bar' | 'rangeBar',
  BarChartPremiumPluginSignatures
>(
  {
    ...chartContainerProps,
    initialZoom,
    zoomData,
    onZoomChange,
    apiRef,
    plugins: BAR_CHART_PREMIUM_PLUGINS,
  },
  ref,
);
```

**Issue:** `initialZoom`, `zoomData`, `onZoomChange`, `apiRef` are destructured from `props` (line 93) and then spread back into a new object (lines 114-119). This round-trip destructure+recompose is verbose.

**Suggested Fix:** Use `pick` or pass the props object directly:
```typescript
const { showToolbar, ...other } = props;
// ...
const { chartDataProviderProProps, chartsSurfaceProps } = useChartContainerProProps<
  'bar' | 'rangeBar',
  BarChartPremiumPluginSignatures
>(
  {
    ...chartContainerProps,
    initialZoom: props.initialZoom,
    zoomData: props.zoomData,
    onZoomChange: props.onZoomChange,
    apiRef: props.apiRef,
    plugins: BAR_CHART_PREMIUM_PLUGINS,
  },
  ref,
);
```

Or even better, avoid destructuring those props at all since they are only used once:
```typescript
const { showToolbar, initialZoom, zoomData, onZoomChange, apiRef, ...other } = props;
```
This is what already exists -- the issue is marginal here.

**Estimated Gzip Savings:** ~5-10 bytes (marginal)

---

## Finding 14: Empty Interface Declarations

**File:** `packages/x-charts-premium/src/BarChartPremium/BarChartPremium.tsx`
**Lines:** 42-44

**Current Code:**
```typescript
export interface BarChartPremiumSlots extends BarChartProSlots {}
export interface BarChartPremiumSlotProps extends BarChartProSlotProps {}
```

**File:** `packages/x-charts-premium/src/HeatmapPremium/HeatmapPremium.tsx`
**Lines:** 25-26

**Current Code:**
```typescript
export interface HeatmapPremiumSlots extends HeatmapSlots {}
export interface HeatmapPremiumSlotProps extends HeatmapSlotProps {}
```

**Issue:** These empty interfaces add no members and purely alias the parent types. While they are stripped at compile time (zero runtime cost), they add source bytes and complexity. However, they do serve a purpose of allowing future extension and providing clear naming.

**Suggested Fix:** Replace with type aliases:
```typescript
export type BarChartPremiumSlots = BarChartProSlots;
export type BarChartPremiumSlotProps = BarChartProSlotProps;
```

**Estimated Gzip Savings:** ~0 bytes (TypeScript types are stripped; this is a source clarity improvement only)

---

## Finding 15: Massive Auto-Generated PropTypes Block

**File:** `packages/x-charts-premium/src/BarChartPremium/BarChartPremium.tsx`
**Lines:** 155-2186 (over 2000 lines of PropTypes)

**Issue:** The PropTypes block for `BarChartPremium` spans over 2000 lines. This is auto-generated and includes extremely detailed shapes for `xAxis` and `yAxis` that enumerate every possible scale type variant (band, point, log, symlog, pow, sqrt, time, utc, linear -- 8-9 variants for each axis). Each variant repeats nearly identical property sets (e.g., `classes`, `colorMap`, `data`, `dataKey`, `disableLine`, `disableTicks`, `domainLimit`, `hideTooltip`, `id`, `ignoreTooltip`, `label`, `labelStyle`, etc.).

The `xAxis` PropTypes definition alone spans lines 459-1270 (over 800 lines). The `yAxis` PropTypes spans lines 1277-2079 (another 800 lines). Each axis variant repeats approximately 30-40 identical property declarations.

**Suggested Fix:** This is auto-generated by `pnpm proptypes`, so the fix would need to be in the PropTypes generation tool itself. Options:
1. Strip PropTypes in production builds using `babel-plugin-transform-react-remove-prop-types`
2. Modify the proptypes generator to share common axis shape definitions

If PropTypes are already stripped in production builds (which is common for MUI packages), this is a development-only concern and does not affect the shipped bundle.

**Estimated Gzip Savings:** ~800-1500 bytes if PropTypes are NOT stripped in production (gzip compresses repetitive patterns well, but 2000 lines still contributes significantly)

---

## Finding 16: `(locale ?? {})` Verbose Nullish Coalescing

**File:** `packages/x-charts-premium/src/ChartsRenderer/configuration.tsx`
**Line:** 347

**Current Code:**
```typescript
const localeText: ChartsLocaleText = {
  ...DEFAULT_LOCALE,
  ...(locale ?? {}),
};
```

**Issue:** Spreading `undefined` with `...undefined` is valid JavaScript (it has no effect), so the `?? {}` fallback is unnecessary.

**Suggested Fix:**
```typescript
const localeText: ChartsLocaleText = {
  ...DEFAULT_LOCALE,
  ...locale,
};
```

**Estimated Gzip Savings:** ~6-8 bytes

---

## Finding 17: `[...dimensions.map(...)].reverse()` Creates Unnecessary Intermediate Array

**File:** `packages/x-charts-premium/src/ChartsRenderer/ChartsRenderer.tsx`
**Line:** 71

**Current Code:**
```typescript
const dimensionLabel = [...dimensions.map((dimension) => dimension.label)].reverse().join(' - ');
```

**Issue:** The spread into a new array `[...arr]` before `.reverse()` is done to avoid mutating the `.map()` result. But `.map()` already returns a new array, so `.reverse()` can be called directly on it without the extra spread.

**Suggested Fix:**
```typescript
const dimensionLabel = dimensions.map((dimension) => dimension.label).reverse().join(' - ');
```

**Estimated Gzip Savings:** ~5-8 bytes

---

## Finding 18: Duplicate `dataIndex === undefined` Guard Pattern

**File:** `packages/x-charts-premium/src/BarChartPremium/RangeBar/seriesConfig/getColor.ts`
**Lines:** 11-14 and 27-29

**Current Code:**
```typescript
// First callback (line 11):
return (dataIndex?: number) => {
  if (dataIndex === undefined) {
    return series.color;
  }
  // ...
};

// Second callback (line 27):
return (dataIndex?: number) => {
  if (dataIndex === undefined) {
    return series.color;
  }
  // ...
};
```

**Issue:** Both returned closures start with the same `dataIndex === undefined` guard returning `series.color`. This pattern is repeated.

**Suggested Fix:** Abstract the guard into the outer scope or use a wrapper:
```typescript
const withFallback = (fn: (dataIndex: number) => string) =>
  (dataIndex?: number) => dataIndex === undefined ? series.color : fn(dataIndex);
```

**Estimated Gzip Savings:** ~15-20 bytes

---

## Finding 19: Repeated `chartConfiguration.` Prefix

**File:** `packages/x-charts-premium/src/ChartsRenderer/ChartsRenderer.tsx`
**Lines:** 117-195, 198-254, 257-327

**Issue:** The string `chartConfiguration.` appears approximately 50+ times across the three chart-type branches. While gzip handles this reasonably well with back-references, destructuring the commonly used properties would reduce the source size.

**Suggested Fix:** Destructure frequently accessed properties:
```typescript
const {
  height, colors, skipAnimation, showToolbar, grid,
  tooltipTrigger, tooltipPlacement, legendDirection,
  legendPositionVertical, legendPositionHorizontal,
} = chartConfiguration;
```

**Estimated Gzip Savings:** ~20-40 bytes (gzip already handles repeated strings, but shorter identifiers help)

---

## Finding 20: `'value' as const` Repeated in ChartsRenderer

**File:** `packages/x-charts-premium/src/ChartsRenderer/ChartsRenderer.tsx`
**Lines:** 162, 276

**Current Code:**
```typescript
// Line 162 (bar/column):
const barLabel = chartConfiguration.itemLabel === 'value' ? ('value' as const) : undefined;

// Line 276 (pie):
arcLabel: chartConfiguration.itemLabel === 'value' ? ('value' as const) : undefined,
```

**Issue:** The `'value' as const` assertion is redundant. The string `'value'` is already a literal type. The ternary checks `=== 'value'` and then returns `'value'` -- TypeScript already narrows this correctly.

**Suggested Fix:**
```typescript
const barLabel = chartConfiguration.itemLabel === 'value' ? 'value' : undefined;
```

**Estimated Gzip Savings:** ~10-14 bytes (two occurrences)

---

## Summary Table

| # | Finding | File(s) | Type | Est. Savings (gzip) |
|---|---------|---------|------|---------------------|
| 1 | Merge duplicate conditional spreads | configuration.tsx | Verbose Pattern | 40-50 bytes |
| 2 | Duplicate legend position option arrays | configuration.tsx | Duplicate Code | 80-120 bytes |
| 3 | Duplicate tooltip placement config | configuration.tsx | Duplicate Code | 40-60 bytes |
| 4 | Duplicate grid check pattern | ChartsRenderer.tsx | Duplicate Code | 30-45 bytes |
| 5 | Duplicate legend position calculation | ChartsRenderer.tsx | Duplicate Code | 40-60 bytes |
| 6 | Duplicate slotProps structure | ChartsRenderer.tsx | Duplicate Code | 35-50 bytes |
| 7 | Palette key strings duplicated across files | colors.ts, configuration.tsx | String Repetition | 50-80 bytes |
| 8 | Redundant re-export barrel files | ~40 files | Module Structure | 200-300 bytes |
| 9 | Main index.ts duplicates barrel re-exports | index.ts | Duplicate Re-exports | 10-20 bytes |
| 10 | Verbose `getLegendPosition` function | ChartsRenderer.tsx | Verbose Pattern | 30-50 bytes |
| 11 | Ineffective `useMemo` with unstable dep | ChartsRenderer.tsx | Unnecessary Code | 15-25 bytes |
| 12 | Unnecessary `as const` assertion | configuration.tsx | TypeScript Verbosity | 8-10 bytes |
| 13 | Verbose spread-and-destructure | BarChartPremium.tsx | Verbose Pattern | 5-10 bytes |
| 14 | Empty interface declarations | BarChartPremium.tsx, HeatmapPremium.tsx | TypeScript Verbosity | 0 bytes (types stripped) |
| 15 | Massive auto-generated PropTypes | BarChartPremium.tsx | Generated Code | 800-1500 bytes* |
| 16 | Unnecessary `?? {}` before spread | configuration.tsx | Verbose Pattern | 6-8 bytes |
| 17 | Unnecessary array spread before reverse | ChartsRenderer.tsx | Verbose Pattern | 5-8 bytes |
| 18 | Duplicate `dataIndex === undefined` guard | getColor.ts | Duplicate Code | 15-20 bytes |
| 19 | Repeated `chartConfiguration.` prefix | ChartsRenderer.tsx | String Repetition | 20-40 bytes |
| 20 | Redundant `'value' as const` | ChartsRenderer.tsx | TypeScript Verbosity | 10-14 bytes |

**Total Estimated Savings: ~540-970 bytes (gzip)** excluding PropTypes (Finding 15)

**Total with PropTypes: ~1340-2470 bytes (gzip)** if PropTypes are included in production bundle

*Finding 15 savings depend on whether `babel-plugin-transform-react-remove-prop-types` is used in production builds.
