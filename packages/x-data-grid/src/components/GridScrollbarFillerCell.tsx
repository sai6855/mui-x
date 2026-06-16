import clsx from 'clsx';
import { gridClasses } from '../constants';
import { useGridPrivateApiContext } from '../hooks/utils/useGridPrivateApiContext';
import { usePinnedScrollOffset } from '../hooks/utils/usePinnedScrollOffset';
import { PinnedColumnPosition } from '../internals/constants';

function GridScrollbarFillerCell({ pinnedRight }: { pinnedRight?: boolean }) {
  const apiRef = useGridPrivateApiContext();
  const pinnedScrollOffset = usePinnedScrollOffset(
    apiRef,
    pinnedRight ? PinnedColumnPosition.RIGHT : undefined,
  );

  return (
    <div
      role="none"
      className={clsx(
        gridClasses.scrollbarFiller,
        pinnedRight && gridClasses['scrollbarFiller--pinnedRight'],
      )}
      style={{ right: pinnedScrollOffset }}
    />
  );
}

export { GridScrollbarFillerCell };
