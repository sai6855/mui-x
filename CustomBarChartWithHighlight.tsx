import * as React from 'react';
import { ChartContainer, BarPlot, ChartsXAxis, ChartsYAxis, ChartsTooltip } from '@mui/x-charts';
import { useDrawingArea, useXScale, useYScale } from '@mui/x-charts/hooks';
import { styled } from '@mui/material/styles';

const CustomHighlightLine = styled('line')(({ theme }) => ({
  stroke: theme.palette.text.primary,
  strokeWidth: 1,
  strokeDasharray: '5,5',
  opacity: 0.7,
  pointerEvents: 'none',
}));

interface CustomYAxisHighlightProps {
  mousePosition?: { x: number; y: number } | null;
}

function CustomYAxisHighlight({ mousePosition }: CustomYAxisHighlightProps) {
  const drawingArea = useDrawingArea();
  const yScale = useYScale();

  if (!mousePosition || !yScale) return null;

  // Calculate the y-value based on mouse position
  const yValue = yScale.invert?.(mousePosition.y - drawingArea.top);
  const yPosition = yScale(yValue) + drawingArea.top;

  // Only show if mouse is within the drawing area
  if (
    mousePosition.x < drawingArea.left ||
    mousePosition.x > drawingArea.left + drawingArea.width ||
    mousePosition.y < drawingArea.top ||
    mousePosition.y > drawingArea.top + drawingArea.height
  ) {
    return null;
  }

  return (
    <CustomHighlightLine
      x1={drawingArea.left}
      x2={drawingArea.left + drawingArea.width}
      y1={yPosition}
      y2={yPosition}
    />
  );
}

interface CustomBarChartWithHighlightProps {
  xHighlight: 'band' | 'none' | 'line';
  yHighlight: 'none' | 'line';
}

export default function CustomBarChartWithHighlight({
  xHighlight,
  yHighlight,
}: CustomBarChartWithHighlightProps) {
  const [mousePosition, setMousePosition] = React.useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMousePosition(null);
  };

  return (
    <ChartContainer
      xAxis={[{ scaleType: 'band', data: ['page A', 'page B', 'page C', 'page D', 'page E'] }]}
      series={[
        { type: 'bar', data: [2, 5, 3, 4, 1], stack: '1', label: 'Series x' },
        { type: 'bar', data: [10, 3, 1, 2, 10], stack: '1', label: 'Series y' },
        { type: 'bar', data: [10, 3, 1, 2, 10], stack: '1', label: 'Series z' },
      ]}
      height={300}
      margin={{ right: 10 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <BarPlot />
      {/* Use the standard x-axis highlighting */}
      {xHighlight !== 'none' && (
        <g>
          {/* This would need to be implemented for x-axis highlighting */}
        </g>
      )}
      {/* Custom y-axis highlighting */}
      {yHighlight === 'line' && (
        <CustomYAxisHighlight mousePosition={mousePosition} />
      )}
      <ChartsXAxis />
      <ChartsYAxis />
      <ChartsTooltip />
    </ChartContainer>
  );
}