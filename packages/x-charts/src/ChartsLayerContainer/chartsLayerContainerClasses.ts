import generateUtilityClass from '@mui/material/generateUtilityClass';
import generateUtilityClasses from '@mui/material/generateUtilityClasses';
import composeClasses from '@mui/utils/composeClasses';

export interface ChartsLayerContainerClasses {
  /** Styles applied to the root element. */
  root: string;
}

function getLayerContainerUtilityClass(slot: string) {
  return generateUtilityClass('MuiChartsLayerContainer', slot);
}

export const useUtilityClasses = () => {
  const slots = { root: ['root'] };

  return composeClasses(slots, getLayerContainerUtilityClass);
};

export const chartsLayerContainerClasses: ChartsLayerContainerClasses = generateUtilityClasses(
  'MuiChartsLayerContainer',
  ['root'],
);
