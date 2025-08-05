import * as React from 'react';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { ChartContainer, BarPlot, LinePlot, ChartsXAxis, ChartsYAxis, ChartsAxisHighlight, ChartsTooltip } from '@mui/x-charts';
import { legendClasses } from '@mui/x-charts/ChartsLegend';
import CustomBarChartWithHighlight from './CustomBarChartWithHighlight';

const barChartsParams = {
  xAxis: [{ data: ['page A', 'page B', 'page C', 'page D', 'page E'] }],
  series: [
    { data: [2, 5, 3, 4, 1], stack: '1', label: 'Series x' },
    { data: [10, 3, 1, 2, 10], stack: '1', label: 'Series y' },
    { data: [10, 3, 1, 2, 10], stack: '1', label: 'Series z' },
  ],
  margin: { right: 10 },
  sx: {
    [`& .${legendClasses.root}`]: {
      display: 'none',
    },
  },
  height: 300,
};

// Convert bar data to line chart format for comparison
const lineChartsParams = {
  xAxis: [{ scaleType: 'point' as const, data: ['page A', 'page B', 'page C', 'page D', 'page E'] }],
  series: [
    { data: [2, 5, 3, 4, 1], label: 'Series x' },
    { data: [10, 3, 1, 2, 10], label: 'Series y' },
    { data: [10, 3, 1, 2, 10], label: 'Series z' },
  ],
  margin: { right: 10 },
  sx: {
    [`& .${legendClasses.root}`]: {
      display: 'none',
    },
  },
  height: 300,
};

export default function BandHighlight() {
  const [xHighlight, setXHightlight] = React.useState<'band' | 'none' | 'line'>('band');
  const [yHighlight, setYHightlight] = React.useState<'none' | 'line'>('none');
  const [chartType, setChartType] = React.useState<'bar' | 'line' | 'composition' | 'custom'>('bar');

  const handleChange = (direction: 'x' | 'y') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (direction === 'x') {
        setXHightlight(
          (event.target as HTMLInputElement).value as 'band' | 'none' | 'line',
        );
      }
      if (direction === 'y') {
        setYHightlight((event.target as HTMLInputElement).value as 'none' | 'line');
      }
    };

  const handleChartTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChartType((event.target as HTMLInputElement).value as 'bar' | 'line' | 'composition' | 'custom');
  };

  return (
    <Stack spacing={3} sx={{ width: '100%', p: 2 }}>
      <Alert severity="info">
        <Typography variant="subtitle2" gutterBottom>
          Known Issue with BarChart Y-Axis Highlighting
        </Typography>
        <Typography variant="body2">
          The y-axis line highlighting (`axisHighlight={{ y: 'line' }}`) has limited support in BarChart components. 
          This is because BarCharts use band scales on the x-axis which affects how the highlighting system works.
        </Typography>
      </Alert>

      <FormControl>
        <FormLabel id="chart-type-label">Chart Type</FormLabel>
        <RadioGroup
          aria-labelledby="chart-type-label"
          value={chartType}
          onChange={handleChartTypeChange}
          row
        >
          <FormControlLabel value="bar" control={<Radio />} label="BarChart (has issue)" />
          <FormControlLabel value="line" control={<Radio />} label="LineChart (works)" />
          <FormControlLabel value="composition" control={<Radio />} label="Composition (partial fix)" />
          <FormControlLabel value="custom" control={<Radio />} label="Custom (full fix)" />
        </RadioGroup>
      </FormControl>

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ width: '100%' }}>
        <div style={{ flexGrow: 1 }}>
          {chartType === 'bar' && (
            <BarChart {...barChartsParams} axisHighlight={{ x: xHighlight, y: yHighlight }} />
          )}
          {chartType === 'line' && (
            <LineChart {...lineChartsParams} axisHighlight={{ x: xHighlight, y: yHighlight }} />
          )}
          {chartType === 'composition' && (
            <ChartContainer
              xAxis={[{ scaleType: 'band', data: ['page A', 'page B', 'page C', 'page D', 'page E'] }]}
              series={[
                { type: 'bar', data: [2, 5, 3, 4, 1], stack: '1', label: 'Series x' },
                { type: 'bar', data: [10, 3, 1, 2, 10], stack: '1', label: 'Series y' },
                { type: 'bar', data: [10, 3, 1, 2, 10], stack: '1', label: 'Series z' },
              ]}
              height={300}
              margin={{ right: 10 }}
            >
              <BarPlot />
              <ChartsAxisHighlight x={xHighlight} y={yHighlight} />
              <ChartsXAxis />
              <ChartsYAxis />
              <ChartsTooltip />
            </ChartContainer>
          )}
          {chartType === 'custom' && (
            <CustomBarChartWithHighlight xHighlight={xHighlight} yHighlight={yHighlight} />
          )}
        </div>
        
        <Stack
          direction={{ xs: 'row', md: 'column' }}
          justifyContent={{ xs: 'space-around', md: 'flex-start' }}
          spacing={2}
          sx={{ m: 2 }}
        >
          <FormControl>
            <FormLabel id="x-highlight-label">x highlight</FormLabel>
            <RadioGroup
              aria-labelledby="x-highlight-label"
              value={xHighlight}
              onChange={handleChange('x')}
            >
              <FormControlLabel value="none" control={<Radio />} label="None" />
              <FormControlLabel value="line" control={<Radio />} label="Line" />
              <FormControlLabel value="band" control={<Radio />} label="Band" />
            </RadioGroup>
          </FormControl>
          <FormControl>
            <FormLabel id="y-highlight-label">y highlight</FormLabel>
            <RadioGroup
              aria-labelledby="y-highlight-label"
              value={yHighlight}
              onChange={handleChange('y')}
            >
              <FormControlLabel value="none" control={<Radio />} label="None" />
              <FormControlLabel value="line" control={<Radio />} label="Line" />
            </RadioGroup>
          </FormControl>
        </Stack>
      </Stack>
      
      <Alert severity="success">
        <Typography variant="subtitle2" gutterBottom>
          Solutions Demonstrated:
        </Typography>
        <Typography variant="body2" component="div">
          <ol>
            <li><strong>BarChart (has issue):</strong> Shows the original problem where y-axis highlighting doesn't work.</li>
            <li><strong>LineChart (works):</strong> Demonstrates that the same data works fine with LineChart.</li>
            <li><strong>Composition (partial fix):</strong> Uses ChartContainer with explicit ChartsAxisHighlight component.</li>
            <li><strong>Custom (full fix):</strong> Implements a custom y-axis highlighting solution that tracks mouse position and draws highlight lines manually.</li>
          </ol>
        </Typography>
      </Alert>
      
      <Alert severity="warning">
        <Typography variant="subtitle2" gutterBottom>
          Additional Recommendations:
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li>Consider reporting this as a bug to the MUI X Charts team if it hasn't been reported already.</li>
            <li>For production use, the "Custom" implementation provides the most reliable solution.</li>
            <li>The issue is specifically with BarChart components; other chart types work correctly.</li>
            <li>X-axis highlighting (band mode) works fine with BarCharts.</li>
          </ul>
        </Typography>
      </Alert>
    </Stack>
  );
}