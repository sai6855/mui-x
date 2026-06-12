import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';
import { TreeViewClasses } from '@mui/x-tree-view/internals';

export interface RichTreeViewProClasses extends TreeViewClasses {}

export type RichTreeViewProClassKey = keyof RichTreeViewProClasses;

export function getRichTreeViewProUtilityClass(slot: string): string {
  return generateUtilityClass('MuiRichTreeViewPro', slot);
}

export const richTreeViewProClasses: RichTreeViewProClasses = generateUtilityClasses(
  'MuiRichTreeViewPro',
  [
    'root',
    'item',
    'itemContent',
    'itemGroupTransition',
    'itemIconContainer',
    'itemLabel',
    'itemCheckbox',
    'itemLabelInput',
    'itemDragAndDropOverlay',
    'itemErrorIcon',
    'itemLoadingIcon',
  ],
);
