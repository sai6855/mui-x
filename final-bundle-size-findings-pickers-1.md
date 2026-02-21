# Bundle Size Optimization Findings: x-date-pickers & x-date-pickers-pro

Focus: **GZIP compression optimization**. All estimates are for gzipped output unless stated otherwise.

---

## Table of Contents

1. [Cross-Package Findings](#cross-package-findings)
2. [x-date-pickers Findings](#x-date-pickers-findings)
3. [x-date-pickers-pro Findings](#x-date-pickers-pro-findings)
4. [Summary Table](#summary-table)

---

## Cross-Package Findings

### XP-1: Shared PropTypes `sx` Block Repeated 50+ Times Across Both Packages (~3,000 bytes gzip)

**Files:** Every exported component in both packages (30+ in x-date-pickers, 15+ in x-date-pickers-pro)

**Pattern (verbatim identical in every file):**
```ts
sx: PropTypes.oneOfType([
  PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool])),
  PropTypes.func,
  PropTypes.object,
]),
```

**Fix:** Extract to a shared constant:
```ts
// packages/x-date-pickers/src/internals/propTypes.ts
export const sxPropType = PropTypes.oneOfType([
  PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool])),
  PropTypes.func,
  PropTypes.object,
]);

// In each component:
sx: sxPropType,
```

**Est. gzip savings:** ~3,000 bytes

---

### XP-2: PropTypes Warning Comment Block Repeated 50+ Times (~4,500 bytes gzip)

**Files:** Every component with PropTypes in both packages

**Pattern:**
```ts
// ----------------------------- Warning --------------------------------
// | These PropTypes are generated from the TypeScript type definitions |
// | To update them edit the TypeScript types and run "pnpm proptypes"  |
// ----------------------------------------------------------------------
```

~210 bytes per occurrence x 50+ files.

**Fix:** Remove the comment block entirely from generated PropTypes output. The information is in git history and in the build scripts. This is pure comment overhead in every consumer's bundle.

**Est. gzip savings:** ~4,500 bytes

---

### XP-3: `selectedSections` PropTypes Block Repeated 15+ Times (~800 bytes gzip)

**Files:** All field components and picker components in both packages

**Pattern:**
```ts
selectedSections: PropTypes.oneOfType([
  PropTypes.oneOf(['all','day','empty','hours','meridiem','minutes','month','seconds','weekDay','year']),
  PropTypes.number,
]),
```

**Fix:** Extract to shared constant:
```ts
// packages/x-date-pickers/src/internals/propTypes.ts
export const selectedSectionsPropType = PropTypes.oneOfType([
  PropTypes.oneOf(['all','day','empty','hours','meridiem','minutes','month','seconds','weekDay','year']),
  PropTypes.number,
]);
```

**Est. gzip savings:** ~800 bytes

---

### XP-4: `sectionListRef` PropTypes Block Repeated 4+ Times (~250 bytes gzip)

**Files:**
- `x-date-pickers/src/PickersTextField/PickersInputBase/PickersInputBase.tsx`
- `x-date-pickers/src/PickersTextField/PickersOutlinedInput/PickersOutlinedInput.tsx`
- `x-date-pickers/src/PickersTextField/PickersFilledInput/PickersFilledInput.tsx`
- `x-date-pickers/src/PickersTextField/PickersInput/PickersInput.tsx`

**Pattern:**
```ts
sectionListRef: PropTypes.oneOfType([
  PropTypes.func,
  PropTypes.shape({
    current: PropTypes.shape({
      getRoot: PropTypes.func.isRequired,
      getSectionContainer: PropTypes.func.isRequired,
      getSectionContent: PropTypes.func.isRequired,
      getSectionIndexFromDOMElement: PropTypes.func.isRequired,
    }),
  }),
]),
```

**Fix:** Extract to `sectionListRefPropType` in shared propTypes file.

**Est. gzip savings:** ~250 bytes

---

### XP-5: `elements` PropTypes Block Repeated 5 Times (~180 bytes gzip)

**Files:** All PickersInput variants + PickersTextField

**Pattern:**
```ts
elements: PropTypes.arrayOf(
  PropTypes.shape({
    after: PropTypes.object.isRequired,
    before: PropTypes.object.isRequired,
    container: PropTypes.object.isRequired,
    content: PropTypes.object.isRequired,
  }),
).isRequired,
```

**Fix:** Extract to shared constant.

**Est. gzip savings:** ~180 bytes

---

### XP-6: `(theme.vars || theme).palette.*` Pattern Repeated 40+ Times (~150 bytes gzip)

**Files:** All styled components using theme colors across both packages:
- `TimeClock/Clock.tsx` (8+), `ClockPointer.tsx` (4), `ClockNumber.tsx` (5)
- `PickerDay2/PickerDay2.tsx` (6)
- `PickersTextField/PickersFilledInput/PickersFilledInput.tsx` (4)
- `PickersTextField/PickersInput/PickersInput.tsx` (3)
- `MonthCalendar/MonthCalendarButton.tsx`, `YearCalendar/YearCalendarButton.tsx`
- `DigitalClock/DigitalClock.tsx`, `MultiSectionDigitalClock/MultiSectionDigitalClockSection.tsx`
- `DateRangePickerDay/DateRangePickerDay.tsx`, `DateRangePickerDay2/DateRangePickerDay2.tsx`

**Pattern:**
```ts
color: (theme.vars || theme).palette.text.primary,
backgroundColor: (theme.vars || theme).palette.primary.main,
```

**Fix:** Alias at the top of each styled callback:
```ts
const PickerDay2Root = styled(ButtonBase, ...)(({ theme }) => {
  const t = theme.vars || theme;
  return {
    color: t.palette.text.primary,
    // ...
  };
});
```

Saves ~13 chars per usage within each styled block.

**Est. gzip savings:** ~150 bytes

---

### XP-7: `slotProps.field` Resolver Pattern Repeated 11+ Times (~400 bytes gzip)

**Files:** All Desktop/Mobile picker components in both packages

**Pattern (identical in every non-static picker):**
```ts
field: (ownerState: PickerOwnerState) => ({
  ...resolveComponentProps(defaultizedProps.slotProps?.field, ownerState),
  ...extractValidationProps(defaultizedProps),
}),
```

**Fix:** Extract utility:
```ts
// internals/utils/pickerSlotProps.ts
export function createFieldSlotProps(defaultizedProps) {
  return (ownerState: PickerOwnerState) => ({
    ...resolveComponentProps(defaultizedProps.slotProps?.field, ownerState),
    ...extractValidationProps(defaultizedProps),
  });
}
```

**Est. gzip savings:** ~400 bytes

---

### XP-8: Component Name String Repeated Multiple Times Per Multi-Slot Component (~200 bytes gzip)

**Files:** Every component with multiple styled sub-components:
- `PickersCalendarHeader.tsx` (`'MuiPickersCalendarHeader'` x5)
- `DayCalendar.tsx` (`'MuiDayCalendar'` x multiple)
- `PickersInputBase.tsx` (`'MuiPickersInputBase'` x multiple)
- `MultiSectionDigitalClock.tsx` (`'MuiMultiSectionDigitalClock'` x multiple)
- `DateRangeCalendar.tsx` (`'MuiDateRangeCalendar'` x multiple)

**Fix:** Use a local constant per component file:
```ts
const NAME = 'MuiPickersCalendarHeader';
styled(IconButton, { name: NAME, slot: 'SwitchViewButton', ... })
```

**Est. gzip savings:** ~200 bytes

---

### XP-9: Classes File Boilerplate Repeated in 25+ Files (~600 bytes gzip)

**Files:** All `*Classes.ts` files in both packages (15+ in x-date-pickers, 11+ in x-date-pickers-pro)

**Pattern (identical structure in every file):**
```ts
import generateUtilityClass from '@mui/utils/generateUtilityClass';
import generateUtilityClasses from '@mui/utils/generateUtilityClasses';

export function getXxxUtilityClass(slot: string) {
  return generateUtilityClass('MuiXxx', slot);
}

export const xxxClasses: XxxClasses = generateUtilityClasses('MuiXxx', [...slots]);
```

**Fix:** Create a factory:
```ts
// internals/utils/createClasses.ts
export function createClasses<T extends string>(componentName: string, slots: T[]) {
  return {
    classes: generateUtilityClasses(componentName, slots),
    getUtilityClass: (slot: string) => generateUtilityClass(componentName, slot),
  };
}
```

**Est. gzip savings:** ~600 bytes

---

### XP-10: `localeText.toolbarTitle` Transform Repeated in 4+ shared.tsx Files (~250 bytes gzip)

**Files:**
- `x-date-pickers/src/DatePicker/shared.tsx`
- `x-date-pickers/src/TimePicker/shared.tsx`
- `x-date-pickers-pro/src/DateRangePicker/shared.tsx`
- `x-date-pickers-pro/src/TimeRangePicker/shared.tsx`

**Pattern:**
```ts
const localeText = React.useMemo(() => {
  if (themeProps.localeText?.toolbarTitle == null) return themeProps.localeText;
  return { ...themeProps.localeText, datePickerToolbarTitle: themeProps.localeText.toolbarTitle };
}, [themeProps.localeText]);
```

Only the target key name differs.

**Fix:**
```ts
export function resolveToolbarLocaleText(localeText, toolbarTitleKey) {
  if (localeText?.toolbarTitle == null) return localeText;
  return { ...localeText, [toolbarTitleKey]: localeText.toolbarTitle };
}
```

**Est. gzip savings:** ~250 bytes

---

## x-date-pickers Findings

### P-1: Massive Repeated Placeholder Functions in 41 Locale Files (~2,500 bytes gzip)

**Files:** All 41 locale files in `src/locales/`

**Problem:** Identical arrow functions are copy-pasted across dozens of locale files:

| Pattern | Files Using It |
|---------|---------------|
| `fieldHoursPlaceholder: () => 'hh'` | 27 |
| `fieldMinutesPlaceholder: () => 'mm'` | 33 |
| `fieldSecondsPlaceholder: () => 'ss'` | 34 |
| `fieldMeridiemPlaceholder: () => 'aa'` | 34 |
| `fieldDayPlaceholder: () => 'DD'` | 29 |
| `fieldMonthPlaceholder: (params) => (params.contentType === 'letter' ? 'MMMM' : 'MM')` | 31 |
| `fieldWeekDayPlaceholder: (params) => (params.contentType === 'letter' ? 'EEEE' : 'EE')` | 27 |
| `calendarWeekNumberText: (weekNumber) => \`${weekNumber}\`` | 41 |
| `calendarWeekNumberHeaderText: '#'` | 37 |

~14,200 raw bytes of duplication.

**Fix:** Export shared defaults from a utility file:
```ts
// locales/utils/defaultLocaleHelpers.ts
export const DEFAULT_FIELD_PLACEHOLDERS = {
  fieldHoursPlaceholder: () => 'hh',
  fieldMinutesPlaceholder: () => 'mm',
  fieldSecondsPlaceholder: () => 'ss',
  fieldMeridiemPlaceholder: () => 'aa',
  calendarWeekNumberText: (weekNumber: number) => `${weekNumber}`,
  calendarWeekNumberHeaderText: '#',
};
```

Each locale spreads the defaults and only overrides what differs.

**Est. gzip savings:** ~2,500 bytes

---

### P-2: `fieldYearPlaceholder` Factory Pattern Across 41 Locales (~300 bytes gzip)

**Files:** All 41 locale files

**Pattern:**
```ts
fieldYearPlaceholder: (params) => 'Y'.repeat(params.digitAmount),  // enUS
fieldYearPlaceholder: (params) => 'A'.repeat(params.digitAmount),  // frFR
fieldYearPlaceholder: (params) => 'J'.repeat(params.digitAmount),  // deDE
```

The function body `(params) => 'X'.repeat(params.digitAmount)` is structurally identical across all locales, differing only in the character.

**Fix:**
```ts
export const makeYearPlaceholder = (char: string) =>
  (params: { digitAmount: number }) => char.repeat(params.digitAmount);

// In each locale:
fieldYearPlaceholder: makeYearPlaceholder('Y'),
```

Saves ~40 chars per locale file x 41 files = ~1,640 raw bytes.

**Est. gzip savings:** ~300 bytes

---

### P-3: Near-Identical `useDesktopPicker` and `useMobilePicker` Hooks (~500 bytes gzip)

**Files:**
- `src/internals/hooks/useDesktopPicker/useDesktopPicker.tsx`
- `src/internals/hooks/useMobilePicker/useMobilePicker.tsx`

**Problem:** These two 101-line hooks are ~80 lines identical. Only differences:
1. `PickerPopper` vs `PickersModalDialog` import
2. `variant: 'desktop'` vs `variant: 'mobile'`
3. Popper-specific vs modal-specific slot props
4. Render uses `<PickerPopper>` vs `<PickersModalDialog>`

**Fix:** Extract a `useBaseNonRangePicker` that accepts variant, wrapper component, and slot key params.

**Est. gzip savings:** ~500 bytes

---

### P-4: Duplicate `useOpenPickerButtonAriaLabel` in Manager Files (~80 bytes gzip)

**Files:**
- `src/managers/useDateManager.ts` (lines 38-46)
- `src/managers/useDateTimeManager.ts` (lines 42-50)

**Pattern:** Textually identical 9-line function in both files:
```ts
function useOpenPickerButtonAriaLabel(value: PickerValue) {
  const adapter = usePickerAdapter();
  const translations = usePickerTranslations();
  return React.useMemo(() => {
    const formattedValue = adapter.isValid(value) ? adapter.format(value, 'fullDate') : null;
    return translations.openDatePickerDialogue(formattedValue);
  }, [value, translations, adapter]);
}
```

**Fix:** Extract to `managers/utils.ts` and import in both.

**Est. gzip savings:** ~80 bytes

---

### P-5: Repeated `viewRenderers` Initialization in Date Pickers (~80 bytes gzip)

**Files:**
- `StaticDatePicker/StaticDatePicker.tsx`
- `DesktopDatePicker/DesktopDatePicker.tsx`
- `MobileDatePicker/MobileDatePicker.tsx`
- `DatePicker/DatePicker.tsx`

**Pattern:**
```ts
const viewRenderers: DatePickerViewRenderers<DateView> = {
  day: renderDateViewCalendar,
  month: renderDateViewCalendar,
  year: renderDateViewCalendar,
  ...defaultizedProps.viewRenderers,
};
```

Same for time pickers with `renderTimeViewClock`.

**Fix:** Extract defaults to shared.tsx:
```ts
export const defaultDateViewRenderers = { day: renderDateViewCalendar, month: renderDateViewCalendar, year: renderDateViewCalendar };
```

**Est. gzip savings:** ~80 bytes

---

### P-6: `steps: null` Passed in Every Picker (~20 bytes gzip)

**Files:** All 9 picker components

**Fix:** Make `null` the default value for `steps` inside `useDesktopPicker`/`useMobilePicker`/`useStaticPicker`. Remove all 9 explicit `steps: null` entries.

**Est. gzip savings:** ~20 bytes

---

### P-7: Redundant `label: item.label` in PickersShortcuts (~5 bytes gzip)

**File:** `src/PickersShortcuts/PickersShortcuts.tsx` (line 80)

```ts
const resolvedItems = items.map(({ getValue, ...item }) => {
  return {
    ...item,
    label: item.label,  // REDUNDANT - already in ...item
    onClick: () => { ... },
  };
});
```

**Fix:** Remove `label: item.label`.

**Est. gzip savings:** ~5 bytes

---

### P-8: Duplicate `noop` Function (~5 bytes gzip)

**Files:**
- `src/PickerDay2/PickerDay2.tsx`
- `src/PickersDay/PickersDay.tsx`

Both define `const noop = () => {};`

**Fix:** Import from a shared utility.

**Est. gzip savings:** ~5 bytes

---

### P-9: Underline CSS Duplication Between PickersInput and PickersFilledInput (~200 bytes gzip)

**Files:**
- `src/PickersTextField/PickersInput/PickersInput.tsx`
- `src/PickersTextField/PickersFilledInput/PickersFilledInput.tsx`

Nearly identical CSS blocks for `::before`, `::after`, focused, error, and disabled states. Only the class names differ.

**Fix:** Extract a `createUnderlineStyles(classes, theme)` helper.

**Est. gzip savings:** ~200 bytes

---

### P-10: Repeated `formatTokenMap` Descriptor Objects in Adapters (~200 bytes gzip)

**Files:**
- `src/AdapterDayjs/AdapterDayjs.ts`
- `src/AdapterMoment/AdapterMoment.ts`
- `src/AdapterLuxon/AdapterLuxon.ts`
- `src/AdapterDateFnsBase/AdapterDateFnsBase.ts`

**Pattern:** Objects like `{ sectionType: 'hours', contentType: 'digit', maxLength: 2 }` repeated 5-6 times per adapter x 4 adapters.

**Fix:** Pre-define shared token descriptor constants:
```ts
const HOURS_DIGIT_2 = { sectionType: 'hours', contentType: 'digit', maxLength: 2 } as const;
const MINUTES_DIGIT_2 = { sectionType: 'minutes', contentType: 'digit', maxLength: 2 } as const;
```

**Est. gzip savings:** ~200 bytes

---

### P-11: Repeated `defaultFormats` Object in Dayjs/Moment Adapters (~120 bytes gzip)

**Files:**
- `src/AdapterDayjs/AdapterDayjs.ts`
- `src/AdapterMoment/AdapterMoment.ts`

18 of 20 keys have identical string values. Only `weekdayShort` differs (`'dd'` vs `'ddd'`).

**Fix:** Export a `BASE_ADAPTER_FORMATS` constant, override only differing keys per adapter.

**Est. gzip savings:** ~120 bytes

---

## x-date-pickers-pro Findings

### PRO-1: Three SingleInput Field Components Have Identical Bodies (~700 bytes gzip)

**Files:**
- `src/SingleInputDateRangeField/SingleInputDateRangeField.tsx`
- `src/SingleInputDateTimeRangeField/SingleInputDateTimeRangeField.tsx`
- `src/SingleInputTimeRangeField/SingleInputTimeRangeField.tsx`

**Problem:** Lines 37-62 are essentially identical across all 3, with only name/hook/icon differing:
```tsx
const themeProps = useThemeProps({ props: inProps, name: 'MuiSingleInputXxxRangeField' });
const { slots, slotProps, ...other } = themeProps;
const textFieldProps = useFieldTextFieldProps({ slotProps, ref: inRef, externalForwardedProps: other });
const fieldResponse = useSingleInputXxxRangeField(textFieldProps);
return (
  <PickerFieldUIContextProvider slots={slots} slotProps={slotProps} inputRef={other.inputRef}>
    <PickerFieldUI fieldResponse={fieldResponse} defaultOpenPickerIcon={XxxIcon} />
  </PickerFieldUIContextProvider>
);
```

Plus ~290-330 lines of PropTypes per file are 90%+ identical.

**Fix:** Create a `createSingleInputRangeField` factory parallel to existing `createMultiInputRangeField`.

**Est. gzip savings:** ~700 bytes

---

### PRO-2: Identical Validation Skeleton in 3 Validators (~600 bytes gzip)

**Files:**
- `src/validation/validateDateRange.ts`
- `src/validation/validateDateTimeRange.ts`
- `src/validation/validateTimeRange.ts`

**Problem:** All three share the same ~25-line structural skeleton:
```ts
const [start, end] = value;
const { shouldDisableDate, ...otherProps } = props;
const validations = [
  validateX({ adapter, value: start, timezone, props: { ...otherProps, shouldDisableDate: (day) => !!shouldDisableDate?.(day, 'start') } }),
  validateX({ adapter, value: end, timezone, props: { ...otherProps, shouldDisableDate: (day) => !!shouldDisableDate?.(day, 'end') } }),
];
if (validations[0] || validations[1]) return validations;
if (start === null || end === null) return [null, null];
if (!isRangeValid(adapter, value)) return ['invalidRange', 'invalidRange'];
return [null, null];
```

**Fix:** Extract a `createRangeValidator(validateSingle)` factory.

**Est. gzip savings:** ~600 bytes

---

### PRO-3: Duplicate `useOpenPickerButtonAriaLabel` in Range Managers (~250 bytes gzip)

**Files:**
- `src/managers/useDateRangeManager.ts`
- `src/managers/useDateTimeRangeManager.ts`

Identical 8-line function in both files.

**Fix:** Extract to shared utility in `internals/utils/rangeManagerUtils.ts`.

**Est. gzip savings:** ~250 bytes

---

### PRO-4: Desktop/Mobile Range Picker Pairs Share ~90% Props Setup Code (~500 bytes gzip)

**Files:**
- `src/DesktopDateRangePicker/DesktopDateRangePicker.tsx`
- `src/MobileDateRangePicker/MobileDateRangePicker.tsx`
- (same pattern for DateTime and Time range pickers)

**Problem:** Props construction is near-identical between Desktop and Mobile variants. Only `closeOnSelect`, `calendars`, and `toolbar.hidden` differ.

**Fix:** Extract a `buildRangePickerProps(defaultizedProps, overrides)` helper.

**Est. gzip savings:** ~500 bytes

---

### PRO-5: `useDesktopRangePicker` and `useMobileRangePicker` Share ~30 Lines (~400 bytes gzip)

**Files:**
- `src/internals/hooks/useDesktopRangePicker/useDesktopRangePicker.tsx`
- `src/internals/hooks/useMobileRangePicker/useMobileRangePicker.tsx`

**Problem:** Both share: license verification, `useRangePosition`, `createRangePickerStepNavigation`, `usePicker` call, `onPopperExited` callback, and `PickerRangePositionContext.Provider` wrapper.

**Fix:** Extract `useRangePickerBase` shared hook.

**Est. gzip savings:** ~400 bytes

---

### PRO-6: Repeated `STEPS` Constant and Meridiem View Filtering (~120 bytes gzip)

**Files:**
- `src/DesktopTimeRangePicker/DesktopTimeRangePicker.tsx`
- `src/DesktopDateTimeRangePicker/DesktopDateTimeRangePicker.tsx`

**Pattern:**
```ts
const STEPS: PickerRangeStep[] = [
  { views: null, rangePosition: 'start' },
  { views: null, rangePosition: 'end' },
];
const shouldHoursRendererContainMeridiemView = viewRenderers.hours?.name === renderMultiSectionDigitalClockTimeView.name;
const views = !shouldHoursRendererContainMeridiemView
  ? defaultizedProps.views.filter((view) => view !== 'meridiem')
  : defaultizedProps.views;
```

Verbatim identical in both files.

**Fix:** Move `STEPS` to `internals/constants` and extract meridiem filtering to a utility.

**Est. gzip savings:** ~120 bytes

---

### PRO-7: Shared `resolveTimeViewsResponse` Logic in Time/DateTime Range Shared Files (~150 bytes gzip)

**Files:**
- `src/TimeRangePicker/shared.tsx`
- `src/DateTimeRangePicker/shared.tsx`

**Fix:** Extract `resolveTimeRangePickerDefaults(themeProps, adapter)` utility.

**Est. gzip savings:** ~150 bytes

---

## Summary Table

| ID | Finding | Est. GZIP Savings | Priority |
|----|---------|-------------------|----------|
| **XP-2** | PropTypes warning comment block (50+ files) | **~4,500 bytes** | HIGH |
| **XP-1** | Shared `sx` PropType (50+ files) | **~3,000 bytes** | HIGH |
| **P-1** | Locale placeholder function duplication (41 files) | **~2,500 bytes** | HIGH |
| **XP-3** | Shared `selectedSections` PropType (15+ files) | **~800 bytes** | HIGH |
| **PRO-1** | `createSingleInputRangeField` factory (3 files) | **~700 bytes** | MEDIUM |
| **PRO-2** | `createRangeValidator` factory (3 files) | **~600 bytes** | MEDIUM |
| **XP-9** | Classes file boilerplate factory (25+ files) | **~600 bytes** | MEDIUM |
| **P-3** | Merge `useDesktopPicker`/`useMobilePicker` hooks | **~500 bytes** | MEDIUM |
| **PRO-4** | Shared range picker props constructor (6 files) | **~500 bytes** | MEDIUM |
| **XP-7** | Shared `field` slotProp factory (11+ files) | **~400 bytes** | MEDIUM |
| **PRO-5** | `useRangePickerBase` shared hook (2 files) | **~400 bytes** | MEDIUM |
| **P-2** | `makeYearPlaceholder` factory (41 locales) | **~300 bytes** | LOW |
| **PRO-3** | Shared `useOpenPickerButtonAriaLabel` range (2 files) | **~250 bytes** | LOW |
| **XP-4** | Shared `sectionListRef` PropType (4 files) | **~250 bytes** | LOW |
| **XP-10** | `resolveToolbarLocaleText` utility (4 files) | **~250 bytes** | LOW |
| **P-10** | Shared `formatTokenMap` descriptors (4 adapters) | **~200 bytes** | LOW |
| **XP-8** | Component name string constants (5+ files) | **~200 bytes** | LOW |
| **P-9** | Shared underline CSS styles (2 files) | **~200 bytes** | LOW |
| **XP-5** | Shared `elements` PropType (5 files) | **~180 bytes** | LOW |
| **XP-6** | `theme.vars \|\| theme` aliasing (40+ uses) | **~150 bytes** | LOW |
| **PRO-7** | Shared `resolveTimeViewsResponse` logic (2 files) | **~150 bytes** | LOW |
| **P-11** | Shared `BASE_ADAPTER_FORMATS` (2 adapters) | **~120 bytes** | LOW |
| **PRO-6** | Shared `STEPS` constant + meridiem filter (2 files) | **~120 bytes** | LOW |
| **P-4** | Shared `useOpenPickerButtonAriaLabel` (2 managers) | **~80 bytes** | LOW |
| **P-5** | Default `viewRenderers` in shared files (4 files) | **~80 bytes** | LOW |
| **P-6** | Default `steps: null` parameter (9 files) | **~20 bytes** | LOW |
| **P-7** | Remove redundant `label: item.label` (1 file) | **~5 bytes** | LOW |
| **P-8** | Shared `noop` function (2 files) | **~5 bytes** | LOW |

### **Total estimated GZIP savings: ~16,000 bytes (~15.6 KB)**

### Top 3 highest-ROI changes:
1. **XP-2** (remove PropTypes warning comments): ~4.5 KB gzip, zero risk, automated script change
2. **XP-1** (shared `sx` PropType): ~3 KB gzip, low risk, simple refactor
3. **P-1** (locale placeholder dedup): ~2.5 KB gzip, medium effort, significant impact
