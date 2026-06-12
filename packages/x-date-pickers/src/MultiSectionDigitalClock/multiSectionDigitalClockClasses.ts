import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';

export interface MultiSectionDigitalClockClasses {
  /** Styles applied to the root element. */
  root: string;
}

export type MultiSectionDigitalClockClassKey = keyof MultiSectionDigitalClockClasses;

export function getMultiSectionDigitalClockUtilityClass(slot: string) {
  return generateUtilityClass('MuiMultiSectionDigitalClock', slot);
}

export const multiSectionDigitalClockClasses: MultiSectionDigitalClockClasses =
  generateUtilityClasses('MuiMultiSectionDigitalClock', ['root']);
