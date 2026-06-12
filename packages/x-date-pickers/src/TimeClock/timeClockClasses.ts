import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';

export interface TimeClockClasses {
  /** Styles applied to the root element. */
  root: string;
  /** Styles applied to the arrowSwitcher element. */
  arrowSwitcher: string;
}

export type TimeClockClassKey = keyof TimeClockClasses;

export function getTimeClockUtilityClass(slot: string) {
  return generateUtilityClass('MuiTimeClock', slot);
}

export const timeClockClasses: TimeClockClasses = generateUtilityClasses('MuiTimeClock', [
  'root',
  'arrowSwitcher',
]);
