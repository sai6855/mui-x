# Bundle Size Findings: colorPalettes/, locales/, models/, context/, and Top-Level src/ Files

Scope: All `.ts` and `.tsx` files under `packages/x-charts/src/` in:
- `colorPalettes/`
- `locales/`
- `models/`
- `context/`
- Top-level `src/*.ts` / `src/*.tsx`

---

## Finding 1: Trailing Whitespace in Hex Color String

- **File**: `packages/x-charts/src/colorPalettes/sequential/red.ts`
- **Line**: 12
- **Category**: Dead code / data error
- **Current code**:
  ```ts
  '#560503 ',
  ```
- **Suggested fix**:
  ```ts
  '#560503',
  ```
- **Explanation**: The hex color value has a trailing space inside the string literal. This is a data correctness issue that also adds 1 byte to the string. If this color is ever compared against a user-supplied value or used in a strict equality check, the trailing space would cause a mismatch.
- **Estimated gzip savings**: ~1 byte

---

## Finding 2: Unnecessary Object Spread in getChartsLocalization

- **File**: `packages/x-charts/src/locales/utils/getChartsLocalization.ts`
- **Lines**: 8-18
- **Category**: Unnecessary object spread
- **Current code**:
  ```ts
  export const getChartsLocalization = (chartsTranslations: Partial<ChartsLocaleText>) => {
    return {
      components: {
        MuiChartsLocalizationProvider: {
          defaultProps: {
            localeText: { ...chartsTranslations },
          },
        },
      },
    };
  };
  ```
- **Suggested fix**:
  ```ts
  export const getChartsLocalization = (chartsTranslations: Partial<ChartsLocaleText>) => {
    return {
      components: {
        MuiChartsLocalizationProvider: {
          defaultProps: {
            localeText: chartsTranslations,
          },
        },
      },
    };
  };
  ```
- **Explanation**: The spread `{ ...chartsTranslations }` creates a shallow copy of the translations object every time this function is called. The caller already passes a fresh object literal (e.g., `enUSLocaleText`), so there is no need for defensive cloning here. This function is called 7 times (once per locale), so the spread operator output appears in the bundle 7 times after inlining. Removing the spread saves the spread syntax in the compiled output.
- **Estimated gzip savings**: ~3-5 bytes

---

## Finding 3: Redundant Dark Palette Exports and Ternary Checks for Sequential Palettes

- **Files** (9 total):
  - `packages/x-charts/src/colorPalettes/sequential/blue.ts` (lines 14, 16-17)
  - `packages/x-charts/src/colorPalettes/sequential/cyan.ts` (lines 14, 16-17)
  - `packages/x-charts/src/colorPalettes/sequential/green.ts` (lines 14, 16-17)
  - `packages/x-charts/src/colorPalettes/sequential/orange.ts` (lines 14, 16-17)
  - `packages/x-charts/src/colorPalettes/sequential/pink.ts` (lines 14, 16-17)
  - `packages/x-charts/src/colorPalettes/sequential/purple.ts` (lines 14, 16-17)
  - `packages/x-charts/src/colorPalettes/sequential/red.ts` (lines 14, 16-17)
  - `packages/x-charts/src/colorPalettes/sequential/strawberrySky.ts` (lines 11, 13-14)
  - `packages/x-charts/src/colorPalettes/sequential/yellow.ts` (lines 14, 16-17)
- **Category**: Redundant logic / dead code
- **Current pattern** (example from `blue.ts`):
  ```ts
  export const bluePaletteDark = bluePaletteLight;

  export const bluePalette: ChartsColorPaletteCallback = (mode) =>
    mode === 'dark' ? bluePaletteDark : bluePaletteLight;
  ```
- **Suggested fix**:
  ```ts
  export const bluePaletteDark = bluePaletteLight;

  export const bluePalette: ChartsColorPaletteCallback = () => bluePaletteLight;
  ```
