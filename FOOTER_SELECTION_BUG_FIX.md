# Footer Selection Bug Fix - Issue #18426

## Problem Description

In MUI X DataGrid Premium, when using "Select All" checkbox followed by applying a quick filter, the number of selected rows disappears from the footer. This issue doesn't occur in the Community version.

## Root Cause

The issue was caused by the aggregation feature being enabled by default in Premium (`disableAggregation: false`). When aggregation is active:

1. Footer rows are automatically added to the row tree for aggregation purposes
2. These footer rows are included in the `gridFilteredRowCountSelector` count
3. However, footer rows cannot be selected (they are explicitly excluded in the selection logic)
4. This creates a mismatch in the `gridRowSelectionCountSelector` calculation

When using "exclude" selection mode (which is used after selecting all rows), the calculation was:
```typescript
return filteredRowCount - selection.ids.size;
```

If `filteredRowCount` includes non-selectable footer rows, but `selection.ids.size` only includes selectable rows, the result could be 0 or negative, causing the selected row count to not display.

## Solution

Modified `gridRowSelectionCountSelector` in `packages/x-data-grid/src/hooks/features/rowSelection/gridRowSelectionSelector.ts` to:

1. Use `gridFilteredSortedRowEntriesSelector` and `gridRowTreeSelector` instead of just `gridFilteredRowCountSelector`
2. Filter out footer and pinned rows when calculating the selectable row count
3. Only count selectable rows in the exclude selection calculation

### Changes Made

```typescript
// Before
export const gridRowSelectionCountSelector = createSelector(
  gridRowSelectionStateSelector,
  gridFilteredRowCountSelector,
  (selection, filteredRowCount) => {
    if (selection.type === 'include') {
      return selection.ids.size;
    }
    return filteredRowCount - selection.ids.size;
  },
);

// After  
export const gridRowSelectionCountSelector = createSelectorMemoized(
  gridRowSelectionStateSelector,
  gridFilteredSortedRowEntriesSelector,
  gridRowTreeSelector,
  (selection, filteredSortedRowEntries, rowTree) => {
    if (selection.type === 'include') {
      return selection.ids.size;
    }
    // In exclude selection, count only selectable rows (excluding footer and pinned rows).
    const selectableFilteredRowCount = filteredSortedRowEntries.filter((row: any) => {
      const rowNode = rowTree[row.id];
      return rowNode?.type !== 'footer' && rowNode?.type !== 'pinnedRow';
    }).length;
    return selectableFilteredRowCount - selection.ids.size;
  },
);
```

## Testing

To test this fix:
1. Create a DataGridPremium with `checkboxSelection: true`
2. Click "Select All" checkbox
3. Apply a quick filter
4. Verify that the selected row count remains visible in the footer

## Impact

This fix ensures consistent behavior between Community and Premium versions when displaying selected row counts after filtering, while maintaining all existing functionality for aggregation and other Premium features.