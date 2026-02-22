# overridesResolver Patterns Across MUI X Packages

This document catalogs all `overridesResolver` patterns found across MUI X packages.
The reference implementation is in `packages/x-data-grid/src/components/containers/GridRootStyles.ts`,
which uses a loop-based approach (forEach over `elementOverrides` arrays) instead of manually
listing each style override.

---

## x-data-grid-premium (3 files)

### ResizablePanelHandle.tsx — 2 root-level class overrides

```typescript
overridesResolver: (props, styles) => [
  { [`&.${gridClasses['resizablePanelHandle--horizontal']}`]: styles['resizablePanelHandle--horizontal'] },
  { [`&.${gridClasses['resizablePanelHandle--vertical']}`]: styles['resizablePanelHandle--vertical'] },
  styles.resizablePanelHandle,
]
```

### GridPivotPanelField.tsx — 1 root-level class override

```typescript
overridesResolver: (props, styles) => [
  { [`&.${gridClasses['pivotPanelField--sorted']}`]: styles['pivotPanelField--sorted'] },
  styles.pivotPanelField,
]
```

### GridAggregationHeader.tsx — conditional overrides based on ownerState

```typescript
overridesResolver: (props, styles) => {
  const { ownerState } = props;
  return [
    styles.aggregationColumnHeader,
    ownerState.colDef.headerAlign === 'left' && styles['aggregationColumnHeader--alignLeft'],
    ownerState.colDef.headerAlign === 'center' && styles['aggregationColumnHeader--alignCenter'],
    ownerState.colDef.headerAlign === 'right' && styles['aggregationColumnHeader--alignRight'],
  ];
}
```

---

## x-charts (4 files)

### BarLabel.tsx — 2 class overrides

```typescript
overridesResolver: (_, styles) => [
  { [`&.${barLabelClasses.faded}`]: styles.faded },
  { [`&.${barLabelClasses.highlighted}`]: styles.highlighted },
  styles.root,
]
```

### PieArc.tsx — simple single style reference

```typescript
overridesResolver: (_, styles) => styles.arc, // FIXME: Inconsistent naming with slot
```

### ChartsTooltipTable.ts (`ChartsTooltipPaper`) — simple single style reference

```typescript
overridesResolver: (props, styles) => styles.paper, // FIXME: Inconsistent naming with slot
```

### styledComponents.tsx (`ChartsGrid` `GridRoot`) — 2 class overrides

```typescript
overridesResolver: (props, styles) => [
  { [`&.${chartsGridClasses.verticalLine}`]: styles.verticalLine },
  { [`&.${chartsGridClasses.horizontalLine}`]: styles.horizontalLine },
  styles.root,
]
```

---

## x-charts-pro (1 file)

### HeatmapCell.tsx — simple single style reference

```typescript
overridesResolver: (_, styles) => styles.arc, // FIXME: Inconsistent naming with slot
```

---

## x-date-pickers (9 files)

### PickerDay2.tsx (`PickerDay2Root`) — conditional ownerState-based

```typescript
overridesResolver: (props, styles) => {
  const { ownerState } = props;
  return [
    styles.root,
    !ownerState.disableHighlightToday && ownerState.isDayCurrent && styles.today,
    !ownerState.isDayOutsideMonth && styles.dayOutsideMonth,
    ownerState.isDayFillerCell && styles.fillerCell,
  ];
}
```

### DateTimePickerToolbar.tsx (`DateTimePickerToolbarAmPmSelection`) — 2 class overrides

```typescript
overridesResolver: (props, styles) => [
  { [`.${dateTimePickerToolbarClasses.ampmLabel}`]: styles.ampmLabel },
  { [`&.${dateTimePickerToolbarClasses.ampmLandscape}`]: styles.ampmLandscape },
  styles.ampmSelection,
]
```

### PickersDay.tsx (`PickersDayRoot`) — conditional ownerState-based