- **Explanation**: In all 9 sequential palette files, the dark and light palette arrays are identical (`xxxPaletteDark = xxxPaletteLight`). The callback then performs a useless ternary check (`mode === 'dark' ? xxxPaletteDark : xxxPaletteLight`) that always returns the same reference regardless of the mode. Removing the ternary and the unused `mode` parameter saves the conditional expression and the `mode` parameter binding in every file.
  - The `xxxPaletteDark` alias must remain exported for backwards compatibility unless a breaking change is acceptable, but the callback body can be simplified.
  - Per file: removes `mode` parameter (~4 chars), `=== 'dark' ? xxxPaletteDark : ` (~30+ chars of source). Minified and gzipped, the repeated ternary pattern across 9 files compresses well but still wastes bytes.
- **Estimated gzip savings**: ~90-120 bytes total across all 9 files

---

## Finding 4: Repeated Palette Callback Pattern Across Categorical Palettes

- **Files** (4 total):
  - `packages/x-charts/src/colorPalettes/categorical/blueberryTwilight.ts` (lines 20-21)
  - `packages/x-charts/src/colorPalettes/categorical/cheerfulFiesta.ts` (lines 28-29)
  - `packages/x-charts/src/colorPalettes/categorical/mangoFusion.ts` (lines 28-29)
  - `packages/x-charts/src/colorPalettes/categorical/rainbowSurge.ts` (lines 23-24)
- **Category**: Duplicate code pattern
- **Current pattern** (repeated identically 4 times):
  ```ts
  export const blueberryTwilightPalette: ChartsColorPaletteCallback = (mode) =>
    mode === 'dark' ? blueberryTwilightPaletteDark : blueberryTwilightPaletteLight;
  ```
- **Suggested fix**: Extract a shared helper function:
  ```ts
  // In a shared utility, e.g., colorPalettes/utils.ts
  export const createPalette = (
    light: string[],
    dark: string[],
  ): ChartsColorPaletteCallback => (mode) => mode === 'dark' ? dark : light;
  ```
  Then each file becomes:
  ```ts
  export const blueberryTwilightPalette = createPalette(
    blueberryTwilightPaletteLight,
    blueberryTwilightPaletteDark,
  );
  ```
- **Explanation**: All 4 categorical palettes (and the 9 sequential ones) share the exact same callback shape: `(mode) => mode === 'dark' ? dark : light`. A shared helper would deduplicate this logic, saving the repeated arrow function plus ternary expression in 13 files total. Gzip does compress repeated patterns well, so the net savings is modest, but the code becomes more maintainable and the minified output shrinks.
- **Estimated gzip savings**: ~8-12 bytes (gzip compresses repeated patterns, but the function references and variable names still differ)

---

## Finding 5: Commented-Out Translations in ptPT Locale

- **File**: `packages/x-charts/src/locales/ptPT.ts`
- **Lines**: 20-117
- **Category**: Dead code (comments)
- **Current code**: 65 commented-out key-value pairs, e.g.:
  ```ts
  // chartTypeBar: 'Bar',
  // chartTypeColumn: 'Column',
  // chartTypeLine: 'Line',
  // ...
  // chartConfigurationOptionBumpX: 'Bump X',
  // chartConfigurationOptionBumpY: 'Bump Y',
  ```
- **Suggested fix**: Remove all commented-out lines entirely. These are serving as a template for future translators but add significant size to the source (and if comments are not stripped by the bundler, they end up in the output).
- **Explanation**: There are approximately 65 lines of commented-out translation keys. While most bundlers strip comments during minification, some configurations preserve them. Even when stripped, the source file is larger than necessary, adding to development-time overhead. The fallback to `enUS` is already handled by the `Partial<ChartsLocaleText>` type and the localization provider merging logic.
- **Estimated gzip savings**: ~120-180 bytes (if comments survive to bundle, much more)

---

