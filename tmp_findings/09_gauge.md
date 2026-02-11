# Gauge Directory - Gzip Bundle Size Optimization Findings

**Directory:** `packages/x-charts/src/Gauge/`
**Files Analyzed:** 10 (9 source + 1 test)

---

## Finding 1: Duplicate PropTypes Definitions Between Gauge.tsx and GaugeContainer.tsx

**Priority:** CRITICAL
**Files:**
- `packages/x-charts/src/Gauge/Gauge.tsx` (lines 39-145)
- `packages/x-charts/src/Gauge/GaugeContainer.tsx` (lines 96-200)

**Issue:** Nearly identical PropTypes blocks (~105 lines each) are defined in both files. Both define the same 20+ property validators with identical validation patterns and JSDoc comments. The only differences are that `Gauge.tsx` has two extra properties (`classes` and `text`).

**Current Code (Gauge.tsx, lines 39-145):**
```typescript
Gauge.propTypes = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // | To update them edit the TypeScript types and run "pnpm proptypes"  |
  // ----------------------------------------------------------------------
  children: PropTypes.node,
  classes: PropTypes.object,
  className: PropTypes.string,
  cornerRadius: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  cx: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  cy: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  desc: PropTypes.string,
  endAngle: PropTypes.number,
  height: PropTypes.number,
  id: PropTypes.string,
  innerRadius: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  margin: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({
      bottom: PropTypes.number,
      left: PropTypes.number,
      right: PropTypes.number,
      top: PropTypes.number,
    }),
  ]),
  outerRadius: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  skipAnimation: PropTypes.bool,
  startAngle: PropTypes.number,
  sx: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool])),
    PropTypes.func,
    PropTypes.object,
  ]),
  text: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  title: PropTypes.string,
  value: PropTypes.number,
  valueMax: PropTypes.number,
  valueMin: PropTypes.number,
  width: PropTypes.number,
} as any;
```

**Current Code (GaugeContainer.tsx, lines 96-200) -- identical except missing `classes` and `text`.**

**Suggested Fix:** Note that PropTypes are auto-generated (`pnpm proptypes`), so this duplication is a structural artifact. However, if the generator could be configured to extract shared PropTypes into a constant, both files could reference it:
```typescript
// shared constant (e.g. in gaugeClasses.ts or a new gaugePropTypes.ts)
const baseGaugePropTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  cornerRadius: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  cx: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  cy: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  // ... all shared props
};

// Gauge.tsx
Gauge.propTypes = {
  ...baseGaugePropTypes,
  classes: PropTypes.object,
  text: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
} as any;

// GaugeContainer.tsx
GaugeContainer.propTypes = baseGaugePropTypes as any;
```

**Estimated Gzip Savings:** ~200-400 bytes (gzip already deduplicates repeated patterns well, but this much duplication still has cost in dictionary references and structural overhead)

---

## Finding 2: Duplicate StyledPath Definitions

**Priority:** HIGH
**Files:**
- `packages/x-charts/src/Gauge/GaugeReferenceArc.tsx` (lines 9-14)
- `packages/x-charts/src/Gauge/GaugeValueArc.tsx` (lines 11-16)

**Issue:** Two nearly identical `styled('path', ...)` definitions with the same structure -- only the `slot` name and fill color differ.

**Current Code (GaugeReferenceArc.tsx, lines 9-14):**
```typescript
const StyledPath = styled('path', {
  name: 'MuiGauge',
  slot: 'ReferenceArc',
})(({ theme }) => ({
  fill: (theme.vars || theme).palette.divider,
}));
```

**Current Code (GaugeValueArc.tsx, lines 11-16):**
```typescript
const StyledPath = styled('path', {
  name: 'MuiGauge',
  slot: 'ValueArc',
})(({ theme }) => ({
  fill: (theme.vars || theme).palette.primary.main,
}));
```

