import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';

export interface ChartsRadialAxisHighlightClasses {
  /** Styles applied to the root element. */
  root: string;
}

export type ChartsRadialAxisHighlightClassKey = keyof ChartsRadialAxisHighlightClasses;

export function getRadialAxisHighlightUtilityClass(slot: string) {
  return generateUtilityClass('MuiChartsRadialAxisHighlight', slot);
}

export const chartsRadialAxisHighlightClasses: ChartsRadialAxisHighlightClasses =
  generateUtilityClasses('MuiChartsRadialAxisHighlight', ['root']);