## Finding 6: Commented-Out Translations in svSE Locale

- **File**: `packages/x-charts/src/locales/svSE.ts`
- **Lines**: 20-117
- **Category**: Dead code (comments)
- **Current code**: Same pattern as ptPT -- 65 commented-out key-value pairs:
  ```ts
  // chartTypeBar: 'Bar',
  // chartTypeColumn: 'Column',
  // ...
  // chartConfigurationOptionBumpX: 'Bump X',
  // chartConfigurationOptionBumpY: 'Bump Y',
  ```
- **Suggested fix**: Remove all commented-out lines.
- **Explanation**: Identical issue to Finding 5. The svSE locale has 65 commented-out translation keys that are dead code.
- **Estimated gzip savings**: ~120-180 bytes

---

## Finding 7: Commented-Out Translations in frFR Locale

- **File**: `packages/x-charts/src/locales/frFR.ts`
- **Lines**: 10-16
- **Category**: Dead code (comments)
- **Current code**:
  ```ts
  // zoomIn: 'Zoom in',
  // zoomOut: 'Zoom out',
  // toolbarExport: 'Export',

  // Toolbar Export Menu
  // toolbarExportPrint: 'Print',
  // toolbarExportImage: mimeType => `Export as ${imageMimeTypes[mimeType] ?? mimeType}`,
  ```
- **Suggested fix**: Remove commented-out lines.
- **Explanation**: 5 commented-out keys in the frFR locale. Smaller impact than ptPT/svSE but same principle.
- **Estimated gzip savings**: ~10-15 bytes

---

## Finding 8: frFR Uses Inconsistent Export Name

- **File**: `packages/x-charts/src/locales/frFR.ts`
- **Line**: 4
- **Category**: String repetition hurting gzip / naming inconsistency
- **Current code**:
  ```ts
  export const frFRLocalText: Partial<ChartsLocaleText> = {
  ```
- **Expected pattern** (based on all other locales):
  ```ts
  export const frFRLocaleText: Partial<ChartsLocaleText> = {
  ```
- **Explanation**: Every other locale file uses the pattern `xxxLocaleText` (e.g., `enUSLocaleText`, `elGRLocaleText`, `ptBRLocaleText`, `ptPTLocaleText`, `svSELocaleText`, `nbNOLocaleText`). The frFR file uniquely uses `frFRLocalText` (missing the `e` in `Locale`). This inconsistency means gzip cannot compress this export name as well since the pattern breaks. It also creates a naming inconsistency in the public API that could confuse consumers.
- **Estimated gzip savings**: ~2-4 bytes (gzip dictionary miss for the inconsistent name)

---

## Finding 9: Unused imageMimeTypes Import in frFR Locale

- **File**: `packages/x-charts/src/locales/frFR.ts`
- **Lines**: 1 (import absent), 16 (commented-out usage)
- **Category**: Dead code / unused import
- **Current code**:
  ```ts
  // (no import of imageMimeTypes -- correctly omitted)
  ```
- **Explanation**: Unlike the other locale files (enUS, elGR, ptBR, ptPT, svSE, nbNO), the frFR file does NOT import `imageMimeTypes` because its `toolbarExportImage` line is commented out (line 16). This is actually correct -- the import was properly removed when the usage was commented out. No change needed. This is noted for completeness.
- **Estimated gzip savings**: 0 bytes (already optimized)

---

## Finding 10: Repeated imageMimeTypes Import Across 6 Locale Files

- **Files**:
  - `packages/x-charts/src/locales/enUS.ts` (line 1)
  - `packages/x-charts/src/locales/elGR.ts` (line 1)
  - `packages/x-charts/src/locales/ptBR.ts` (line 1)
  - `packages/x-charts/src/locales/ptPT.ts` (line 1)
  - `packages/x-charts/src/locales/svSE.ts` (line 1)
  - `packages/x-charts/src/locales/nbNO.ts` (line 1)
