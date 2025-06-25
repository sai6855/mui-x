import * as React from 'react';
import PropTypes from 'prop-types';
import { forwardRef } from '@mui/x-internals/forwardRef';
import { useGridSelector } from '../hooks/utils/useGridSelector';
import { gridTopLevelRowCountSelector, gridRowTreeSelector } from '../hooks/features/rows/gridRowsSelector';
import { gridRowSelectionCountSelector, gridRowSelectionStateSelector } from '../hooks/features/rowSelection/gridRowSelectionSelector';
import { gridFilteredTopLevelRowCountSelector, gridFilteredSortedRowEntriesSelector } from '../hooks/features/filter/gridFilterSelector';
import { useGridApiContext } from '../hooks/utils/useGridApiContext';
import { GridSelectedRowCount } from './GridSelectedRowCount';
import { GridFooterContainer, GridFooterContainerProps } from './containers/GridFooterContainer';
import { useGridRootProps } from '../hooks/utils/useGridRootProps';

const GridFooter = forwardRef<HTMLDivElement, GridFooterContainerProps>(
  function GridFooter(props, ref) {
    const apiRef = useGridApiContext();
    const rootProps = useGridRootProps();
    const totalTopLevelRowCount = useGridSelector(apiRef, gridTopLevelRowCountSelector);
    const baseSelectedRowCount = useGridSelector(apiRef, gridRowSelectionCountSelector);
    const visibleTopLevelRowCount = useGridSelector(apiRef, gridFilteredTopLevelRowCountSelector);
    
    // Get additional selectors for footer row fix
    const selection = useGridSelector(apiRef, gridRowSelectionStateSelector);
    const filteredSortedRowEntries = useGridSelector(apiRef, gridFilteredSortedRowEntriesSelector);
    const rowTree = useGridSelector(apiRef, gridRowTreeSelector);

    // Calculate corrected selection count that excludes footer rows
    // This fixes the selection count display issue when aggregation is enabled
    const selectedRowCount = React.useMemo(() => {
      if (selection.type === 'include') {
        return selection.ids.size;
      }

      // In exclude selection, count only selectable rows (excluding footer and pinned rows)
      const selectableFilteredRowCount = filteredSortedRowEntries.filter((row: any) => {
        const rowNode = rowTree[row.id];
        return rowNode?.type !== 'footer' && rowNode?.type !== 'pinnedRow';
      }).length;

      const correctedCount = selectableFilteredRowCount - selection.ids.size;
      // Return the corrected count if it's positive, otherwise fall back to base count
      return correctedCount > 0 ? correctedCount : baseSelectedRowCount;
    }, [selection, filteredSortedRowEntries, rowTree, baseSelectedRowCount]);

    const selectedRowCountElement =
      !rootProps.hideFooterSelectedRowCount && selectedRowCount > 0 ? (
        <GridSelectedRowCount selectedRowCount={selectedRowCount} />
      ) : (
        <div />
      );

    const rowCountElement =
      !rootProps.hideFooterRowCount && !rootProps.pagination ? (
        <rootProps.slots.footerRowCount
          {...rootProps.slotProps?.footerRowCount}
          rowCount={totalTopLevelRowCount}
          visibleRowCount={visibleTopLevelRowCount}
        />
      ) : null;

    const paginationElement = rootProps.pagination &&
      !rootProps.hideFooterPagination &&
      rootProps.slots.pagination && <rootProps.slots.pagination />;

    return (
      <GridFooterContainer {...props} ref={ref}>
        {selectedRowCountElement}
        {rowCountElement}
        {paginationElement}
      </GridFooterContainer>
    );
  },
);

GridFooter.propTypes = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // | To update them edit the TypeScript types and run "pnpm proptypes"  |
  // ----------------------------------------------------------------------
  sx: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool])),
    PropTypes.func,
    PropTypes.object,
  ]),
} as any;

export { GridFooter };
