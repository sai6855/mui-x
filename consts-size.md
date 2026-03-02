# Constants Defined Inside Loops — x-data-grid Packages

This document catalogs all cases in `x-data-grid`, `x-data-grid-pro`, and `x-data-grid-premium`
where constant object/array literals are defined inside loop bodies. Hoisting them to module-level
(or pre-loop) constants reduces per-iteration allocations and GC pressure, and eliminates redundant
property-name strings when the same shape appears in multiple loops.

---

## x-data-grid

### `packages/x-data-grid/src/hooks/features/export/serializers/csvSerializer.ts`

**Loop:** `for (let i = 0; i < maxColumnGroupsDepth; i += 1)` (line 187)

**Constant inside loop (lines 188–191):**
```ts
const headerGroupRow = new CSVRow({
  csvOptions,
  sanitizeCellValue,
});
```

**Why moveable:** `csvOptions` and `sanitizeCellValue` are captured from the outer function scope
and do not change between iterations. The config object `{ csvOptions, sanitizeCellValue }` is
recreated on every pass.

**Suggested fix:**
```ts
const csvRowConfig = { csvOptions, sanitizeCellValue };
for (let i = 0; i < maxColumnGroupsDepth; i += 1) {
  const headerGroupRow = new CSVRow(csvRowConfig);
  …
}
```

---

## x-data-grid-pro

### `packages/x-data-grid-pro/src/hooks/features/lazyLoader/useGridLazyLoaderPreProcessors.tsx`

**Loop:** `for (let i = 0; i < props.rowCount - rootGroup.children.length; i += 1)` (line 31)

**Constant inside loop (lines 36–41):**
```ts
const skeletonRowNode: GridSkeletonRowNode = {
  type: 'skeletonRow',
  id: skeletonId,
  parent: GRID_ROOT_GROUP_ID,
  depth: 0,
};
```

**Why moveable:** `type`, `parent`, and `depth` are identical on every iteration. Only `id` varies.

**Suggested fix:**
```ts
const SKELETON_ROW_BASE = {
  type: 'skeletonRow' as const,
  parent: GRID_ROOT_GROUP_ID,
  depth: 0,
} as const;

// inside loop:
const skeletonRowNode: GridSkeletonRowNode = { ...SKELETON_ROW_BASE, id: skeletonId };
```

---

### `packages/x-data-grid-pro/src/hooks/features/serverSideLazyLoader/useGridDataSourceLazyLoader.ts`

**Loop 1:** `for (let i = 0; i < rootChildrenCount; i += 1)` (line 164)

**Constant (lines 178–183):**
```ts
const skeletonRowNode: GridSkeletonRowNode = {
  type: 'skeletonRow',
  id: rowId,
  parent: GRID_ROOT_GROUP_ID,
  depth: 0,
};
```

**Loop 2:** `for (let i = 0; i < pageRowCount - rootChildrenCount; i += 1)` (line 192)

**Constant (lines 196–201):**
```ts
const skeletonRowNode: GridSkeletonRowNode = {
  type: 'skeletonRow',
  id: skeletonId,
  parent: GRID_ROOT_GROUP_ID,
  depth: 0,
};
```

**Why moveable:** Both loops construct the identical shape; `type`, `parent`, and `depth` are static
across all iterations in both loops. Only `id` differs.

**Suggested fix:** A single module-level `SKELETON_ROW_BASE` constant (same shape as above),
spread + dynamic `id` inside each loop body.

```ts
const SKELETON_ROW_BASE = {
  type: 'skeletonRow' as const,
  parent: GRID_ROOT_GROUP_ID,
  depth: 0,
} as const;

// loop 1:
const skeletonRowNode: GridSkeletonRowNode = { ...SKELETON_ROW_BASE, id: rowId };

// loop 2:
const skeletonRowNode: GridSkeletonRowNode = { ...SKELETON_ROW_BASE, id: skeletonId };
```

---

## x-data-grid-premium

### `packages/x-data-grid-premium/src/hooks/features/pivoting/utils.ts`

#### Instance A — `emptyColumn` inside `for` loop

**Loop:** `for (let i = 0; i < columnGroups.length; i += 1)` (line 310)

**Constant (lines 321–330):**
```ts
const emptyColumn: GridColDef = {
  field: emptyColumnField,      // dynamic
  headerName: '',               // static
  sortable: false,              // static
  filterable: false,            // static
  groupable: false,             // static
  aggregable: false,            // static
  hideable: false,              // static
  disableColumnMenu: true,      // static
};
```

