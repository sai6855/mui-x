import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';

export interface PickersFadeTransitionGroupClasses {
  /** Styles applied to the root element. */
  root: string;
}

export type PickersFadeTransitionGroupClassKey = keyof PickersFadeTransitionGroupClasses;

export const getPickersFadeTransitionGroupUtilityClass = (slot: string) =>
  generateUtilityClass('MuiPickersFadeTransitionGroup', slot);

export const pickersFadeTransitionGroupClasses: PickersFadeTransitionGroupClasses =
  generateUtilityClasses('MuiPickersFadeTransitionGroup', ['root']);