**Suggested Fix:** Both share the pattern `styled('path', { name: 'MuiGauge', slot: ... })(({ theme }) => ({ fill: ... }))`. A factory helper would save repetition:
```typescript
// In a shared file (e.g. gaugeStyledComponents.ts)
import { styled } from '@mui/material/styles';

export const createGaugeStyledPath = (
  slot: string,
  getFill: (theme: any) => string,
) =>
  styled('path', { name: 'MuiGauge', slot })(({ theme }) => ({
    fill: getFill(theme.vars || theme),
  }));

// GaugeReferenceArc.tsx
const StyledPath = createGaugeStyledPath('ReferenceArc', (t) => t.palette.divider);

// GaugeValueArc.tsx
const StyledPath = createGaugeStyledPath('ValueArc', (t) => t.palette.primary.main);
```

**Estimated Gzip Savings:** ~80-150 bytes

---

## Finding 3: Duplicate Value Angle Calculation

**Priority:** HIGH
**Files:**
- `packages/x-charts/src/Gauge/GaugeValueArc.tsx` (lines 39-40)
- `packages/x-charts/src/Gauge/GaugeProvider.tsx` (lines 190-194)

**Issue:** The value angle is computed in GaugeProvider and stored in context as `valueAngle`, but GaugeValueArc recalculates it from scratch instead of using the context value.

**Current Code (GaugeValueArc.tsx, lines 22-40):**
```typescript
const {
  value,
  valueMin,
  valueMax,
  startAngle,
  endAngle,
  outerRadius,
  innerRadius,
  cornerRadius,
  cx,
  cy,
} = useGaugeState();

if (value === null) {
  return null;
}

const valueAngle =
  startAngle + ((value - valueMin) / (valueMax - valueMin)) * (endAngle - startAngle);
```

**Current Code (GaugeProvider.tsx, lines 190-194) -- already computes this in context:**
```typescript
valueAngle:
  value === null
    ? null
    : startAngleRad +
      ((endAngleRad - startAngleRad) * (value - valueMin)) / (valueMax - valueMin),
```

**Suggested Fix:** Use the already-computed `valueAngle` from context:
```typescript
function GaugeValueArc({
  className,
  ...other
}: React.ComponentProps<'path'> & { skipAnimation?: boolean }) {
  const {
    valueAngle,
    startAngle,
    outerRadius,
    innerRadius,
    cornerRadius,
    cx,
    cy,
  } = useGaugeState();

  if (valueAngle === null) {
    return null;
  }

  return (
    <AnimatedGaugeValueArc
      {...other}
      className={clsx(gaugeClasses.valueArc, className)}
      cx={cx}
      cy={cy}
      startAngle={startAngle}
      endAngle={valueAngle}
      cornerRadius={cornerRadius}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
    />
  );
}
```

This removes the need for `value`, `valueMin`, `valueMax`, and `endAngle` destructuring as well as the entire angle calculation line.

**Estimated Gzip Savings:** ~80-120 bytes

---

## Finding 4: Repeated String Literal 'MuiGauge'

**Priority:** MEDIUM
**Files:**
- `packages/x-charts/src/Gauge/GaugeReferenceArc.tsx` (line 10): `name: 'MuiGauge'`
- `packages/x-charts/src/Gauge/GaugeValueArc.tsx` (line 12): `name: 'MuiGauge'`
- `packages/x-charts/src/Gauge/gaugeClasses.ts` (line 18): `generateUtilityClass('MuiGauge', slot)`
- `packages/x-charts/src/Gauge/gaugeClasses.ts` (line 21): `generateUtilityClasses('MuiGauge', [...])`

**Issue:** The string `'MuiGauge'` appears 4 times across 3 files. Gzip does handle repeated strings, but when spread across files that may be in different chunks, it can cause redundancy.

**Current Code:**
```typescript
// gaugeClasses.ts line 18
return generateUtilityClass('MuiGauge', slot);
// gaugeClasses.ts line 21
export const gaugeClasses: GaugeClasses = generateUtilityClasses('MuiGauge', [
// GaugeReferenceArc.tsx line 10
name: 'MuiGauge',
// GaugeValueArc.tsx line 12
name: 'MuiGauge',
```