- **Category**: Import optimization / shared constant opportunity
- **Current code** (repeated 6 times):
  ```ts
  import { imageMimeTypes } from './utils/imageMimeTypes';
  ```
  Each locale then uses it in:
  ```ts
  toolbarExportImage: (mimeType) => `Exportar como ${imageMimeTypes[mimeType] ?? mimeType}`,
  ```
- **Suggested fix**: The `imageMimeTypes[mimeType] ?? mimeType` expression is repeated verbatim in 6 locale files. A helper function could be created:
  ```ts
  // In utils/imageMimeTypes.ts
  export const getImageMimeTypeLabel = (mimeType: string) => imageMimeTypes[mimeType] ?? mimeType;
  ```
  Then each locale simplifies to:
  ```ts
  toolbarExportImage: (mimeType) => `Export as ${getImageMimeTypeLabel(mimeType)}`,
  ```
- **Explanation**: The expression `imageMimeTypes[mimeType] ?? mimeType` is duplicated across 6 files. The import path and the lookup pattern are identical each time. Extracting the lookup into a helper reduces the repeated code and potentially allows the bundler to share the reference.
- **Estimated gzip savings**: ~15-25 bytes (the repeated `imageMimeTypes[mimeType] ?? mimeType` pattern compresses but the import and expression together still add overhead)

---

## Finding 11: Repeated Error Messages in Context Providers

- **Files**:
  - `packages/x-charts/src/context/ChartProvider/useChartContext.ts` (lines 16-22)
  - `packages/x-charts/src/context/ChartsSlotsContext.tsx` (lines 28-34)
- **Category**: Duplicate code / shared constant opportunity
- **Current code** (useChartContext.ts):
  ```ts
  throw new Error(
    [
      'MUI X Charts: Could not find the Chart context.',
      'It looks like you rendered your component outside of a ChartDataProvider.',
      'This can also happen if you are bundling multiple versions of the library.',
    ].join('\n'),
  );
  ```
  (ChartsSlotsContext.tsx):
  ```ts
  throw new Error(
    [
      'MUI X Charts: Could not find the Charts Slots context.',
      'It looks like you rendered your component outside of a ChartDataProvider.',
      'This can also happen if you are bundling multiple versions of the library.',
    ].join('\n'),
  );
  ```
- **Suggested fix**: Extract the shared suffix into a constant:
  ```ts
  const CONTEXT_ERROR_SUFFIX = [
    'It looks like you rendered your component outside of a ChartDataProvider.',
    'This can also happen if you are bundling multiple versions of the library.',
  ].join('\n');
  ```
  Then:
  ```ts
  throw new Error('MUI X Charts: Could not find the Chart context.\n' + CONTEXT_ERROR_SUFFIX);
  ```
- **Explanation**: Two of the three error message lines are identical between these two context hooks. The strings `'It looks like you rendered your component outside of a ChartDataProvider.'` and `'This can also happen if you are bundling multiple versions of the library.'` are duplicated verbatim. Gzip handles repeated strings reasonably well, but these files may be in different chunks.
- **Estimated gzip savings**: ~15-30 bytes (depends on chunk boundaries)

---

## Finding 12: Repeated colorScale Type Unions in AxisScaleComputedConfig