**Why moveable:** 7 out of 8 properties are static. Only `field` changes per iteration.

**Suggested fix:**
```ts
const EMPTY_PIVOT_COLUMN_DEFAULTS = {
  headerName: '',
  sortable: false,
  filterable: false,
  groupable: false,
  aggregable: false,
  hideable: false,
  disableColumnMenu: true,
} as const;

// inside loop:
const emptyColumn: GridColDef = { ...EMPTY_PIVOT_COLUMN_DEFAULTS, field: emptyColumnField };
```

---

#### Instance B — `column` inside `visibleValues.forEach`

**Loop:** `visibleValues.forEach((pivotValue) => { … })` (line 336)

**Constant (lines 343–357):**
```ts
const column: GridColDef = {
  headerName: String(valueField),                        // dynamic
  ...getAttributesFromInitialColumn(pivotValue.field),   // dynamic
  ...overrides,                                          // dynamic
  type: 'number',          // static
  field: mapValueKey,      // dynamic
  aggregable: false,       // static
  groupable: false,        // static
  filterable: false,       // static
  hideable: false,         // static
  editable: false,         // static
  disableReorder: true,    // static
  availableAggregationFunctions: [pivotValue.aggFunc],   // dynamic
};
```

**Why moveable:** 6 boolean flags + `type: 'number'` are static across all iterations.

**Suggested fix:**
```ts
const PIVOT_VALUE_COLUMN_DEFAULTS = {
  type: 'number' as const,
  aggregable: false,
  groupable: false,
  filterable: false,
  hideable: false,
  editable: false,
  disableReorder: true,
} as const;

// inside forEach:
const column: GridColDef = {
  headerName: String(valueField),
  ...getAttributesFromInitialColumn(pivotValue.field),
  ...overrides,
  ...PIVOT_VALUE_COLUMN_DEFAULTS,
  field: mapValueKey,
  availableAggregationFunctions: [pivotValue.aggFunc],
};
```

---

### `packages/x-data-grid-premium/src/hooks/features/dataSource/utils.ts`

**Loop:** Nested `visiblePivotValues.forEach((pivotValue) => { … })` (line 84)

**Constant (lines 91–100):**
```ts
const newColumnDef = {
  ...originalColumn,    // dynamic
  ...overrides,         // dynamic
  aggregable: false,    // static
  groupable: false,     // static
  filterable: false,    // static
  hideable: false,      // static
  editable: false,      // static
  disableReorder: true, // static
} as GridColDef;
```

**Why moveable:** The six boolean flags are identical on every iteration and match the pattern in
`pivoting/utils.ts` Instance B.

**Suggested fix:** Extract the same `PIVOT_VALUE_COLUMN_DEFAULTS` constant (or share it via import):
```ts
const PIVOT_COLUMN_STATIC_OVERRIDES = {
  aggregable: false,
  groupable: false,
  filterable: false,
  hideable: false,
  editable: false,
  disableReorder: true,
} as const;

// inside forEach:
const newColumnDef = {
  ...originalColumn,
  ...overrides,
  ...PIVOT_COLUMN_STATIC_OVERRIDES,
} as GridColDef;
```

---

## Summary

| File | Loop type | Constant(s) inside loop | Static fields moveable |
|------|-----------|-------------------------|------------------------|
| `x-data-grid/csvSerializer.ts` | `for` | `{ csvOptions, sanitizeCellValue }` config | All (2 fields) |
| `x-data-grid-pro/useGridLazyLoaderPreProcessors.tsx` | `for` | `GridSkeletonRowNode` | `type`, `parent`, `depth` (3 / 4 fields) |
| `x-data-grid-pro/useGridDataSourceLazyLoader.ts` | `for` ×2 | `GridSkeletonRowNode` (same shape in both loops) | `type`, `parent`, `depth` (3 / 4 fields) |
| `x-data-grid-premium/pivoting/utils.ts` | `for` | `emptyColumn` GridColDef | 7 / 8 fields |
| `x-data-grid-premium/pivoting/utils.ts` | `forEach` | `column` GridColDef | `type` + 6 boolean flags |
| `x-data-grid-premium/dataSource/utils.ts` | `forEach` (nested) | `newColumnDef` GridColDef | 6 boolean flags (same shape as above) |
