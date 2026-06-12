import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';

export interface TimeRangePickerTabsClasses {
  /** Styles applied to the root element. */
  root: string;
  /** Styles applied to the tab element. */
  tab: string;
}

export type TimeRangePickerTabsClassKey = keyof TimeRangePickerTabsClasses;

export function getTimeRangePickerTabsUtilityClass(slot: string) {
  return generateUtilityClass('MuiTimeRangePickerTabs', slot);
}

export const timeRangePickerTabsClasses: TimeRangePickerTabsClasses = generateUtilityClasses(
  'MuiTimeRangePickerTabs',
  ['root', 'tab'],
);
