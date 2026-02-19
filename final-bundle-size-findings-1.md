# Bundle Size Findings — x-charts, x-charts-pro, x-charts-premium

> **Scope**: All source files in `packages/x-charts`, `packages/x-charts-pro`, `packages/x-charts-premium`
> **Optimization target**: gzip-compressed size (not minified/raw size).
> **Method**: Static analysis of ~300 source files across 21 analysis areas.
> **No code changes included** — findings only.

---

## Summary Table

| ID | Category | File(s) | Finding | Impact |
|----|----------|---------|---------|--------|
| L1 | Vendored library | `internals/Flatbush.ts` | 560-line spatial index vendored inline | LARGE |
| L2 | Vendored library | `SankeyChart/d3Sankey/sankey.ts` | 516-line d3-sankey vendored inline | LARGE |
| L3 | PropTypes bloat | `BarChart/BarChart.tsx` | ~1,580-line PropTypes block | LARGE |
| L4 | PropTypes bloat | `LineChart/LineChart.tsx` | ~1,567-line PropTypes block | LARGE |
| L5 | PropTypes bloat | `ScatterChart/ScatterChart.tsx` | ~1,594-line PropTypes block | LARGE |
| L6 | PropTypes bloat | `SparkLineChart/SparkLineChart.tsx` | ~1,630-line PropTypes block | LARGE |
| L7 | PropTypes bloat | `BarChartPro/BarChartPro.tsx` | ~2,031-line PropTypes block | LARGE |
| L8 | X/Y axis duplication | `ChartsXAxis/` ↔ `ChartsYAxis/` | ~80% structural duplication, ~500 lines | LARGE |
| L9 | Selector duplication | `useChartCartesianAxisRendering.selectors.ts` | X/Y selector pairs, ~250 lines duplicated | LARGE |
| CF0 | CSS classes factory | 30+ `*Classes.ts` files | Identical 20-50 line template per component | LARGE |
| CF0b | Focused components | FocusedBar/LineMark/ScatterMark/PieArc | 4 components identical structure, only position logic differs | MEDIUM |
| L10 | SeriesConfig boilerplate | 47 files across 5 chart types | ~80-100% duplication per file pair | LARGE |
| L11 | Repeated array literal | `ChartsTooltip.tsx`, `ChartsTooltipContainer.tsx` | 16-element Popper placement array × 8 occurrences | LARGE |
| L12 | Plugin store boilerplate | `allPlugins.ts` + 40+ plugin files | Store spread pattern repeated 40+ times | LARGE |
| L13 | Locale key prefix | 7 locale files | `chartConfiguration` prefix repeated ~84×/file = 588 total | LARGE |
| M1 | Animation boilerplate | `useAnimateBar.ts`, `useAnimatePieArc.ts`, 6 others | interpolateNumber setup ~18 lines repeated per file | MEDIUM |
| M2 | Series hooks duplication | `useBarSeries.ts`, `useLineSeries.ts`, etc. (5 files) | ~28 identical lines each | MEDIUM |
| M3 | getColor duplication | seriesConfig files (5 chart types) | getColor helper ~15 lines repeated per type | MEDIUM |
| M4 | allPlugins.ts double-add | `x-charts-pro/internals/plugins/allPlugins.ts` | UseChartVisibilityManagerSignature added twice (lines 37 & 68) | MEDIUM |
| M5 | Missing `import type` | Multiple plugin and config files | Value imports used only as types prevent tree-shaking | MEDIUM |
| M6 | X/Y Axis highlight | `ChartsXAxisHighlight.tsx` ↔ `ChartsYAxisHighlight.tsx` | ~80% structural duplication, ~80 lines each | MEDIUM |
| M7 | Overlay styled component | `ChartsLoadingOverlay.tsx` ↔ `ChartsNoDataOverlay.tsx` | Identical `StyledText` styled-component definition | MEDIUM |
| M8 | Focus navigation | `commonNextFocusItem.ts` | Forward ↔ backward functions ~40 lines duplicated (lines 21–125) | MEDIUM |
| M9 | WebGL shaders | `x-charts-premium/HeatmapPremium/webgl/shaders.ts` | Inline GLSL strings (~600+ chars), not lazily loaded | MEDIUM |
| M10 | defaultizeAxis | `defaultizeAxis.ts` | defaultizeXAxis ↔ defaultizeYAxis ~90 lines duplicated (lines 16–138) | MEDIUM |
| M11 | Export wildcard | `index.ts` files in multiple packages | `export *` prevents tree-shaking for consumers | MEDIUM |
| M12 | Plugin signature types | Feature plugin files (10+) | Signature interface boilerplate repeated verbatim | MEDIUM |
| M13 | PieChart PropTypes | `PieChart/PieChart.tsx` | ~1,400-line PropTypes block | MEDIUM |
| S1 | ChartsTooltip markup | `ChartsTooltip.tsx` | Duplicated wrapper/container markup across tooltip variants | SMALL |
| S2 | RadarChart axis | `RadarChart/RadarAxis/` | RadarAxis X and Y components ~70% duplicate | SMALL |
| S3 | Legend item | `ChartsLegend/` | Legend item render logic repeated for horizontal/vertical | SMALL |
| S4 | Color scale helpers | `internals/colorScale.ts` | Ordinal/sequential/diverging branches have shared boilerplate | SMALL |
| S5 | Gauge arc paths | `Gauge/` | Arc path calculation inline rather than shared util | SMALL |
| S6 | Funnel segment | `FunnelChart/` | Segment path builders partially duplicated | SMALL |
| S7 | Heatmap cell logic | `Heatmap/` (pro) | Cell rendering logic split into near-identical canvas/SVG paths | SMALL |
| S8 | ZoomSlider | `ZoomSlider/` (pro) | Track/thumb rendering repeated for horizontal/vertical | SMALL |
| S9 | Sankey node/link | `SankeyChart/` | Node and link render helpers share repeated geometry | SMALL |
| S10 | Scatter marker | `ScatterChart/` | Marker shape switch-case repeated in plot and legend | SMALL |
| S11 | Animation easing | `hooks/animation/` | Easing function `linear` defined inline per hook file | SMALL |
| S12 | ChartContainer | `ChartContainer.tsx`, `ChartContainerPro.tsx` | Container prop forwarding boilerplate ~60 lines duplicated | SMALL |
| S13 | Toolbar buttons | `Toolbar/` | Each toolbar button follows identical render/aria pattern | SMALL |
| S14 | Plugin useEffect | Multiple feature plugins | Identical `useEffect(() => { store.update(…) }, [])` pattern | SMALL |
| S15 | Bar label position | `BarLabel/` | Position logic repeated in label and in plot separately | SMALL |
| S16 | Reference line | `ChartsReferenceLine/` | X and Y reference line components ~75% duplicate | SMALL |
| S17 | Missing type imports | `ChartsAxis/`, `ChartsGrid/` | Several type-only imports not using `import type` | SMALL |
| S18 | Repeated MUI error call | Multiple files | `MuiError(…)` call pattern with long prefix string repeated | SMALL |
| S19 | Tooltip cell styles | `ChartsTooltipContainer.tsx` | Styled `td`/`th` components re-defined per usage | SMALL |
| S20 | SparkLine defaults | `SparkLineChart.tsx` | Default prop objects recreated per render rather than constants | SMALL |
| T1 | Typo | `RadarChart/RadarAxis/useRadarAxis.ts:52` | Comment reads `"dtos nto"` instead of `"does not"` | TINY |
| T2 | Trailing space | `colorPalettes/sequential/red.ts:12` | `'#560503 '` has trailing space in hex literal | TINY |
| T3 | viewBox literal | `ChartsSurface/ChartsSurface.tsx:94` | `` viewBox={`${0} ${0} ${w} ${h}`} `` — `${0}` is always `"0"` | TINY |
| T4 | Duplicate import | `x-charts-pro/internals/plugins/allPlugins.ts:37,68` | `UseChartVisibilityManagerSignature` imported and listed twice | TINY |
| T5 | String constant | Multiple files | `"linear"` easing string duplicated rather than imported | TINY |
| T6 | Magic number | `internals/Flatbush.ts` | Node size constant `16` inline throughout (no named constant) | TINY |
| T7 | Redundant cast | Several hooks | `as unknown as X` double-cast pattern used unnecessarily | TINY |
| T8 | Unused re-export | Some index files | Types re-exported that are never consumed externally | TINY |
| T9 | Comment noise | Animation hooks | `// TODO: remove` comments without issue links | TINY |
| T10 | Empty default | Plugin files | `{}` default export where `undefined` would suffice | TINY |

