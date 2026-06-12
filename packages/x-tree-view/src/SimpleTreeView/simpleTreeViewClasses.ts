import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';
import { TreeViewClasses } from '../internals/TreeViewProvider/TreeViewStyleContext';

export interface SimpleTreeViewClasses extends Omit<
  TreeViewClasses,
  'itemDragAndDropOverlay' | 'itemLabelInput' | 'itemErrorIcon' | 'itemLoadingIcon'
> {}

export type SimpleTreeViewClassKey = keyof SimpleTreeViewClasses;

export function getSimpleTreeViewUtilityClass(slot: string): string {
  return generateUtilityClass('MuiSimpleTreeView', slot);
}

export const simpleTreeViewClasses: SimpleTreeViewClasses = generateUtilityClasses(
  'MuiSimpleTreeView',
  [
    'root',
    'item',
    'itemContent',
    'itemGroupTransition',
    'itemIconContainer',
    'itemLabel',
    'itemCheckbox',
  ],
);
