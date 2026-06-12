import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';

export interface DateRangeCalendarClasses {
  /** Styles applied to the root element. */
  root: string;
  /** Styles applied to the container of a month. */
  monthContainer: string;
  /** Styles applied to the day calendar container when dragging */
  dayDragging: string;
}

export type DateRangeCalendarClassKey = keyof DateRangeCalendarClasses;

export const getDateRangeCalendarUtilityClass = (slot: string) =>
  generateUtilityClass('MuiDateRangeCalendar', slot);

export const dateRangeCalendarClasses: DateRangeCalendarClasses = generateUtilityClasses(
  'MuiDateRangeCalendar',
  ['root', 'monthContainer', 'dayDragging'],
);