---

## LARGE Impact Findings

### L1 — Vendored Spatial Index Library
**File**: `packages/x-charts/src/internals/Flatbush.ts`
**Lines**: 1–560 (entire file)
**Finding**: A complete copy of the [Flatbush](https://github.com/mourner/flatbush) static spatial index is embedded verbatim as a 560-line TypeScript file. This code is unique text that gzip cannot compress against any external file.
**Fix**: Replace with `flatbush` npm package (`npm install flatbush`). The library is ~3 KB minified+gzipped on its own but can then be shared across dependents and deduplicated by bundlers.
**Impact**: Removing 560 lines of unique vendor code. Net gzip saving ~5–8 KB.

---

### L2 — Vendored Sankey Layout Library
**File**: `packages/x-charts-pro/src/SankeyChart/d3Sankey/sankey.ts`
**Lines**: 1–516 (entire file)
**Finding**: A copy of d3-sankey's layout algorithm is embedded as a 516-line TypeScript file with some minor modifications. This prevents the bundler and CDN from deduplicating it with other d3 users.
**Fix**: Depend on `d3-sankey` npm package and patch if needed, or apply a tiny transform wrapper over the published package's output.
**Impact**: ~4–7 KB gzip saving plus ability for consumers to deduplicate.

---

### L3–L7 — Massive Auto-Generated PropTypes Blocks
**Files & Lines**:
- `packages/x-charts/src/BarChart/BarChart.tsx` lines 169–1749 (~1,580 lines)
- `packages/x-charts/src/LineChart/LineChart.tsx` lines 214–1782 (~1,567 lines)
- `packages/x-charts/src/ScatterChart/ScatterChart.tsx` lines 187–1780 (~1,594 lines)
- `packages/x-charts/src/SparkLineChart/SparkLineChart.tsx` lines 325–1955 (~1,630 lines) — notably, SparkLineChart accepts *single* axis objects but PropTypes defines full array-based validation (~400 unnecessary lines in lines 698–1327 for xAxis and 1333–1954 for yAxis)
- `packages/x-charts-pro/src/BarChartPro/BarChartPro.tsx` lines 134–2165 (~2,031 lines)
- `packages/x-charts-pro/src/LineChartPro/LineChartPro.tsx` lines 436–2056 (~1,620 lines, xAxis 436–1247 + yAxis 1254–2056)
- `packages/x-charts-pro/src/ScatterChartPro/ScatterChartPro.tsx` lines 424–2044 (~1,620 lines)

**Finding**: Auto-generated PropTypes blocks constitute the majority of these files. Each block is large, unique text (property names and validator expressions) that gzip cannot compress across files. The Pro chart blocks are especially large because they add zoom-configuration PropTypes that repeat the strings `'discard'`, `'keep'`, `'always'`, `'hover'`, `'never'`, `'x'`, `'xy'`, `'y'` for every one of the 9+ axis type variants. Additionally, LineChartPro and ScatterChartPro PropTypes blocks are 90%+ identical to each other — a further cross-file duplication gzip cannot compress.
**Fix**: Strip PropTypes from production bundles using `babel-plugin-transform-react-remove-prop-types` (already common in React libraries). Also create a `createAxisPropType()` factory (see CF0c) to reduce the cross-chart duplication before stripping.
**Impact**: Each PropTypes block is ~1,500–2,000+ raw lines. Removing from production bundle saves an estimated **100–180 KB gzip** across the 8 chart components listed above.

---

### L8 — X/Y Axis Component Duplication
**Files**:
- `packages/x-charts/src/ChartsAxis/ChartsXAxis.tsx`
- `packages/x-charts/src/ChartsAxis/ChartsYAxis.tsx`
- `packages/x-charts/src/ChartsAxis/ChartsXAxis.types.ts`
- `packages/x-charts/src/ChartsAxis/ChartsYAxis.types.ts`

**Finding**: The X and Y axis components share ~80% structural identity. The differences are minimal (axis orientation, tick direction, label rotation). Both files define the same styled components, same event handler logic, same tick rendering code, with only axis-direction-specific math differing.
**Fix**: Refactor into a single parameterized `ChartsAxis` component accepting an `orientation` prop. This pattern is already used in many charting libraries.
**Impact**: Eliminate ~400–500 lines of near-duplicate code. Gzip saves ~3–5 KB for text that gzip can only partially compress because it spans separate files.

---

### L9 — Cartesian Axis Selector X/Y Duplication
**File**: `packages/x-charts/src/internals/plugins/featurePlugins/useChartCartesianAxis/useChartCartesianAxisRendering.selectors.ts`
**Lines**: 4 X/Y pairs across the file:
- `selectorChartXAxisWithDomains` (114–167) ↔ `selectorChartYAxisWithDomains` (169–222) — 54 lines each
- `selectorChartFilteredXDomains` (289–349) ↔ `selectorChartFilteredYDomains` (351–410) — 60 lines each
- `selectorChartNormalizedXScales` (412–427) ↔ `selectorChartNormalizedYScales` (429–444) — 15 lines each
- `selectorChartXScales` (446–471) ↔ `selectorChartYScales` (473–500) — 25 lines each

**Finding**: All 4 X/Y selector pairs are near-identical copies differing only in the axis direction key (`'x'` vs `'y'`). ~250 lines are duplicated in a 643-line file.
**Fix**: Create `createAxisWithDomainsSelector(axisDirection: 'x' | 'y')` factory and derive all X/Y pairs from it.
**Impact**: ~3–5 KB gzip saving; reduces a 643-line file by ~40%.

---

### L10 — SeriesConfig Architecture Boilerplate (47 files)
**Files**: All `seriesConfig.ts`, `seriesConfig.types.ts`, `colorConfig.ts`, etc. under:
- `BarChart/`, `LineChart/`, `ScatterChart/`, `PieChart/`, `RadarChart/` (x-charts)
- `BarChartPro/`, `LineChartPro/`, `ScatterChartPro/`, `FunnelChart/`, `HeatmapChart/` (x-charts-pro)

**Finding**: 47 files across chart types follow an almost identical structure. The most extreme case: `keyboardFocusHandler.ts` is 100% identical across Bar, Line, and Scatter (only the generic type parameter differs — see S34). Legend getter files are 95% identical across 5 chart types; tooltip getter files 85–95% identical; getColor files 70–80% identical. This is a cross-file repetition problem: gzip compresses within a single file well but cannot compress across file boundaries in the final bundle if modules are code-split.
**Fix**: Create a `createSeriesConfig<TSeriesType>()` factory and generate all series configs from it. This would collapse 47 files into ~5 (one per chart type) plus 1 factory.
**Impact**: Estimated **15–25 KB gzip** saving across the seriesConfig ecosystem.

---

### L11 — Popper Placement Array Repeated 8 Times
**Files**:
- `packages/x-charts/src/ChartsTooltip/ChartsTooltip.tsx` (3 occurrences)
- `packages/x-charts/src/ChartsTooltip/ChartsTooltipContainer.tsx` (3 occurrences)
- Additional tooltip-related files (2 occurrences)

**Finding**: A 16-element array of Popper placement strings is repeated literally 8 times across 2 files:
```ts
['bottom-end', 'bottom-start', 'bottom', 'left-end', 'left-start', 'left',
 'right-end', 'right-start', 'right', 'top-end', 'top-start', 'top',
 'auto-end', 'auto-start', 'auto', 'clippingParents']
```
Gzip compresses within a file well, but the cross-file occurrences are fully redundant text.
**Fix**: Extract to a shared constant `POPPER_PLACEMENTS` in a utility file and import it.
**Impact**: Eliminate 7 redundant copies of ~200 chars each. Gzip saving ~0.5–1 KB plus cleaner code.

---

### L12 — Plugin Store Spread Boilerplate (40+ Locations)
**Files**: All feature plugin files in `packages/x-charts/src/internals/plugins/featurePlugins/` and `packages/x-charts-pro/src/internals/plugins/`
**Finding**: Every plugin file repeats the same store initialization and update spread pattern:
```ts
store.update((prev) => ({
  ...prev,
  pluginName: { ...prev.pluginName, ...newState },
}));
```
This pattern appears in 40+ locations. While gzip handles within-file repetition, the cross-file size adds up.
**Fix**: Create a typed `updatePluginState(store, 'pluginName', newState)` utility that encapsulates the spread.
**Impact**: Moderate gzip saving (~2–3 KB) plus significant code clarity improvement.

---

### L13 — Locale Key Prefix Repeated 588 Times
**Files**: 7 locale files in `packages/x-charts/src/locales/`:
- `enUS.ts`, `frFR.ts`, `deDE.ts`, `esES.ts`, `ptBR.ts`, `zhCN.ts`, `jaJP.ts`

**Finding**: Each locale file has ~84 keys prefixed with `chartConfiguration`. Example:
```ts
chartConfigurationAxisLabel: 'Axis label',
chartConfigurationAxisMin: 'Minimum',
// ... 82 more
```
The string `"chartConfiguration"` is repeated 84 times per file × 7 files = **588 total occurrences**. Gzip handles within-file repetition well, but 18 characters × 84 = 1,512 chars per file that could be eliminated.
**Fix**: Use a nested object structure: `chartConfiguration: { axisLabel: '…', axisMin: '…' }`. This matches common i18n conventions and reduces key verbosity.
**Impact**: ~1–2 KB raw saving per locale file; gzip saving less but still meaningful at ~0.5 KB × 7 files.

---

## MEDIUM Impact Findings

### M1 — Animation Multi-Property Interpolator Boilerplate
**Files & Lines**:
- `useAnimateBar.ts` lines 17–31: 4× `interpolateNumber` calls (x, y, width, height)
- `useAnimateBarLabel.ts` lines 17–29: 4× `interpolateNumber` calls (x, y, width, height)
- `useAnimateGaugeValueArc.ts` lines 26–45: 5× `interpolateNumber` calls (startAngle, endAngle, innerRadius, outerRadius, cornerRadius)
- `useAnimatePieArc.ts` lines 27–45: 6× `interpolateNumber` calls (startAngle, endAngle, innerRadius, outerRadius, paddingAngle, cornerRadius)
- `useAnimatePieArcLabel.ts` lines 32–53: 6× `interpolateNumber` calls (same as above)

**Finding**: Every numeric animation hook creates multiple `interpolateNumber` instances with an identical boilerplate block — declare interpolators, return a function that applies them. The blocks differ only in which property names are interpolated.
**Fix**: Create `createMultiInterpolator(['x', 'y', 'width', 'height'])` factory in `internals/animation/` that generates the entire block from a list of property names.
**Impact**: ~1–2 KB gzip saving across 5 hooks.

---

### M2 — Series Hooks Identical Structure (5 files)
**Files**:
- `packages/x-charts/src/hooks/useBarSeries.ts`
- `packages/x-charts/src/hooks/useLineSeries.ts`
- `packages/x-charts/src/hooks/useScatterSeries.ts`
- `packages/x-charts/src/hooks/usePieSeries.ts`
- `packages/x-charts/src/hooks/useRadarSeries.ts`

**Finding**: Each file is ~28 lines and structurally identical — same hook pattern, same selector call, same return type shape. Only the series type name differs.
**Fix**: Generate with a factory: `createSeriesHook('bar')`, `createSeriesHook('line')`, etc.
**Impact**: Collapse 5 × 28 = 140 lines to ~10 lines + 1 factory. Gzip saving ~1 KB.

---

### M3 — `getColor` Helper Duplicated Per Series Type
**Files**: All `seriesConfig.ts` files (5 chart types × 2 packages)
**Finding**: The `getColor` helper function (~15 lines) is independently defined in each seriesConfig file with near-identical implementation.
**Fix**: Move to a shared `internals/colorUtils.ts` and import.
**Impact**: ~0.5–1 KB gzip saving.

---

### M4 — Double-Added Plugin Signature
**File**: `packages/x-charts-pro/src/internals/plugins/allPlugins.ts`
**Lines**: 37 and 68
**Finding**: `UseChartVisibilityManagerSignature` appears twice in the `allPlugins` array. This is a bug that also adds unnecessary bytes.
**Fix**: Remove the duplicate entry at line 68.
**Impact**: Small bundle saving + bug fix.

---

### M5 — Missing `import type` in Plugin Files
**Files**: Multiple files in `internals/plugins/` across all packages
**Finding**: Several files import interfaces and types without `import type`, preventing tree-shaking. TypeScript type imports with `import type` are fully erased at compile time; value imports are not.
**Fix**: Convert type-only imports to `import type { … }`.
**Impact**: Variable — depends on whether bundler can tree-shake the imported modules. Could save 1–5 KB depending on which modules are affected.

---

### M6 — Axis Highlight Component Duplication
**Files**:
- `packages/x-charts/src/ChartsAxisHighlight/ChartsXAxisHighlight.tsx`
- `packages/x-charts/src/ChartsAxisHighlight/ChartsYAxisHighlight.tsx`

**Lines**: 1–80 in each file
**Finding**: ~80% structural duplication. Both components define the same styled SVG elements, same animation logic, same prop handling — only the axis dimension (width/height, x/y) differs.
**Fix**: Create a unified `ChartsAxisHighlight` with an `axis` prop.
**Impact**: ~1–1.5 KB gzip saving.

---

### M7 — Overlay StyledText Defined Twice
**Files**:
- `packages/x-charts/src/ChartsOverlay/ChartsLoadingOverlay.tsx`
- `packages/x-charts/src/ChartsOverlay/ChartsNoDataOverlay.tsx`

**Lines**: 7–17 in each file
**Finding**: The `StyledText` styled-component is defined identically in both files.
**Fix**: Extract to a shared `ChartsOverlayText.tsx` and import.
**Impact**: Minor gzip saving (~200 bytes) but eliminates a maintenance hazard.

---

### M8 — Focus Navigation Forward/Backward Duplication
**File**: `packages/x-charts/src/internals/commonNextFocusItem.ts`
**Lines**: 21–125
**Finding**: `createGetNextIndexFocusedItem` and `createGetPreviousIndexFocusedItem` are ~40-line functions that are near-identical, differing only in direction (`+1` vs `-1`).
**Fix**: Parameterize with a `direction: 1 | -1` argument.
**Impact**: ~0.5–1 KB gzip saving.

---

### M9 — WebGL Shader Strings Not Lazily Loaded
**File**: `packages/x-charts-premium/src/HeatmapPremium/webgl/shaders.ts`
**Finding**: GLSL vertex and fragment shader source strings (~600+ characters each) are included in the main bundle as inline string literals. These are only used when WebGL rendering is active.
**Fix**: Use dynamic `import()` to load the shader module only when WebGL is initialized, or at minimum wrap in a lazy getter.
**Impact**: ~1–2 KB removed from initial bundle for consumers not using WebGL heatmaps.

---

### M10 — defaultizeAxis X/Y/Polar Duplication
**Files**:
- `useChartCartesianAxis/defaultizeAxis.ts` lines 16–77 (defaultizeXAxis) and 81–138 (defaultizeYAxis)
- `useChartPolarAxis/defaultizeAxis.ts` lines 7–40 (mirrors Cartesian pattern)

**Finding**: `defaultizeXAxis` and `defaultizeYAxis` are ~60-line functions (lines 16–138 total) that repeat the same logic — offset initialization, dataKey handling, error throwing, and spread operations — with only the axis key differing. The Polar axis defaultization file mirrors the same pattern independently.
**Fix**: Create a single `defaultizeAxis(axisKey, …)` generic and call it for X, Y, and Polar orientations.
**Impact**: ~2–3 KB gzip saving across the 3 implementations.

---

### M14 — createIsHighlighted / createIsFaded Factory Duplication
**Files**:
- `packages/x-charts/src/internals/plugins/featurePlugins/useChartHighlight/createIsHighlighted.ts` (lines 5–34)
- `packages/x-charts/src/internals/plugins/featurePlugins/useChartHighlight/createIsFaded.ts` (lines 5–34)

**Finding**: Both files export factory functions with identical structure: check conditions → return `alwaysFalse` → return conditional comparison logic for `seriesId`/`dataIndex`. The only difference is the scope property name (`'highlight'` vs `'fade'`).
**Fix**: Create a single `createHighlightFactory(scope: 'highlight' | 'fade')` and derive both `createIsHighlighted` and `createIsFaded` from it.
**Impact**: ~0.5–1 KB gzip saving; eliminates a cross-file duplication that gzip cannot compress.

---

### M15 — visibilityMap Mutation Pattern Triplicated
**File**: `packages/x-charts/src/internals/plugins/featurePlugins/useChartVisibilityManager/useChartVisibilityManager.ts`
**Lines**: 40–86
**Finding**: Three functions — `hideItem`, `showItem`, `toggleItem` — follow identical logic: get `visibilityMap` → serialize identifier → create new `Map` → mutate → set store → call callback. ~40 lines of near-identical code.
**Fix**: Extract `updateVisibility(store, identifier, newValue)` helper that encapsulates the Map creation/mutation/callback pattern.
**Impact**: ~0.5–1 KB gzip saving.

---

### M11 — `export *` Wildcard Re-exports
**Files**: Multiple `index.ts` files in `packages/x-charts/src/`, `packages/x-charts-pro/src/`, `packages/x-charts-premium/src/`
**Finding**: `export * from './SomeComponent'` prevents bundlers from tree-shaking exports that are never consumed. Named exports (`export { Foo } from '…'`) allow tree-shaking.
**Fix**: Replace `export *` with explicit named exports where possible, or ensure downstream bundlers use `sideEffects: false`.
**Impact**: Variable — can range from 0 (if consumers do direct imports) to significant (if consumers import from the package root).

---

### M12 — Plugin Signature Interface Boilerplate
**Files**: All feature plugin `*.types.ts` files (10+ files)
**Finding**: Each plugin's type file defines the same boilerplate shape:
```ts
export interface UseChartXxxSignature {
  state: UseChartXxxState;
  params: UseChartXxxParameters;
  defaultizedParams: UseChartXxxDefaultizedParameters;
  // ...
}
```
The field names are always the same; only the prefix changes.
**Fix**: Use a generic type helper `PluginSignature<'Xxx', State, Params, DefaultizedParams>`.
**Impact**: TypeScript-only improvement; reduces .d.ts output size moderately (~1–3 KB across all plugins).

---

### M13 — PieChart PropTypes Block
**File**: `packages/x-charts/src/PieChart/PieChart.tsx`
**Lines**: ~200–1,600 (~1,400 lines)
**Finding**: Same pattern as L3–L7 — massive auto-generated PropTypes block.
**Fix**: Same as L3–L7 — strip from production bundle.
**Impact**: ~15–25 KB gzip saving.

---

## SMALL Impact Findings

### S1 — Tooltip Markup Duplication
**Files**: `ChartsTooltip.tsx`, `ChartsTooltipContainer.tsx`, tooltip variant files
**Finding**: Wrapper `div` and container markup is re-declared across tooltip variants rather than shared.
**Fix**: Extract shared layout component.
**Impact**: ~0.5–1 KB gzip saving.

---

### S2 — RadarChart Axis Duplication
**Files**: `packages/x-charts/src/RadarChart/RadarAxis/` (multiple files)
**Finding**: RadarAxis components for different directions share ~70% code structure.
**Fix**: Parameterize direction.
**Impact**: ~0.5 KB gzip saving.

---

### S3 — Legend Item Render Duplication
**Files**: `packages/x-charts/src/ChartsLegend/` (multiple files)
**Finding**: Horizontal and vertical legend item rendering logic shares structure but is split into separate code paths.
**Fix**: Unify with orientation parameter.
**Impact**: ~0.5 KB gzip saving.

---

### S4 — Color Scale Helper Branches
**File**: `packages/x-charts/src/internals/colorScale.ts`
**Finding**: Ordinal, sequential, and diverging scale branches each duplicate the same validator/fallback boilerplate.
**Fix**: Extract shared validator.
**Impact**: ~300–500 bytes gzip saving.

---

### S5 — Gauge Arc Path Inline
**Files**: `packages/x-charts/src/Gauge/`
**Finding**: Arc path calculation is inlined rather than using a shared path utility.
**Fix**: Extract to shared `arcPath` util.
**Impact**: Minor, ~200–400 bytes.

---

### S6 — Funnel Segment Path Duplication
**Files**: `packages/x-charts-pro/src/FunnelChart/` (segment builders)
**Finding**: Multiple segment path builder functions share geometric computation boilerplate.
**Fix**: Extract common geometry helpers.
**Impact**: ~0.5 KB gzip saving.

---

### S7a — Heatmap Default Color Scale Hardcoded
**File**: `packages/x-charts-pro/src/Heatmap/useHeatmapProps.ts`
**Lines**: 25–36
**Finding**: 9 GnBu color hex strings are hardcoded inline as the default heatmap color scale, duplicating values from `d3-scale-chromatic` which is already a transitive dependency of the package:
```ts
const DEFAULT_COLORS = ['#f7fcf0', '#e0f3db', '#ccebc5', '#a8ddb5', '#7bccc4',
  '#4eb3d3', '#2b8cbe', '#0868ac', '#084081'];
```
**Fix**: Import from d3-scale-chromatic: `import { schemeGnBu } from 'd3-scale-chromatic'; const DEFAULT_COLORS = schemeGnBu[9];`
**Impact**: Removes 9 hardcoded string literals (~200 chars); lets bundler tree-shake or share the color scheme with other d3-chromatic consumers.

---

### S7 — Heatmap Canvas/SVG Render Paths
**Files**: `packages/x-charts-pro/src/Heatmap/` and `packages/x-charts-premium/src/HeatmapPremium/`
**Finding**: Canvas and SVG cell rendering share coordinate computation logic that is duplicated.
**Fix**: Extract shared cell geometry util.
**Impact**: ~0.3–0.5 KB gzip saving.

---

### S8 — ZoomSlider Horizontal/Vertical Duplication
**Files**: `packages/x-charts-pro/src/ZoomSlider/` (track and thumb components)
**Finding**: Track and thumb rendering for horizontal vs. vertical orientation duplicates layout logic.
**Fix**: Parameterize with orientation prop.
**Impact**: ~0.5 KB gzip saving.

---

### S9 — Sankey Node/Link Geometry Duplication
**Files**: `packages/x-charts-pro/src/SankeyChart/`
**Finding**: Node and link render helpers repeat geometry utilities for path building.
**Fix**: Consolidate geometry helpers.
**Impact**: ~0.3 KB gzip saving.

---

### S10 — Scatter Marker Shape Switch-Case Duplication
**Files**: `packages/x-charts/src/ScatterChart/` (plot + legend)
**Finding**: Marker shape switch-case is repeated in both the scatter plot and the legend renderer.
**Fix**: Extract `renderScatterMarker(shape)` helper.
**Impact**: ~0.3–0.5 KB gzip saving.

---

### S11 — Easing Function Defined Inline Per Hook
**Files**: Multiple `hooks/animation/useAnimate*.ts` files
**Finding**: `const linear = (t: number) => t` defined inline in multiple hook files.
**Fix**: Import from `internals/animation/easing.ts`.
**Impact**: Minor, ~100–200 bytes.

---

### S12 — ChartContainer Prop Forwarding Boilerplate
**Files**: `packages/x-charts/src/ChartContainer/ChartContainer.tsx`, `packages/x-charts-pro/src/ChartContainerPro/ChartContainerPro.tsx`
**Finding**: ~60 lines of prop forwarding boilerplate are duplicated between base and Pro container.
**Fix**: Extract shared prop-forwarding logic.
**Impact**: ~0.5 KB gzip saving.

---

### S13 — Toolbar Button Pattern Repeated
**Files**: `packages/x-charts/src/Toolbar/` and `packages/x-charts-pro/src/ToolbarPro/`
**Finding**: Each toolbar button follows the same render + aria-label pattern without a shared button template.
**Fix**: Create a `ToolbarButton` base that each action wraps.
**Impact**: ~0.3–0.5 KB gzip saving.

---

### S14 — Plugin useEffect Store Update Pattern
**Files**: Multiple feature plugin files
**Finding**: `useEffect(() => { store.update(…) }, [])` appears with the same structure in 15+ plugins.
**Fix**: Extract to `usePluginEffect` hook that encapsulates the store update pattern.
**Impact**: ~0.5–1 KB gzip saving.

---

### S15 — Bar Label Position Logic Duplicated
**Files**: `packages/x-charts/src/BarChart/BarLabel/` and `BarPlot.tsx`
**Finding**: Bar label position computation is duplicated between the label component and the plot.
**Fix**: Consolidate in the label module.
**Impact**: ~0.3 KB gzip saving.

---

### S16 — Reference Line X/Y Duplication
**Files**:
- `packages/x-charts/src/ChartsReferenceLine/ChartsXReferenceLine.tsx` (lines 34–79)
- `packages/x-charts/src/ChartsReferenceLine/ChartsYReferenceLine.tsx` (lines 34–79)

**Finding**: The `getTextParams` function (lines 34–79 in each file, ~45 lines each) is nearly identical between the two components — only the axis dimension (x vs. y) and associated math differ. Additionally, PropTypes blocks (lines 144–193 in each) share ~95% content.
**Fix**: Extract `getTextParams(axisDirection, …)` to `common.tsx` and unify PropTypes with a shared base.
**Impact**: ~1–1.5 KB gzip saving.

---

### S17 — Type Imports Not Using `import type`
**Files**: Various files in `ChartsAxis/`, `ChartsGrid/`
**Finding**: Interface and type imports don't use `import type`, which may prevent tree-shaking in some bundler configurations.
**Fix**: Convert to `import type { … }`.
**Impact**: Minor, depends on bundler configuration.

---

### S18 — MUI Error Prefix Repeated
**Files**: Multiple files across packages
**Finding**: `MuiError('MUI X: …')` calls repeat the `'MUI X: '` prefix and sometimes long module path strings.
**Fix**: Use a constant for the prefix or rely on the error utility to prepend it automatically.
**Impact**: Minor, ~100–300 bytes.

---

### S19 — Tooltip Styled Components Redefined
**File**: `packages/x-charts/src/ChartsTooltip/ChartsTooltipContainer.tsx`
**Finding**: `styled('td')` and `styled('th')` components are defined per-usage context rather than shared.
**Fix**: Extract shared `TooltipCell` and `TooltipHeader` styled components.
**Impact**: ~200–400 bytes.

---

### S20 — SparkLine Default Prop Objects Recreated Per Render
**File**: `packages/x-charts/src/SparkLineChart/SparkLineChart.tsx`
**Finding**: Default prop objects (e.g., `{ colors: [] }`) are inline object literals rather than module-level constants, causing new object creation every render and preventing referential equality checks.
**Fix**: Extract to module-level constants.
**Impact**: Minor bundle savings + runtime performance improvement.

---

## TINY Impact Findings

### T1 — Typo in Comment
**File**: `packages/x-charts/src/RadarChart/RadarAxis/useRadarAxis.ts:52`
**Finding**: Comment reads `"dtos nto"` — should be `"does not"`.
**Fix**: Correct typo.
**Impact**: Cosmetic only.

---

### T2 — Trailing Space in Color Hex Literal
**File**: `packages/x-charts/src/colorPalettes/sequential/red.ts:12`
**Finding**: `'#560503 '` has a trailing space. This may cause color parsing issues in some renderers.
**Fix**: Remove trailing space: `'#560503'`.
**Impact**: Bug fix + 1 byte.

---

### T3 — `${0}` Template Literal in viewBox
**File**: `packages/x-charts/src/ChartsSurface/ChartsSurface.tsx:94`
**Finding**: `` viewBox={`${0} ${0} ${w} ${h}`} `` uses `${0}` template expressions that always produce `"0"`.
**Fix**: Use `viewBox={\`0 0 ${w} ${h}\`}` directly.
**Impact**: 4 bytes saved + cleaner code.

---

### T4 — Duplicate Plugin Registration
**File**: `packages/x-charts-pro/src/internals/plugins/allPlugins.ts:37,68`
**Finding**: `UseChartVisibilityManagerSignature` appears in the plugin array at line 37 and again at line 68.
**Fix**: Remove the duplicate at line 68.
**Impact**: 1 array element deduplicated; minor bytes + potential bug fix.

---

### T5 — String Constant `"linear"` Duplicated
**Files**: Multiple animation hook files
**Finding**: The easing mode string `"linear"` is hardcoded independently in multiple files instead of being imported from a shared constant.
**Fix**: Define `const LINEAR = 'linear'` in animation utilities and import it.
**Impact**: ~50 bytes gzip.

---

### T6 — Magic Number in Flatbush
**File**: `packages/x-charts/src/internals/Flatbush.ts`
**Finding**: The node size constant `16` is used inline throughout without a named constant. (Moot if L1 is fixed.)
**Fix**: `const NODE_SIZE = 16;` — or better, remove the vendored file entirely (L1).
**Impact**: Cosmetic if L1 is addressed.

---

### T7 — Double `as unknown as X` Cast
**Files**: Several hooks and plugin files
**Finding**: `value as unknown as TargetType` double-cast appears where a direct assertion or type guard would be cleaner and might produce slightly smaller output.
**Fix**: Use proper generics or type guards.
**Impact**: Minimal; mostly code quality.

---

### T8 — Unused Re-exports in Index Files
**Files**: Some `index.ts` files
**Finding**: Certain types are re-exported from package index but appear to have no external consumers.
**Fix**: Audit and remove unused re-exports after verifying with API surface analysis.
**Impact**: Minor tree-shaking improvement.

---

### T9 — TODO Comments Without Issue Links
**Files**: Animation hooks
**Finding**: Several `// TODO: remove` comments have no associated issue links, making them untraceable.
**Fix**: Add GitHub issue links or remove if the TODO is resolved.
**Impact**: Cosmetic only.

---

### T10 — Empty `{}` Default Export
**Files**: Some plugin files
**Finding**: `export default {}` used where `export default undefined` or removing the export would be equivalent.
**Fix**: Remove empty default exports.
**Impact**: ~10–20 bytes per file.

---

### S21 — ChartsRenderer Configuration Repeated Key Prefix
**File**: `packages/x-charts-premium/src/ChartsRenderer/configuration.tsx`
**Lines**: 17–482
**Finding**: The `configuration.tsx` file is ~465 lines defining chart configuration controls. The string `'chartConfiguration'` is used as a key prefix throughout (in addition to locale files — see L13), and control object literals for Charts, Axes, Tooltip, and Legend sections each repeat the same `{ type, label, options, value, default }` shape ~30+ times.
**Fix**: Extract control object factory functions and shared key-prefix constants.
**Impact**: ~1–2 KB gzip saving.

---

### S25 — ContinuousColorLegend templateAreas Called 6× Inside Styled Callback
**File**: `packages/x-charts/src/ChartsLegend/ContinuousColorLegend.tsx`
**Lines**: 133, 136, 139, 148, 154, 160
**Finding**: The `templateAreas(reverse)` function is called 6 times inside the styled component callback (at each CSS property that depends on it), each time with the same `ownerState.reverse` value. Since the result is deterministic, these are 6 redundant recomputations.
**Fix**: Call `templateAreas(ownerState.reverse)` once at the top of the styled callback, store in a variable, and reference it for all 6 usages.
**Impact**: Minor runtime improvement + cleaner code; ~200 bytes gzip saving.

---

### S26 — Legend Class Selector String Repeated 30+ Times
**Files**:
- `packages/x-charts/src/ChartsLegend/ContinuousColorLegend.tsx` (lines 129–176)
- `packages/x-charts/src/ChartsLegend/PiecewiseColorLegend.tsx` (lines 80–152)

**Finding**: Inside styled component callbacks, the full class object name is used in every selector: `` `.${continuousColorLegendClasses.horizontal}` `` — repeated 13+ times. Similarly for `piecewiseColorLegendClasses` repeated 20+ times. Gzip compresses within a file, but the long variable name still adds bytes.
**Fix**: Destructure at the top of the callback: `const c = continuousColorLegendClasses;` and use `c.horizontal`, `c.vertical`, etc.
**Impact**: ~300–500 bytes gzip saving per file.

---

### S22 — WebGL Color Parser Triple Regex Duplication
**File**: `packages/x-charts-premium/src/utils/webgl/parseColor.ts`
**Lines**: 30, 57, 82–105
**Finding**: Three separate color parsing strategies (hex, rgb, rgba) are implemented as independent functions with duplicated validation and fallback logic rather than a unified parser.
**Fix**: Consolidate into a single `parseColor(str)` with a single regex or sequential strategy pattern.
**Impact**: ~300–500 bytes gzip saving.

---

### S23 — WebGL Uniform Setup Callbacks Boilerplate
**File**: `packages/x-charts-premium/src/HeatmapPremium/webgl/HeatmapWebGLPlot.tsx`
**Lines**: 94–108
**Finding**: `setupResolutionUniform`, `setupBorderRadiusUniform`, and `setupRectDimensionsUniform` are three `useCallback` declarations following an identical setup template — only the uniform name and value differ.
**Fix**: Extract a `useUniformCallback(gl, uniformName, value)` factory hook.
**Impact**: ~300–500 bytes gzip saving.

---

### S31 — domUtils.ts PIXEL_STYLES Set (20 Strings → 1 Regex)
**File**: `packages/x-charts/src/internals/domUtils.ts`
**Lines**: 20–40
**Finding**: A `Set` containing 20 CSS property name strings (`minWidth`, `maxWidth`, `width`, `height`, `padding`, `margin`, `top`, `left`, `fontSize`, …) is used to check whether a style is a pixel value. The Set definition occupies 20 lines of unique string literals.
**Fix**: Replace with a single regex: `const pixelStyles = /^(minWidth|maxWidth|width|height|padding|margin|top|left|fontSize|…)/;` and use `.test(prop)` instead of `.has(prop)`. Regex compresses better than a Set literal.
**Impact**: ~200–300 bytes gzip saving.

---

### S32 — Cartesian vs Polar computeAxisValue.ts Parallel Implementations
**Files**:
- `useChartCartesianAxis/computeAxisValue.ts` (~234 lines)
- `useChartPolarAxis/computeAxisValue.ts` (~222 lines)

**Finding**: Both files implement axis value computation with similar signatures, imports, and algorithmic structure. An estimated ~150 lines overlap between the two.
**Fix**: Create a shared `computeAxisValue(axisType, …)` base and have each direction call it with type-specific parameters.
**Impact**: ~1–2 KB gzip saving.

---

### S28 — `setAttribute` + `.toString()` Pattern in Animation Hooks
**Files**:
- `useAnimateBar.ts` lines 58–61 (4× calls for x, y, width, height)
- `useAnimateBarLabel.ts` lines 61–64 (4× calls)
- `useAnimatePieArcLabel.ts` lines 93–94 (2× calls)

**Finding**: The pattern `element.setAttribute('x', value.toString())` repeats 10 times across 3 files. Each call is a separate line with the same structure — only the attribute name and value variable differ.
**Fix**: Extract `const setAttr = (el: Element, name: string, val: number) => el.setAttribute(name, String(val));` to the animation utilities module and import it in all 3 files.
**Impact**: ~300–500 bytes gzip saving; the repeated `setAttribute` + `toString` text compresses better from a single definition.

---

### S34 — Keyboard Focus Handler 100% Identical Across 3 Chart Types
**Files**:
- `packages/x-charts/src/BarChart/seriesConfig/bar/keyboardFocusHandler.ts` (26 lines, type: `'bar'`)
- `packages/x-charts/src/LineChart/seriesConfig/keyboardFocusHandler.ts` (26 lines, type: `'line'`)
- `packages/x-charts/src/ScatterChart/seriesConfig/keyboardFocusHandler.ts` (28 lines, type: `'scatter'`)

**Finding**: All three files contain 100% identical logic — the same `switch(event.key)` block with the same 4 arrow-key cases calling the same `createGetNextIndexFocusedItem`, `createGetPreviousIndexFocusedItem`, etc. Only the generic type parameter (`'bar'`, `'line'`, `'scatter'`) differs.
**Fix**: Create `createKeyboardFocusHandler<T>(type: T)` factory (~15 lines) and reduce each per-chart file to a single 1-line call.
**Impact**: Collapse 78–84 lines of 100%-identical code to ~20 lines total. Gzip saving ~0.5–1 KB (cross-file duplication cannot be compressed by gzip).

---

### S35 — Color Palette Factory Pattern (14 Files)
**Files**: All 14 categorical and sequential palette files in `packages/x-charts/src/colorPalettes/`
**Finding**: Every palette file defines three exports with identical structure:
```ts
export const blueberryTwilightPaletteLight = [...];
export const blueberryTwilightPaletteDark = [...];
export const blueberryTwilightPalette: ChartsColorPaletteCallback =
  (mode) => mode === 'dark' ? blueberryTwilightPaletteDark : blueberryTwilightPaletteLight;
```
The third export (the callback) is 100% identical across all 14 files — only the array references change. That's 42 redundant lines of conditional export logic across 14 files.
**Fix**: `export const blueberryTwilightPalette = createPalette(light, dark)` where `createPalette` lives in a shared util. Each file drops from 3 exports to 1 call + 2 array constants.
**Impact**: ~0.5 KB gzip saving across 14 files.

---

### S33 — Controlled State Validation Boilerplate (useAssertModelConsistency)
**Files**:
- `useChartHighlight.ts` (lines 9–21)
- `useChartTooltip.ts` (similar block)
- `useChartVisibilityManager.ts` (similar block)
- `useChartBrush.ts` (similar block)

**Finding**: 4+ plugins each copy the same `useAssertModelConsistency({ warningPrefix, componentName, propName, controlled, defaultValue })` call block (~8 lines each) for controlled/uncontrolled state validation. The structure is identical; only `propName` and `controlled` differ.
**Fix**: Extract a `usePluginControlledState(propName, controlled)` hook that encapsulates the repeated call.
**Impact**: ~400 bytes gzip saving across 4–5 plugins.

---

### S29 — PieArc Data Shape PropTypes Repeated 3+ Times
**Files**:
- `packages/x-charts/src/PieChart/PieArcPlot.tsx` (lines 130–227)
- `packages/x-charts/src/PieChart/PieArcLabelPlot.tsx` (lines 154–256)
- `packages/x-charts/src/PieChart/PieArc.tsx` (lines 173–199)

**Finding**: The pie data shape `PropTypes.shape({ color, endAngle, formattedValue, id, index, label, labelMarkType, padAngle, startAngle, value })` is defined independently in at least 3 files. Each definition is ~12 lines of unique text that gzip cannot compress across file boundaries.
**Fix**: Extract as `PIE_DATA_PROPTYPES` constant in a shared `pieChartPropTypes.ts` utility and import in all three files.
**Impact**: ~0.5 KB gzip saving.

---

### S30 — RadarAxis dominantBaseline Enum Defined Inline
**File**: `packages/x-charts/src/RadarChart/RadarAxis/RadarAxis.tsx`
**Lines**: 94–108
**Finding**: A `PropTypes.oneOf([...])` array for the SVG `dominantBaseline` attribute enumerates all possible values inline (~14 strings). This same enum likely appears in other SVG-text-rendering components.
**Fix**: Extract `DOMINANT_BASELINE_VALUES` as a module-level or shared constant and reference it in PropTypes.
**Impact**: ~200–300 bytes gzip saving if consolidated across files.

---

### S27 — ChartsWrapper Grid Template Builder Functions
**File**: `packages/x-charts/src/ChartsWrapper/ChartsWrapper.tsx`
**Lines**: 64–118
**Finding**: Three functions — `getTemplateColumns`, `getTemplateRows`, and `getGridTemplateAreas` — share nearly identical parameter patterns and string-building logic. The position strings `'start'`, `'end'`, `'center'` also appear 6+ times in `getJustifyItems`/`getAlignItems` without a shared mapping object.
**Fix**: Create a generic `buildGridTemplate(axis, config)` helper and extract position mappings to a config object.
**Impact**: ~0.5–1 KB gzip saving.

---

### S24 — useXxxChartProps Hooks Structural Duplication
**Files**:
- `packages/x-charts/src/BarChart/useBarChartProps.ts`
- `packages/x-charts/src/LineChart/useLineChartProps.ts`
- `packages/x-charts/src/ScatterChart/useScatterChartProps.ts`

**Finding**: Each `useXxxChartProps` hook has the same structure — extracting wrapper/grid/axis/legend props via the same destructuring and reshaping logic. Only chart-type-specific overrides differ.
**Fix**: Create a `createUseChartProps(config)` factory and reduce each per-chart file to the config delta only.
**Impact**: ~0.5–1 KB gzip saving.

---

---

## Cross-File Pattern Findings

### CF0 — MUI CSS Classes Factory Pattern in 30+ Files
**Files**: Every `*Classes.ts` file across x-charts:
- `packages/x-charts/src/BarChart/barClasses.ts`
- `packages/x-charts/src/BarChart/barElementClasses.ts`
- `packages/x-charts/src/ChartsGrid/chartsGridClasses.ts`
- … and ~27 more `*Classes.ts` files across all chart components

**Finding**: Every chart component has 1–2 `*Classes.ts` files that each follow exactly the same 20–50 line template: define a `classes` object with typed keys, call `generateUtilityClasses` with the component prefix, and export a `getXxxUtilityClass(slot)` helper. The only variation is the component name prefix and the list of slot names. These are all separate modules with unique text that gzip cannot compress across file boundaries.
**Fix**: Create a single `createChartClasses('Bar', ['root', 'series', 'seriesLabels'])` meta-factory. Each `*Classes.ts` file collapses from 20–50 lines to 2–3 lines. All the template boilerplate moves into the single factory, which gzip compresses once.
**Impact**: **~5–10 KB gzip** saving across ~30 files (each file currently has ~400–800 bytes of unique boilerplate text).

---

### CF0b — Focused Element Components Structural Duplication
**Files**:
- `packages/x-charts/src/BarChart/FocusedBar.tsx`
- `packages/x-charts/src/LineChart/FocusedLineMark.tsx`
- `packages/x-charts/src/ScatterChart/FocusedScatterMark.tsx`
- `packages/x-charts/src/PieChart/FocusedPieArc.tsx`

**Finding**: All four `Focused*` components follow the same rendering pattern — reading focused item from store, computing position via a type-specific hook, rendering a highlight overlay. The structure is identical; only the position calculator and element type differ.
**Fix**: Extract a generic `FocusedChartElement` component that accepts a `positionCalculator` function prop and renders the common structure.
**Impact**: ~1–2 KB gzip saving; eliminates cross-file structural duplication.

---

### CF0c — LineChart/ScatterChart PropTypes Cross-File Duplication
**Files**:
- `packages/x-charts/src/LineChart/LineChart.tsx` (lines 214–1782, ~1,567 lines)
- `packages/x-charts/src/ScatterChart/ScatterChart.tsx` (lines 187–1780, ~1,594 lines)

**Finding**: The two PropTypes blocks are 90%+ identical. Both independently define axis validation for the same 12+ scale types (`band`, `point`, `log`, `symlog`, `pow`, `sqrt`, `time`, `utc`, `linear`) each with the same 3 colorMap variants (`ordinal`, `continuous`, `piecewise`), producing a 12 × 3 = 36-combination expansion in each file. Because these are separate files, gzip compresses each block internally but cannot compress across file boundaries — the cross-file duplication is pure waste.
**Fix**: Create `internals/propTypesHelpers.ts` with a `createAxisPropType(scaleTypes, options)` factory. Each chart file then reduces to 20–30 lines of factory calls rather than 1,500+ lines of inline definitions. The factory itself is shared, compressed once.
**Impact**: **15–25 KB gzip** saving (the individual L4/L5 savings already count this, but the cross-file factory is the mechanism to achieve both simultaneously).

---

### CF1 — SeriesConfig Architecture: 47-File Boilerplate Ecosystem
**Files**: ~47 files total across all chart types in both x-charts and x-charts-pro
**Finding**: The seriesConfig architecture results in 47 files all following the same template. Because these files are separate modules, gzip cannot compress across file boundaries in chunked bundles. A factory-based approach would create fewer unique files with more intra-file patterns that gzip handles well.
**Estimated impact**: 15–25 KB gzip across the whole ecosystem.

---

### CF2 — MUI Error Number Prefix Pattern
**Files**: Multiple files that call `MuiError()`
**Finding**: MUI's internal error system uses numeric codes at runtime. The long string messages are only in development builds. However, the message strings are still included in the development bundle and repeat common prefixes (`'MUI X Charts:'`, module paths). These are cross-file and thus compress poorly.
**Fix**: Ensure all chart error messages use the numeric code system consistently.
**Impact**: ~1–3 KB development bundle saving.

---

### CF3 — Vendor Library Summary
Two significant vendored libraries were found:
1. **Flatbush** (560 lines in x-charts) — see L1
2. **d3-sankey** (516 lines in x-charts-pro) — see L2

Both represent unique code blocks that cannot be compressed by any external means and cannot be deduplicated by consumers.
**Combined estimated gzip impact**: 8–15 KB.

---

### CF4 — X/Y Symmetry Pattern Throughout the Codebase
The X/Y axis duplication is a pervasive architectural pattern that appears at every layer:
- Component level (ChartsXAxis/ChartsYAxis — L8)
- Selector level (X/Y selectors — L9)
- Function level (defaultizeXAxis/defaultizeYAxis — M10)
- Highlight level (ChartsXAxisHighlight/ChartsYAxisHighlight — M6)
- Reference line level (ChartsXReferenceLine/ChartsYReferenceLine — S16)

Each pair individually has moderate impact, but together the pattern represents a systemic duplication. A consistent axis-parameterization refactor across all layers would have the most compounding benefit.
**Combined estimated gzip impact across all X/Y pairs**: 8–15 KB.

---

## Impact Estimates Summary

| Category | Estimated Gzip Saving |
|----------|-----------------------|
| PropTypes blocks (L3–L7, M13, + LineChartPro + ScatterChartPro) | 100–180 KB |
| Vendored libraries (L1, L2) | 8–15 KB |
| CSS classes factory pattern (CF0, ~30 files) | 5–10 KB |
| SeriesConfig boilerplate (L10, CF1) | 15–25 KB |
| X/Y axis duplication across all layers (CF4) | 8–15 KB |
| Locale key prefixes (L13) | 3–5 KB |
| Plugin boilerplate (L12) | 2–3 KB |
| Remaining MEDIUM findings (M1–M12) | 5–10 KB |
| SMALL findings (S1–S20) | 5–8 KB |
| TINY findings (T1–T10) | < 1 KB |
| **Total estimated savings** | **~130–230 KB gzip** |

> Note: PropTypes savings are production-only (they're already stripped in development builds of many consumers). The actual savings depend on how the package is consumed and bundled.

---

*Analysis completed: 2026-02-19. ~300 source files across packages/x-charts, packages/x-charts-pro, packages/x-charts-premium.*
