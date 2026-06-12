import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';

export interface DateTimePickerTabsClasses {
  /** Styles applied to the root element. */
  root: string;
}

export type DateTimePickerTabsClassKey = keyof DateTimePickerTabsClasses;

export function getDateTimePickerTabsUtilityClass(slot: string) {
  return generateUtilityClass('MuiDateTimePickerTabs', slot);
}

export const dateTimePickerTabsClasses: DateTimePickerTabsClasses = generateUtilityClasses(
  'MuiDateTimePickerTabs',
  ['root'],
);