**Suggested Fix:** Export a constant from `gaugeClasses.ts` and import it in the other files:
```typescript
// gaugeClasses.ts
const GAUGE_COMPONENT_NAME = 'MuiGauge';

export function getGaugeUtilityClass(slot: string): string {
  return generateUtilityClass(GAUGE_COMPONENT_NAME, slot);
}

export const gaugeClasses: GaugeClasses = generateUtilityClasses(GAUGE_COMPONENT_NAME, [
  'root',
  'valueArc',
  'referenceArc',
  'valueText',
]);

export { GAUGE_COMPONENT_NAME };

// GaugeReferenceArc.tsx / GaugeValueArc.tsx
import { gaugeClasses, GAUGE_COMPONENT_NAME } from './gaugeClasses';
// ...
const StyledPath = styled('path', {
  name: GAUGE_COMPONENT_NAME,
  slot: 'ReferenceArc',
})(...);
```

**Estimated Gzip Savings:** ~40-80 bytes

---

## Finding 5: Redundant `shouldForwardProp: undefined` in Styled Component

**Priority:** LOW
**File:** `packages/x-charts/src/Gauge/GaugeContainer.tsx` (line 26)

**Issue:** Setting `shouldForwardProp: undefined` is the same as omitting it entirely. This is dead configuration.

**Current Code (lines 24-31):**
```typescript
const GStyled = styled('g', {
  slot: 'internal',
  shouldForwardProp: undefined,
})(({ theme }) => ({
  '& text': {
    fill: (theme.vars || theme).palette.text.primary,
  },
}));
```

**Suggested Fix:**
```typescript
const GStyled = styled('g', {
  slot: 'internal',
})(({ theme }) => ({
  '& text': {
    fill: (theme.vars || theme).palette.text.primary,
  },
}));
```

**Estimated Gzip Savings:** ~25-35 bytes

---

## Finding 6: Inlinable defaultFormatter Function

**Priority:** LOW
**File:** `packages/x-charts/src/Gauge/GaugeValueText.tsx` (lines 18-20)

**Issue:** Named `defaultFormatter` function is only used once as a default parameter value. It could be inlined to save the function declaration overhead.

**Current Code (lines 18-22):**
```typescript
function defaultFormatter({ value }: GaugeFormatterParams) {
  return value === null ? null : value.toLocaleString();
}
function GaugeValueText(props: GaugeValueTextProps) {
  const { text = defaultFormatter, className, ...other } = props;
```

**Suggested Fix:**
```typescript
function GaugeValueText(props: GaugeValueTextProps) {
  const {
    text = (({ value }) => value === null ? null : value.toLocaleString()) as GaugeValueTextProps['text'],
    className,
    ...other
  } = props;
```

**Note:** This has a tradeoff -- the inline version creates a new function reference on each render (unless hoisted by the bundler). The current approach is actually better for React performance because `defaultFormatter` is a stable reference. **Recommend keeping as-is unless bundle size is critical.**

**Estimated Gzip Savings:** ~30-50 bytes (but may hurt runtime performance)

---

## Finding 7: Repeated `(theme.vars || theme).palette` Pattern

**Priority:** LOW
**Files:**
- `packages/x-charts/src/Gauge/GaugeContainer.tsx` (line 29): `(theme.vars || theme).palette.text.primary`
- `packages/x-charts/src/Gauge/GaugeReferenceArc.tsx` (line 13): `(theme.vars || theme).palette.divider`
- `packages/x-charts/src/Gauge/GaugeValueArc.tsx` (line 15): `(theme.vars || theme).palette.primary.main`

**Issue:** The expression `(theme.vars || theme).palette` is repeated 3 times across 3 files.