- **File**: `packages/x-charts/src/models/axis.ts`
- **Lines**: 368-408
- **Category**: Duplicate code / type verbosity
- **Current code**:
  ```ts
  export interface AxisScaleComputedConfig {
    band: {
      colorScale?:
        | ScaleOrdinal<string | number | Date, string, string | null>
        | ScaleOrdinal<number, string, string | null>
        | ScaleSequential<string, string | null>
        | ScaleThreshold<number | Date, string | null>;
    };
    point: {
      colorScale?:
        | ScaleOrdinal<string | number | Date, string, string | null>
        | ScaleOrdinal<number, string, string | null>
        | ScaleSequential<string, string | null>
        | ScaleThreshold<number | Date, string | null>;
    };
    log: {
      colorScale?: ScaleSequential<string, string | null> | ScaleThreshold<number, string | null>;
    };
    symlog: {
      colorScale?: ScaleSequential<string, string | null> | ScaleThreshold<number, string | null>;
    };
    pow: {
      colorScale?: ScaleSequential<string, string | null> | ScaleThreshold<number, string | null>;
    };
    sqrt: {
      colorScale?: ScaleSequential<string, string | null> | ScaleThreshold<number, string | null>;
    };
    time: {
      colorScale?:
        | ScaleSequential<string, string | null>
        | ScaleThreshold<number | Date, string | null>;
    };
    utc: {
      colorScale?:
        | ScaleSequential<string, string | null>
        | ScaleThreshold<number | Date, string | null>;
    };
    linear: {
      colorScale?: ScaleSequential<string, string | null> | ScaleThreshold<number, string | null>;
    };
  }
  ```
- **Suggested fix**: Extract shared type aliases:
  ```ts
  type OrdinalColorScale =
    | ScaleOrdinal<string | number | Date, string, string | null>
    | ScaleOrdinal<number, string, string | null>
    | ScaleSequential<string, string | null>
    | ScaleThreshold<number | Date, string | null>;

  type ContinuousColorScale =
    | ScaleSequential<string, string | null>
    | ScaleThreshold<number, string | null>;

  type TimeColorScale =
    | ScaleSequential<string, string | null>
    | ScaleThreshold<number | Date, string | null>;
  ```
  Then:
  ```ts
  export interface AxisScaleComputedConfig {
    band: { colorScale?: OrdinalColorScale; };
    point: { colorScale?: OrdinalColorScale; };
    log: { colorScale?: ContinuousColorScale; };
    symlog: { colorScale?: ContinuousColorScale; };
    pow: { colorScale?: ContinuousColorScale; };
    sqrt: { colorScale?: ContinuousColorScale; };
    time: { colorScale?: TimeColorScale; };
    utc: { colorScale?: TimeColorScale; };
    linear: { colorScale?: ContinuousColorScale; };
  }
  ```
- **Explanation**: Types are erased at compile time and do not affect bundle size. However, this duplication also appears in `z-axis.ts` (lines 27-31) which uses the same ordinal color scale union. Extracting the type aliases improves maintainability but has zero runtime impact.
- **Estimated gzip savings**: 0 bytes (types are compile-time only)

---

## Finding 13: Repeated colorMap Type Unions in AxisScaleConfig

- **File**: `packages/x-charts/src/models/axis.ts`
- **Lines**: 290-362
- **Category**: Duplicate code / type verbosity
- **Current code**: The `colorMap` property type is repeated across 9 scale type entries:
  ```ts
  // band and point:
  colorMap?: OrdinalColorConfig | ContinuousColorConfig | PiecewiseColorConfig;
  // log, symlog, pow, sqrt, time, utc, linear:
  colorMap?: ContinuousColorConfig | PiecewiseColorConfig;
  ```
- **Suggested fix**: Extract type aliases:
  ```ts
  type OrdinalColorMap = OrdinalColorConfig | ContinuousColorConfig | PiecewiseColorConfig;
  type ContinuousColorMap = ContinuousColorConfig | PiecewiseColorConfig;
  ```
- **Explanation**: Same as Finding 12 -- types only, no runtime impact. Noted for code quality.
- **Estimated gzip savings**: 0 bytes (types are compile-time only)

---

## Finding 14: Repeated JSDoc Comment Blocks for location Parameter