```typescript
overridesResolver: (props, styles) => {
  const { ownerState } = props;
  return [
    styles.root,
    !ownerState.disableMargin && styles.dayWithMargin,
    !ownerState.disableHighlightToday && ownerState.isDayCurrent && styles.today,
    ownerState.isDayOutsideMonth && ownerState.showDaysOutsideCurrentMonth && styles.dayOutsideMonth,
    ownerState.isDayOutsideMonth && !ownerState.showDaysOutsideCurrentMonth && styles.hiddenDaySpacingFiller,
  ];
}
```

### PickersInputBase.tsx — 2 components, simple style references

```typescript
// PickersInputBaseSectionContent
overridesResolver: (props, styles) => styles.content

// PickersInputBaseInput
overridesResolver: (props, styles) => styles.hiddenInput
```

### YearCalendarButton.tsx (`DefaultYearButton`) — 2 class overrides

```typescript
overridesResolver: (_, styles) => [
  styles.button,
  { [`&.${yearCalendarClasses.disabled}`]: styles.disabled },
  { [`&.${yearCalendarClasses.selected}`]: styles.selected },
]
```

### MonthCalendarButton.tsx (`DefaultMonthButton`) — 2 class overrides

```typescript
overridesResolver: (_, styles) => [
  styles.button,
  { [`&.${monthCalendarClasses.disabled}`]: styles.disabled },
  { [`&.${monthCalendarClasses.selected}`]: styles.selected },
]
```

### TimePickerToolbar.tsx — 2 components

```typescript
// TimePickerToolbarHourMinuteLabel
overridesResolver: (props, styles) => [
  {
    [`&.${timePickerToolbarClasses.hourMinuteLabelLandscape}`]: styles.hourMinuteLabelLandscape,
    [`&.${timePickerToolbarClasses.hourMinuteLabelReverse}`]: styles.hourMinuteLabelReverse,
  },
  styles.hourMinuteLabel,
]

// TimePickerToolbarAmPmSelection
overridesResolver: (props, styles) => [
  { [`.${timePickerToolbarClasses.ampmLabel}`]: styles.ampmLabel },
  { [`&.${timePickerToolbarClasses.ampmLandscape}`]: styles.ampmLandscape },
  styles.ampmSelection,
]
```

### PickersSlideTransition.tsx (`PickersSlideTransitionRoot`) — 6 child class overrides

```typescript
overridesResolver: (_, styles) => [
  styles.root,
  { [`.${pickersSlideTransitionClasses['slideEnter-left']}`]: styles['slideEnter-left'] },
  { [`.${pickersSlideTransitionClasses['slideEnter-right']}`]: styles['slideEnter-right'] },
  { [`.${pickersSlideTransitionClasses.slideEnterActive}`]: styles.slideEnterActive },
  { [`.${pickersSlideTransitionClasses.slideExit}`]: styles.slideExit },
  { [`.${pickersSlideTransitionClasses['slideExitActiveLeft-left']}`]: styles['slideExitActiveLeft-left'] },
  { [`.${pickersSlideTransitionClasses['slideExitActiveLeft-right']}`]: styles['slideExitActiveLeft-right'] },
]
```

### ClockNumber.tsx (`ClockNumberRoot`) — 2 class overrides

```typescript
overridesResolver: (_, styles) => [
  styles.root,
  { [`&.${clockNumberClasses.disabled}`]: styles.disabled },
  { [`&.${clockNumberClasses.selected}`]: styles.selected },
]
```

---

## x-date-pickers-pro (3 files)

### DateRangePickerDay.tsx — 3 components

#### `DateRangePickerDayRoot` — 9 class overrides

```typescript
overridesResolver: (_, styles) => [
  { [`&.${dateRangePickerDayClasses.rangeIntervalDayHighlight}`]: styles.rangeIntervalDayHighlight },
  { [`&.${dateRangePickerDayClasses.rangeIntervalDayHighlightStart}`]: styles.rangeIntervalDayHighlightStart },
  { [`&.${dateRangePickerDayClasses.rangeIntervalDayHighlightEnd}`]: styles.rangeIntervalDayHighlightEnd },
  { [`&.${dateRangePickerDayClasses.firstVisibleCell}`]: styles.firstVisibleCell },
  { [`&.${dateRangePickerDayClasses.lastVisibleCell}`]: styles.lastVisibleCell },
  { [`&.${dateRangePickerDayClasses.startOfMonth}`]: styles.startOfMonth },
  { [`&.${dateRangePickerDayClasses.endOfMonth}`]: styles.endOfMonth },
  { [`&.${dateRangePickerDayClasses.outsideCurrentMonth}`]: styles.outsideCurrentMonth },
  { [`&.${dateRangePickerDayClasses.hiddenDayFiller}`]: styles.hiddenDayFiller },
  styles.root,
]
```

