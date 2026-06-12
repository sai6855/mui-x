import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';
import composeClasses from '@mui/utils/composeClasses';

export interface ChartsSurfaceClasses {
  /** Styles applied to the root element. */
  root: string;
}

function getSurfaceUtilityClass(slot: string) {
  return generateUtilityClass('MuiChartsSurface', slot);
}

export const useUtilityClasses = () => {
  const slots = { root: ['root'] };

  return composeClasses(slots, getSurfaceUtilityClass);
};

export const chartsSurfaceClasses: ChartsSurfaceClasses = generateUtilityClasses(
  'MuiChartsSurface',
  ['root'],
);
