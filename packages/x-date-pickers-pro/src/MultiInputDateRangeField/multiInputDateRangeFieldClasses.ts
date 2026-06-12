import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';
import { MultiInputRangeFieldClasses } from '../internals/utils/createMultiInputRangeField';

export interface MultiInputDateRangeFieldClasses extends MultiInputRangeFieldClasses {}

export type MultiInputDateRangeFieldClassKey = keyof MultiInputRangeFieldClasses;

export const multiInputDateRangeFieldClasses: MultiInputRangeFieldClasses = generateUtilityClasses(
  'MuiMultiInputDateRangeField',
  ['root', 'separator'],
);

export const getMultiInputDateRangeFieldUtilityClass = (slot: string) =>
  generateUtilityClass('MuiMultiInputDateRangeField', slot);