**Current Code:**
```typescript
// GaugeContainer.tsx line 29
fill: (theme.vars || theme).palette.text.primary,
// GaugeReferenceArc.tsx line 13
fill: (theme.vars || theme).palette.divider,
// GaugeValueArc.tsx line 15
fill: (theme.vars || theme).palette.primary.main,
```

**Suggested Fix:** If using Finding 2's factory approach, this would be resolved. Otherwise, a shared helper:
```typescript
// utils.ts or shared
const getPalette = (theme: Theme) => (theme.vars || theme).palette;
```

**Estimated Gzip Savings:** ~30-50 bytes (gzip already handles this pattern somewhat; only meaningful if combined with Finding 2)

---

## Finding 8: Repeated Destructuring of useGaugeState

**Priority:** LOW
**Files:**
- `packages/x-charts/src/Gauge/GaugeReferenceArc.tsx` (line 17): Destructures 7 properties
- `packages/x-charts/src/Gauge/GaugeValueArc.tsx` (lines 22-33): Destructures 10 properties
- `packages/x-charts/src/Gauge/GaugeValueText.tsx` (line 24): Destructures 5 properties

**Issue:** Large destructuring of the same context object repeated across files. Gzip handles this reasonably well since the property names are shared, but there is still overhead.

**Current Code (GaugeReferenceArc.tsx, line 17):**
```typescript
const { startAngle, endAngle, outerRadius, innerRadius, cornerRadius, cx, cy } = useGaugeState();
```

**Current Code (GaugeValueArc.tsx, lines 22-33):**
```typescript
const {
  value,
  valueMin,
  valueMax,
  startAngle,
  endAngle,
  outerRadius,
  innerRadius,
  cornerRadius,
  cx,
  cy,
} = useGaugeState();
```

**Suggested Fix:** If Finding 3 is implemented (using `valueAngle` from context), the GaugeValueArc destructuring shrinks significantly. No further optimization needed beyond that.

**Estimated Gzip Savings:** ~20-40 bytes (only if Finding 3 is also applied)

---

## Finding 9: Verbose Object Pattern in getAvailableRadius

**Priority:** LOW
**File:** `packages/x-charts/src/Gauge/utils.ts` (lines 62-86)

**Issue:** The `getAvailableRadius` function creates an array of objects with `ratio` and `space` properties, then maps over them. This could use a more compact representation.

**Current Code (lines 62-86):**
```typescript
return Math.min(
  ...[
    {
      ratio: Math.abs(minX),
      space: cx,
    },
    {
      ratio: Math.abs(maxX),
      space: width - cx,
    },
    {
      ratio: Math.abs(minY),
      space: cy,
    },
    {
      ratio: Math.abs(maxY),
      space: height - cy,
    },
  ].map(({ ratio, space }) => {
    if (ratio < 0.00001) {
      return Infinity;
    }
    return space / ratio;
  }),
);
```

**Suggested Fix:** Use tuple arrays instead of objects:
```typescript
const pairs: [number, number][] = [
  [Math.abs(minX), cx],
  [Math.abs(maxX), width - cx],
  [Math.abs(minY), cy],
  [Math.abs(maxY), height - cy],
];
return Math.min(...pairs.map(([ratio, space]) =>
  ratio < 0.00001 ? Infinity : space / ratio
));
```

**Estimated Gzip Savings:** ~40-70 bytes

---

## Finding 10: Repeated `.map(([x]) => x)` and `.map(([, y]) => y)` in getArcRatios

**Priority:** LOW
**File:** `packages/x-charts/src/Gauge/utils.ts` (lines 30-33)

**Issue:** Four separate `.map()` calls iterate over the same array to extract x and y coordinates separately, creating 4 intermediate arrays.

**Current Code (lines 30-33):**
```typescript
const minX = Math.min(...points.map(([x]) => x));
const maxX = Math.max(...points.map(([x]) => x));
const minY = Math.min(...points.map(([, y]) => y));
const maxY = Math.max(...points.map(([, y]) => y));
```

**Suggested Fix:** Use a single loop to compute all four values:
```typescript
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const [x, y] of points) {
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
}
```

