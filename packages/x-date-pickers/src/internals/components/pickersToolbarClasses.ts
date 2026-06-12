import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';

export interface PickersToolbarClasses {
  /** Styles applied to the root element. */
  root: string;
  /** Styles applied to the title element. */
  title: string;
  /** Styles applied to the content element. */
  content: string;
}

export type PickersToolbarClassKey = keyof PickersToolbarClasses;

export function getPickersToolbarUtilityClass(slot: string) {
  return generateUtilityClass('MuiPickersToolbar', slot);
}

export const pickersToolbarClasses = generateUtilityClasses('MuiPickersToolbar', [
  'root',
  'title',
  'content',
]);
