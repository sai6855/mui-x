import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';

export interface DateTimeRangePickerToolbarClasses {
  /** Styles applied to the root element. */
  root: string;
  /** Styles applied to the start toolbar element. */
  startToolbar: string;
  /** Styles applied to the end toolbar element. */
  endToolbar: string;
}

export type DateTimeRangePickerToolbarClassKey = keyof DateTimeRangePickerToolbarClasses;

export function getDateTimeRangePickerToolbarUtilityClass(slot: string) {
  return generateUtilityClass('MuiDateTimeRangePickerToolbar', slot);
}

export const dateTimeRangePickerToolbarClasses: DateTimeRangePickerToolbarClasses =
  generateUtilityClasses('MuiDateTimeRangePickerToolbar', ['root', 'startToolbar', 'endToolbar']);