This is both more compact and more performant (single pass instead of 4 passes with 4 temporary arrays).

**Estimated Gzip Savings:** ~50-80 bytes

---

## Finding 11: `value === null ? undefined : value` Verbose Ternary

**Priority:** NEGLIGIBLE
**File:** `packages/x-charts/src/Gauge/GaugeContainer.tsx` (line 83)

**Issue:** Verbose null-to-undefined mapping.

**Current Code (line 83):**
```typescript
aria-valuenow={value === null ? undefined : value}
```

**Suggested Fix:** Use nullish coalescing:
```typescript
aria-valuenow={value ?? undefined}
```

**Estimated Gzip Savings:** ~10-15 bytes

---

## Summary Table

| # | Finding | File(s) | Est. Gzip Savings | Priority |
|---|---------|---------|-------------------|----------|
| 1 | Duplicate PropTypes definitions | Gauge.tsx, GaugeContainer.tsx | 200-400 bytes | CRITICAL |
| 2 | Duplicate StyledPath definitions | GaugeReferenceArc.tsx, GaugeValueArc.tsx | 80-150 bytes | HIGH |
| 3 | Duplicate value angle calculation | GaugeValueArc.tsx, GaugeProvider.tsx | 80-120 bytes | HIGH |
| 4 | Repeated 'MuiGauge' string literal | gaugeClasses.ts, GaugeReferenceArc.tsx, GaugeValueArc.tsx | 40-80 bytes | MEDIUM |
| 5 | Redundant shouldForwardProp: undefined | GaugeContainer.tsx | 25-35 bytes | LOW |
| 6 | Inlinable defaultFormatter | GaugeValueText.tsx | 30-50 bytes | LOW |
| 7 | Repeated (theme.vars \|\| theme).palette | GaugeContainer.tsx, GaugeReferenceArc.tsx, GaugeValueArc.tsx | 30-50 bytes | LOW |
| 8 | Repeated useGaugeState destructuring | GaugeReferenceArc.tsx, GaugeValueArc.tsx, GaugeValueText.tsx | 20-40 bytes | LOW |
| 9 | Verbose object pattern in getAvailableRadius | utils.ts | 40-70 bytes | LOW |
| 10 | Repeated .map() calls in getArcRatios | utils.ts | 50-80 bytes | LOW |
| 11 | Verbose null-to-undefined ternary | GaugeContainer.tsx | 10-15 bytes | NEGLIGIBLE |
| | **Total** | | **605-1,090 bytes** | |

---

## Files Analyzed

1. `packages/x-charts/src/Gauge/Gauge.tsx` (147 lines)
2. `packages/x-charts/src/Gauge/GaugeContainer.tsx` (202 lines)
3. `packages/x-charts/src/Gauge/GaugeProvider.tsx` (216 lines)
4. `packages/x-charts/src/Gauge/GaugeReferenceArc.tsx` (35 lines)
5. `packages/x-charts/src/Gauge/GaugeValueArc.tsx` (116 lines)
6. `packages/x-charts/src/Gauge/GaugeValueText.tsx` (68 lines)
7. `packages/x-charts/src/Gauge/gaugeClasses.ts` (27 lines)
8. `packages/x-charts/src/Gauge/utils.ts` (88 lines)
9. `packages/x-charts/src/Gauge/index.ts` (8 lines)
10. `packages/x-charts/src/Gauge/Gauge.test.tsx` (27 lines) -- test file, no optimizations needed

## Notes

- Finding 1 (PropTypes) is auto-generated by `pnpm proptypes`. Changes would need to either modify the generator or be re-applied after each generation. This limits the practical applicability of that finding.
- Finding 6 (inlining defaultFormatter) has a runtime performance tradeoff: the current named function is a stable reference, while an inline arrow would create a new reference each render. Recommend keeping as-is.
- Finding 3 (duplicate angle calculation) is the most impactful change that is safe, clean, and clearly removes dead computation.