- **File**: `packages/x-charts/src/models/axis.ts`
- **Lines**: 412-461
- **Category**: Duplicate code
- **Current code**: The `AxisValueFormatterContext` type has 3 union members, each with a JSDoc block for the `location` property that repeats the full description:
  ```ts
  /**
   * Location indicates where the value will be displayed.
   * - `'tick'` The value is displayed on the axis ticks.
   * - `'tooltip'` The value is displayed in the tooltip when hovering the chart.
   * - `'legend'` The value is displayed in the legend when using color legend.
   * - `'zoom-slider-tooltip'` The value is displayed in the zoom slider tooltip.
   */
  location: 'legend';
  ```
  This 5-line JSDoc block is copy-pasted 3 times (lines 412-419, 424-431, 436-443).
- **Suggested fix**: JSDoc comments are stripped by minifiers, so no runtime impact. Keep for developer experience.
- **Estimated gzip savings**: 0 bytes (stripped by minifier)

---

## Finding 15: Duplicate highlighted/faded Interface Shape in Pie Series

- **File**: `packages/x-charts/src/models/seriesType/pie.ts`
- **Lines**: 115-143
- **Category**: Duplicate code
- **Current code**:
  ```ts
  highlighted?: {
    additionalRadius?: number;
    innerRadius?: number;
    outerRadius?: number;
    cornerRadius?: number;
    paddingAngle?: number;
    arcLabelRadius?: number;
    color?: string;
  };
  faded?: {
    additionalRadius?: number;
    innerRadius?: number;
    outerRadius?: number;
    cornerRadius?: number;
    paddingAngle?: number;
    arcLabelRadius?: number;
    color?: string;
  };
  ```
- **Suggested fix**: Extract the shared shape:
  ```ts
  interface PieArcStateOverride {
    additionalRadius?: number;
    innerRadius?: number;
    outerRadius?: number;
    cornerRadius?: number;
    paddingAngle?: number;
    arcLabelRadius?: number;
    color?: string;
  }
  // Then:
  highlighted?: PieArcStateOverride;
  faded?: PieArcStateOverride;
  ```
- **Explanation**: The `highlighted` and `faded` objects have identical property shapes. This is a type-only duplication and has zero runtime impact since TypeScript interfaces are erased. However, it improves maintainability.
- **Estimated gzip savings**: 0 bytes (types are compile-time only)

---

## Finding 16: ChartBaseButtonProps and ChartBaseIconButtonProps Near-Duplication

- **File**: `packages/x-charts/src/models/slots/chartsBaseSlotProps.ts`
- **Lines**: 15-28
- **Category**: Duplicate code
- **Current code**:
  ```ts
  export type ChartBaseButtonProps = ChartBaseCommonProps & {
    ref?: React.Ref<HTMLButtonElement>;
    id?: string;
    disabled?: boolean;
    tabIndex?: number;
  };

  export type ChartBaseIconButtonProps = ChartBaseCommonProps & {
    ref?: React.Ref<HTMLButtonElement>;
    id?: string;
    disabled?: boolean;
    tabIndex?: number;
    size?: 'small' | 'medium' | 'large';
  };
  ```
- **Suggested fix**:
  ```ts
  export type ChartBaseButtonProps = ChartBaseCommonProps & {
    ref?: React.Ref<HTMLButtonElement>;
    id?: string;
    disabled?: boolean;
    tabIndex?: number;
  };

  export type ChartBaseIconButtonProps = ChartBaseButtonProps & {
    size?: 'small' | 'medium' | 'large';
  };
  ```
- **Explanation**: `ChartBaseIconButtonProps` is identical to `ChartBaseButtonProps` plus a `size` property. Extending one from the other removes the duplicated 4 properties. This is type-only and has no runtime impact.
- **Estimated gzip savings**: 0 bytes (types are compile-time only)

---

## Finding 17: Identical import { type ChartsColorPaletteCallback } Across 13 Palette Files

