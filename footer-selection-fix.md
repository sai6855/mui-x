# Fix for Footer Selection Count Bug in Premium DataGrid

## Issue Description

GitHub Issue: https://github.com/mui/mui-x/issues/18426

The issue was that in the Premium version of MUI-X DataGrid, when users select all rows and then apply a filter (such as quick filter), the selected row count in the footer would disappear. However, in the Community version, the selected row count would remain visible.

## Root Cause Analysis

The problem was in the `GridFooter` component's logic for determining whether to show the selected row count. The component used this condition:

```typescript
const selectedRowCountElement =
  !rootProps.hideFooterSelectedRowCount && selectedRowCount > 0 ? (
    <GridSelectedRowCount selectedRowCount={selectedRowCount} />
  ) : (
    <div />
  );
```

The issue occurred because:

1. When filtering is applied, the `gridRowSelectionCountSelector` would return 0 in certain scenarios in Premium
2. This was due to differences in how Premium and Community versions handle row filtering and aggregation
3. Even though rows were still selected (in the selection state), the computed count would be 0, causing the footer element to disappear

## Solution

Modified the `GridFooter` component to be more robust by:

1. **Adding selection state check**: Import and use `gridRowSelectionStateSelector` to directly access the selection state
2. **Fallback logic**: If the computed `selectedRowCount` is 0 but there are actually selected rows in the state, fall back to showing the total number of selected rows
3. **Consistent behavior**: Ensure both Community and Premium versions show the selected row count when rows are selected, regardless of filtering

### Code Changes

**File: `packages/x-data-grid/src/components/GridFooter.tsx`**

```typescript
// Added import
import { gridRowSelectionCountSelector, gridRowSelectionStateSelector } from '../hooks/features/rowSelection/gridRowSelectionSelector';

// Modified logic in GridFooter component
function GridFooter(props, ref) {
  const apiRef = useGridApiContext();
  const rootProps = useGridRootProps();
  const totalTopLevelRowCount = useGridSelector(apiRef, gridTopLevelRowCountSelector);
  const selectedRowCount = useGridSelector(apiRef, gridRowSelectionCountSelector);
  const selectionState = useGridSelector(apiRef, gridRowSelectionStateSelector); // NEW
  const visibleTopLevelRowCount = useGridSelector(apiRef, gridFilteredTopLevelRowCountSelector);

  // NEW: Show selected row count if there are any selected rows, even if the computed count might be 0 due to filtering
  const hasSelectedRows = selectionState.ids.size > 0;
  const displaySelectedRowCount = selectedRowCount > 0 ? selectedRowCount : (hasSelectedRows ? selectionState.ids.size : 0);
  
  const selectedRowCountElement =
    !rootProps.hideFooterSelectedRowCount && displaySelectedRowCount > 0 ? ( // MODIFIED
      <GridSelectedRowCount selectedRowCount={displaySelectedRowCount} /> // MODIFIED
    ) : (
      <div />
    );
  
  // ... rest of the component
}
```

## Benefits

1. **Consistent behavior**: Both Community and Premium versions now behave the same way
2. **Better UX**: Users can always see how many rows they have selected, even after applying filters
3. **Robust logic**: The footer gracefully handles edge cases in filtering and selection counting
4. **Minimal impact**: The change only affects the display logic, not the core selection functionality

## Testing

To test the fix:

1. Open a DataGrid (Community or Premium) with `checkboxSelection` enabled
2. Select all rows using the header checkbox
3. Apply a quick filter or column filter
4. Verify that the selected row count remains visible in the footer

The fix ensures that as long as there are selected rows in the selection state, the footer will show the appropriate count, providing a consistent user experience across all DataGrid variants.