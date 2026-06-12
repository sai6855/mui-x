import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';

export interface MultiSectionDigitalClockSectionClasses {
  /** Styles applied to the root (list) element. */
  root: string;
  /** Styles applied to the list item (by default: MenuItem) element. */
  item: string;
}

export type MultiSectionDigitalClockSectionClassKey = keyof MultiSectionDigitalClockSectionClasses;

export function getMultiSectionDigitalClockSectionUtilityClass(slot: string) {
  return generateUtilityClass('MuiMultiSectionDigitalClockSection', slot);
}

export const multiSectionDigitalClockSectionClasses: MultiSectionDigitalClockSectionClasses =
  generateUtilityClasses('MuiMultiSectionDigitalClockSection', ['root', 'item']);
