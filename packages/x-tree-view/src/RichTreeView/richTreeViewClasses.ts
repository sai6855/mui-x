import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';
import { TreeViewClasses } from '../internals/TreeViewProvider/TreeViewStyleContext';

export interface RichTreeViewClasses extends Omit<
  TreeViewClasses,
  'itemDragAndDropOverlay' | 'itemErrorIcon' | 'itemLoadingIcon'
> {}

export type RichTreeViewClassKey = keyof RichTreeViewClasses;

export function getRichTreeViewUtilityClass(slot: string): string {
  return generateUtilityClass('MuiRichTreeView', slot);
}

export const richTreeViewClasses: RichTreeViewClasses = generateUtilityClasses('MuiRichTreeView', [
  'root',
  'item',
  'itemContent',
  'itemGroupTransition',
  'itemIconContainer',
  'itemLabel',
  'itemCheckbox',
  'itemLabelInput',
]);