#### `DateRangePickerDayRangeIntervalPreview` — 3 class overrides

```typescript
overridesResolver: (_, styles) => [
  { [`&.${dateRangePickerDayClasses.rangeIntervalDayPreview}`]: styles.rangeIntervalDayPreview },
  { [`&.${dateRangePickerDayClasses.rangeIntervalDayPreviewStart}`]: styles.rangeIntervalDayPreviewStart },
  { [`&.${dateRangePickerDayClasses.rangeIntervalDayPreviewEnd}`]: styles.rangeIntervalDayPreviewEnd },
  styles.rangeIntervalPreview,
]
```

#### `DateRangePickerDayDay` — 3 class overrides

```typescript
overridesResolver: (_, styles) => [
  { [`&.${dateRangePickerDayClasses.dayInsideRangeInterval}`]: styles.dayInsideRangeInterval },
  { [`&.${dateRangePickerDayClasses.dayOutsideRangeInterval}`]: styles.dayOutsideRangeInterval },
  { [`&.${dateRangePickerDayClasses.notSelectedDate}`]: styles.notSelectedDate },
  styles.day,
]
```

### DateRangePickerDay2.tsx (`DateRangePickerDay2Root`) — 14 conditional ownerState-based items

```typescript
overridesResolver: (props, styles) => {
  const { ownerState } = props;
  return [
    styles.root,
    !ownerState.disableHighlightToday && ownerState.isDayCurrent && styles.today,
    !ownerState.isDayOutsideMonth && styles.dayOutsideMonth,
    ownerState.isDayFillerCell && styles.fillerCell,
    ownerState.isDaySelected && !ownerState.isDayInsideSelection && styles.selected,
    ownerState.isDayPreviewStart && styles.previewStart,
    ownerState.isDayPreviewEnd && styles.previewEnd,
    ownerState.isDayInsidePreview && styles.insidePreviewing,
    ownerState.isDaySelectionStart && styles.selectionStart,
    ownerState.isDaySelectionEnd && styles.selectionEnd,
    ownerState.isDayInsideSelection && styles.insideSelection,
    ownerState.isDayDraggable && styles.draggable,
    ownerState.isDayStartOfWeek && styles.startOfWeek,
    ownerState.isDayEndOfWeek && styles.endOfWeek,
  ];
}
```

### DateRangeCalendar.tsx (`DateRangeCalendarMonthContainer`) — simple style reference

```typescript
overridesResolver: (_, styles) => styles.monthContainer
```

---

## Summary

| Package | Files | Components |
|---------|-------|------------|
| x-data-grid-premium | 3 | 3 |
| x-charts | 4 | 4 |
| x-charts-pro | 1 | 1 |
| x-date-pickers | 9 | 11 |
| x-date-pickers-pro | 3 | 5 |
| **Total** | **20** | **24** |

### Refactoring candidates (loop-based approach)

Files with repetitive class-based overrides that would benefit most from a loop-based refactor
(similar to `GridRootStyles.ts`):

- `DateRangePickerDay.tsx` — `DateRangePickerDayRoot` has 9 identical-pattern overrides
- `PickersSlideTransition.tsx` — 6 child class overrides with identical structure
- `DateRangePickerDay2.tsx` — 14 ownerState-conditional overrides
- `DateRangePickerDay.tsx` — `DateRangePickerDayRangeIntervalPreview` and `DateRangePickerDayDay` (3 each)
- `ClockNumber.tsx`, `YearCalendarButton.tsx`, `MonthCalendarButton.tsx` — 2 class overrides each