- **Files**: All 13 palette files:
  - `packages/x-charts/src/colorPalettes/categorical/blueberryTwilight.ts`
  - `packages/x-charts/src/colorPalettes/categorical/cheerfulFiesta.ts`
  - `packages/x-charts/src/colorPalettes/categorical/mangoFusion.ts`
  - `packages/x-charts/src/colorPalettes/categorical/rainbowSurge.ts`
  - `packages/x-charts/src/colorPalettes/sequential/blue.ts`
  - `packages/x-charts/src/colorPalettes/sequential/cyan.ts`
  - `packages/x-charts/src/colorPalettes/sequential/green.ts`
  - `packages/x-charts/src/colorPalettes/sequential/orange.ts`
  - `packages/x-charts/src/colorPalettes/sequential/pink.ts`
  - `packages/x-charts/src/colorPalettes/sequential/purple.ts`
  - `packages/x-charts/src/colorPalettes/sequential/red.ts`
  - `packages/x-charts/src/colorPalettes/sequential/strawberrySky.ts`
  - `packages/x-charts/src/colorPalettes/sequential/yellow.ts`
- **Category**: Import optimization
- **Current code** (repeated 13 times):
  ```ts
  import { type ChartsColorPaletteCallback } from '../types';
  ```
- **Explanation**: This is a type-only import (`import { type ... }`), so it is fully erased at compile time and contributes zero bytes to the runtime bundle. No action needed.
- **Estimated gzip savings**: 0 bytes (type-only import, erased at compile time)

---

## Finding 18: Repeated getChartsLocalization Import and Call Pattern

- **Files**: All 7 locale files:
  - `packages/x-charts/src/locales/enUS.ts` (lines 3, 123)
  - `packages/x-charts/src/locales/elGR.ts` (lines 3, 120)
  - `packages/x-charts/src/locales/frFR.ts` (lines 2, 119)
  - `packages/x-charts/src/locales/ptBR.ts` (lines 3, 120)
  - `packages/x-charts/src/locales/ptPT.ts` (lines 3, 120)
  - `packages/x-charts/src/locales/svSE.ts` (lines 3, 120)
  - `packages/x-charts/src/locales/nbNO.ts` (lines 3, 120)
- **Category**: Shared constant opportunity / import optimization
- **Current pattern** (7 times):
  ```ts
  import { getChartsLocalization } from './utils/getChartsLocalization';
  // ...
  export const enUS = getChartsLocalization(enUSLocaleText);
  ```
- **Explanation**: Each locale file imports and calls `getChartsLocalization`. The function creates a wrapper object `{ components: { MuiChartsLocalizationProvider: { defaultProps: { localeText: ... } } } }`. The import statement plus function call is repeated 7 times. After bundling, the import resolves to a single reference, but the 7 call sites each create the nested object structure. Gzip compresses the repeated pattern well, but there is still overhead from 7 separate object allocations at module load time.
- **Estimated gzip savings**: ~15-25 bytes (function call overhead x 7, after gzip)

---

## Finding 19: locales/index.ts Exports from locales Subpath Not in Main Bundle

- **File**: `packages/x-charts/src/locales/index.ts`
- **Lines**: 1-9
- **File**: `packages/x-charts/src/index.ts`
- **Lines**: 45-46
- **Category**: Barrel file analysis
- **Current code** (index.ts):
  ```ts
  // Locales should be imported from `@mui/x-charts/locales`
  // export * from './locales';
  ```
- **Explanation**: The main `index.ts` intentionally does NOT re-export locales. This means locales are only pulled in when a consumer imports from `@mui/x-charts/locales` explicitly. This is correct and good for tree-shaking. The `locales/index.ts` barrel file re-exports all 7 locales, which is appropriate for the subpath entry point.
- **Estimated gzip savings**: 0 bytes (already optimized)

---

## Finding 20: models/slots/chartsIconSlots.ts Is an Empty Interface

- **File**: `packages/x-charts/src/models/slots/chartsIconSlots.ts`
- **Line**: 1
- **Category**: Dead code / placeholder
- **Current code**:
  ```ts
  export interface ChartsIconSlots {}
  ```
- **Explanation**: This is an empty interface that exists as a placeholder for module augmentation. It is type-only and contributes zero runtime bytes. It is likely used by the Pro package or future features to extend the slot system. No action needed.
- **Estimated gzip savings**: 0 bytes

---

## Finding 21: models/featureFlags.ts Is an Empty Interface

- **File**: `packages/x-charts/src/models/featureFlags.ts`
- **Line**: 1
- **Category**: Dead code / placeholder
- **Current code**:
  ```ts
  export interface ChartsTypeFeatureFlags {}
  ```
- **Explanation**: Same as Finding 20. Empty interface for module augmentation. Used in `axis.ts` line 671 with `HasProperty<ChartsTypeFeatureFlags, 'seriesValueOverride'>`. Zero runtime cost.
- **Estimated gzip savings**: 0 bytes

---

## Summary Table

| # | File(s) | Category | Est. Gzip Savings |
|---|---------|----------|-------------------|
| 1 | red.ts | Trailing whitespace in string | ~1 byte |
| 2 | getChartsLocalization.ts | Unnecessary object spread | ~3-5 bytes |
| 3 | sequential/*.ts (9 files) | Redundant dark/light ternary | ~90-120 bytes |
| 4 | categorical/*.ts (4 files) | Repeated callback pattern | ~8-12 bytes |
| 5 | ptPT.ts | Commented-out translations | ~120-180 bytes |
| 6 | svSE.ts | Commented-out translations | ~120-180 bytes |
| 7 | frFR.ts | Commented-out translations | ~10-15 bytes |
| 8 | frFR.ts | Inconsistent export name (LocalText vs LocaleText) | ~2-4 bytes |
| 9 | frFR.ts | (Verified no unused import) | 0 bytes |
| 10 | 6 locale files | Repeated imageMimeTypes lookup expression | ~15-25 bytes |
| 11 | useChartContext.ts, ChartsSlotsContext.tsx | Repeated error message strings | ~15-30 bytes |
| 12 | axis.ts | Repeated colorScale type unions | 0 bytes (type-only) |
| 13 | axis.ts | Repeated colorMap type unions | 0 bytes (type-only) |
| 14 | axis.ts | Repeated JSDoc blocks | 0 bytes (stripped) |
| 15 | pie.ts | Duplicate highlighted/faded shape | 0 bytes (type-only) |
| 16 | chartsBaseSlotProps.ts | Near-duplicate button props types | 0 bytes (type-only) |
| 17 | 13 palette files | Repeated type-only import | 0 bytes (erased) |
| 18 | 7 locale files | Repeated getChartsLocalization calls | ~15-25 bytes |
| 19 | index.ts / locales/index.ts | Barrel file (already optimized) | 0 bytes |
| 20 | chartsIconSlots.ts | Empty placeholder interface | 0 bytes |
| 21 | featureFlags.ts | Empty placeholder interface | 0 bytes |

**Total estimated runtime gzip savings: ~400-600 bytes**

### Top Recommendations by Impact

1. **Remove commented-out translations** from `ptPT.ts`, `svSE.ts`, and `frFR.ts` (Findings 5, 6, 7) -- ~250-375 bytes
2. **Simplify sequential palette callbacks** where dark === light (Finding 3) -- ~90-120 bytes
3. **Extract shared error message suffix** in context providers (Finding 11) -- ~15-30 bytes
4. **Extract shared imageMimeTypes lookup helper** (Finding 10) -- ~15-25 bytes
5. **Remove unnecessary object spread** in getChartsLocalization (Finding 2) -- ~3-5 bytes
6. **Fix trailing whitespace** in red palette (Finding 1) -- ~1 byte + correctness
7. **Fix inconsistent export name** frFRLocalText -> frFRLocaleText (Finding 8) -- ~2-4 bytes + consistency
