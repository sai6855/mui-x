# useGridPrintExport Hook - Detailed Explanation

## Overview

The `useGridPrintExport` hook is a sophisticated React hook that enables print functionality for MUI X Data Grid components. Located in `packages/x-data-grid/src/hooks/features/export/useGridPrintExport.tsx`, this hook manages the entire print export process including grid state management, styling, layout calculations, and print dialog handling.

## Hook Dependencies

The hook requires several other grid features to be available:
- `useGridColumns` (state) - for column definitions and visibility
- `useGridFilter` (state) - for filtered data
- `useGridSorting` (state) - for sorted data  
- `useGridParamsApi` (method) - for cell parameter access

## Hook Parameters

```typescript
const useGridPrintExport = (
  apiRef: RefObject<GridPrivateApiCommunity>,
  props: Pick<DataGridProcessedProps, 'pagination' | 'columnHeaderHeight' | 'headerFilterHeight'>
): void
```

- **apiRef**: Reference to the grid's API containing all grid methods and state
- **props**: Grid properties needed for layout calculations (pagination settings, header heights)

## Internal State Variables

The hook maintains several React refs to track previous state for restoration after printing:

```typescript
const doc = React.useRef<Document | null>(null);
const previousGridState = React.useRef<GridInitialStateCommunity | null>(null);
const previousColumnVisibility = React.useRef<{ [key: string]: boolean }>({});
const previousRows = React.useRef<GridValidRowModel[]>([]);
const previousVirtualizationState = React.useRef<GridStateCommunity['virtualization']>(null);
```

## Core Functions

### 1. `raf()` - Request Animation Frame Helper

```typescript
function raf() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}
```

**Purpose**: Provides a promise-based wrapper around `requestAnimationFrame` to ensure state changes are applied before proceeding with print operations.

**Usage**: Called after state updates to wait for the next animation frame, ensuring the DOM is updated before capturing the grid for printing.

### 2. `buildPrintWindow()` - Print Window Creation

```typescript
function buildPrintWindow(title?: string): HTMLIFrameElement {
  const iframeEl = document.createElement('iframe');
  iframeEl.style.position = 'absolute';
  iframeEl.style.width = '0px';
  iframeEl.style.height = '0px';
  iframeEl.title = title || document.title;
  return iframeEl;
}
```

**Purpose**: Creates an invisible iframe that will serve as the print window.

**Detailed Functionality**:
- Creates an invisible iframe (0px dimensions, absolute positioning)
- Sets the iframe title to either the provided filename or the current document title
- The invisible nature prevents UI disruption while preparing the print content
- Returns the iframe element for further manipulation

### 3. `updateGridColumnsForPrint()` - Column Visibility Management

```typescript
const updateGridColumnsForPrint = React.useCallback(
  (fields?: string[], allColumns?: boolean, includeCheckboxes?: boolean) =>
    new Promise<void>((resolve) => {
      const exportedColumnFields = getColumnsToExport({
        apiRef,
        options: { fields, allColumns },
      }).map((column) => column.field);

      const columns = gridColumnDefinitionsSelector(apiRef);
      const newColumnVisibilityModel: Record<string, boolean> = {};
      
      columns.forEach((column) => {
        newColumnVisibilityModel[column.field] = exportedColumnFields.includes(column.field);
      });

      if (includeCheckboxes) {
        newColumnVisibilityModel[GRID_CHECKBOX_SELECTION_COL_DEF.field] = true;
      }

      apiRef.current.setColumnVisibilityModel(newColumnVisibilityModel);
      resolve();
    }),
  [apiRef],
);
```

**Purpose**: Manages which columns should be visible in the printed output.

**Detailed Functionality**:
- **Parameter Processing**: 
  - `fields`: Specific column fields to include
  - `allColumns`: Whether to include hidden columns
  - `includeCheckboxes`: Whether to show selection checkboxes
- **Column Filtering**: Uses `getColumnsToExport` utility to determine which columns should be exported
- **Visibility Model Creation**: Creates a new column visibility model where only export-relevant columns are visible
- **Checkbox Handling**: Optionally includes checkbox selection column if requested
- **State Update**: Updates the grid's column visibility model and resolves promise when complete
- **Return**: Promise that resolves when column visibility changes are applied

### 4. `updateGridRowsForPrint()` - Row Data Management

```typescript
const updateGridRowsForPrint = React.useCallback(
  (getRowsToExport: NonNullable<GridPrintExportOptions['getRowsToExport']>) => {
    const rowsToExportIds = getRowsToExport({ apiRef });

    const newRows = rowsToExportIds.reduce<GridValidRowModel[]>((acc, id) => {
      const row = apiRef.current.getRow(id);
      if (!row[GRID_ID_AUTOGENERATED]) {
        acc.push(row);
      }
      return acc;
    }, [] as GridValidRowModel[]);

    apiRef.current.setRows(newRows);
  },
  [apiRef],
);
```

**Purpose**: Filters and updates the grid rows to only include those that should be printed.

**Detailed Functionality**:
- **Row Selection**: Calls the provided `getRowsToExport` function to get row IDs to include
- **Row Filtering**: Filters out auto-generated rows (like group headers) using `GRID_ID_AUTOGENERATED` flag
- **Data Reduction**: Creates a new array containing only the valid rows for export
- **State Update**: Updates the grid's row data with the filtered rows
- **Purpose**: Ensures only relevant, user-data rows are included in the print output

### 5. `handlePrintWindowLoad()` - Print Content Setup

This is the most complex function that handles the actual preparation of the print content:

```typescript
const handlePrintWindowLoad: PrintWindowOnLoad = React.useCallback(
  (printWindow, options): void => {
    const normalizeOptions = {
      copyStyles: true,
      hideToolbar: false,
      hideFooter: false,
      includeCheckboxes: false,
      ...options,
    };
```

**Purpose**: Sets up the print window content with the grid clone and applies styling.

**Detailed Functionality**:

#### a) Option Normalization
Sets default values for all print options and merges with user-provided options.

#### b) Print Document Access
```typescript
const printDoc = printWindow.contentDocument;
if (!printDoc) {
  return;
}
```
Gets the document from the iframe and exits early if not available.

#### c) Grid Cloning and Layout Preparation
```typescript
const gridRootElement = apiRef.current.rootElementRef.current;
const gridClone = gridRootElement!.cloneNode(true) as HTMLElement;

// Allow to overflow to not hide the border of the last row
const gridMain: HTMLElement | null = gridClone.querySelector(`.${gridClasses.main}`);
gridMain!.style.overflow = 'visible';

// See https://support.google.com/chrome/thread/191619088?hl=en&msgid=193009642
gridClone!.style.contain = 'size';
```

- **Deep Clone**: Creates a complete copy of the grid DOM structure
- **Overflow Fix**: Sets overflow to visible to prevent border clipping
- **Chrome Fix**: Sets CSS containment to 'size' to fix Chrome printing issues

#### d) Element Height Calculations
```typescript
let gridToolbarElementHeight =
  gridRootElement!.querySelector<HTMLElement>(`.${gridClasses.toolbarContainer}`)
    ?.offsetHeight || 0;
let gridFooterElementHeight =
  gridRootElement!.querySelector<HTMLElement>(`.${gridClasses.footerContainer}`)
    ?.offsetHeight || 0;
```

Measures the current heights of toolbar and footer elements for layout calculations.

#### e) Optional Element Removal
```typescript
if (normalizeOptions.hideToolbar) {
  gridClone.querySelector(`.${gridClasses.toolbarContainer}`)?.remove();
  gridToolbarElementHeight = 0;
}

if (normalizeOptions.hideFooter && gridFooterElement) {
  gridFooterElement.remove();
  gridFooterElementHeight = 0;
}
```

Removes toolbar and/or footer from the print layout if requested.

#### f) Height Calculation and Layout
```typescript
const computedTotalHeight =
  rowsMeta.currentPageTotalHeight +
  getTotalHeaderHeight(apiRef, props) +
  gridToolbarElementHeight +
  gridFooterElementHeight;
gridClone.style.height = `${computedTotalHeight}px`;
gridClone.style.boxSizing = 'content-box';
```

- **Total Height**: Calculates the exact height needed for all content
- **Box Sizing**: Sets to content-box to exclude border from height calculation

#### g) Footer Positioning
```typescript
if (!normalizeOptions.hideFooter && gridFooterElement) {
  gridFooterElement.style.position = 'absolute';
  gridFooterElement.style.width = '100%';
  gridFooterElement.style.top = `${computedTotalHeight - gridFooterElementHeight}px`;
}
```

Positions the footer at the bottom of the grid when using custom row export functions.

#### h) DOM Injection and Safari Fix
```typescript
// printDoc.body.appendChild(gridClone); should be enough but a clone isolation bug in Safari
// prevents us to do it
const container = document.createElement('div');
container.appendChild(gridClone);
printDoc.body.style.marginTop = '0px';
printDoc.body.innerHTML = container.innerHTML;
```

- **Safari Bug Workaround**: Uses innerHTML injection instead of appendChild due to Safari clone isolation issues
- **Margin Reset**: Removes default body margin for cleaner printing

#### i) Custom Styling Application
```typescript
const defaultPageStyle =
  typeof normalizeOptions.pageStyle === 'function'
    ? normalizeOptions.pageStyle()
    : normalizeOptions.pageStyle;
if (typeof defaultPageStyle === 'string') {
  const styleElement = printDoc.createElement('style');
  styleElement.appendChild(printDoc.createTextNode(defaultPageStyle));
  printDoc.head.appendChild(styleElement);
}
```

Applies custom page styles provided by the user.

#### j) Body Class Application
```typescript
if (normalizeOptions.bodyClassName) {
  printDoc.body.classList.add(...normalizeOptions.bodyClassName.split(' '));
}
```

Adds custom CSS classes to the print document body.

#### k) Style Sheet Copying
```typescript
let stylesheetLoadPromises: Promise<void>[] = [];

if (normalizeOptions.copyStyles) {
  const rootCandidate = gridRootElement!.getRootNode();
  const root =
    rootCandidate.constructor.name === 'ShadowRoot'
      ? (rootCandidate as ShadowRoot)
      : doc.current;

  stylesheetLoadPromises = loadStyleSheets(printDoc, root!);
}
```

- **Style Source**: Determines whether to copy from shadow DOM or document
- **Style Loading**: Uses `loadStyleSheets` utility to copy all stylesheets
- **Async Handling**: Returns promises for stylesheet loading completion

#### l) Print Trigger
```typescript
if (process.env.NODE_ENV !== 'test') {
  Promise.all(stylesheetLoadPromises).then(() => {
    printWindow.contentWindow!.print();
  });
}
```

Waits for all stylesheets to load before triggering the browser's print dialog.

### 6. `handlePrintWindowAfterPrint()` - Cleanup and State Restoration

```typescript
const handlePrintWindowAfterPrint = React.useCallback(
  (printWindow: HTMLIFrameElement): void => {
    // Remove the print iframe
    doc.current!.body.removeChild(printWindow);

    // Revert grid to previous state
    apiRef.current.restoreState(previousGridState.current || {});
    if (!previousGridState.current?.columns?.columnVisibilityModel) {
      apiRef.current.setColumnVisibilityModel(previousColumnVisibility.current);
    }

    apiRef.current.setState((state) => ({
      ...state,
      virtualization: previousVirtualizationState.current!,
    }));
    apiRef.current.setRows(previousRows.current);

    // Clear local state
    previousGridState.current = null;
    previousColumnVisibility.current = {};
    previousRows.current = [];
  },
  [apiRef],
);
```

**Purpose**: Cleans up after printing and restores the grid to its original state.

**Detailed Functionality**:
- **iframe Removal**: Removes the print iframe from the DOM
- **State Restoration**: Restores the complete grid state from the saved snapshot
- **Column Visibility**: Restores column visibility if it wasn't included in the main state
- **Virtualization**: Re-enables virtualization for performance
- **Row Data**: Restores the original row data
- **Memory Cleanup**: Clears all saved state references to prevent memory leaks

### 7. `exportDataAsPrint()` - Main Export Function

This is the primary export function that orchestrates the entire print process:

```typescript
const exportDataAsPrint = React.useCallback<GridPrintExportApi['exportDataAsPrint']>(
  async (options) => {
    logger.debug(`Export data as Print`);

    if (!apiRef.current.rootElementRef!.current) {
      throw new Error('MUI X: No grid root element available.');
    }
```

**Purpose**: Main entry point for the print export functionality.

**Detailed Process**:

#### a) Validation and State Backup
```typescript
previousGridState.current = apiRef.current.exportState();
previousColumnVisibility.current = gridColumnVisibilityModelSelector(apiRef);
previousRows.current = apiRef.current
  .getSortedRows()
  .filter((row) => !row[GRID_ID_AUTOGENERATED]);
```

- **Validation**: Ensures grid root element exists
- **State Backup**: Saves complete grid state for later restoration
- **Column Backup**: Saves current column visibility model
- **Row Backup**: Saves current sorted and filtered rows

#### b) Pagination Handling
```typescript
if (props.pagination) {
  const visibleRowCount = gridExpandedRowCountSelector(apiRef);
  const paginationModel = {
    page: 0,
    pageSize: visibleRowCount,
  };
  apiRef.current.setState((state) => ({
    ...state,
    pagination: {
      ...state.pagination,
      paginationModel: getDerivedPaginationModel(
        state.pagination,
        'DataGridPro',
        paginationModel,
      ),
    },
  }));
}
```

- **Pagination Check**: Only processes if pagination is enabled
- **Row Count**: Gets the total number of expanded/visible rows
- **Page Reset**: Sets pagination to show all rows on page 0
- **Pro Signature**: Uses DataGridPro signature to bypass the 100-row limit

#### c) Virtualization Disable
```typescript
previousVirtualizationState.current = apiRef.current.state.virtualization;
apiRef.current.setState((state) => ({
  ...state,
  virtualization: {
    ...state.virtualization,
    enabled: false,
    enabledForColumns: false,
  },
}));
```

Disables both row and column virtualization to ensure all content is rendered for printing.

#### d) Column and Row Updates
```typescript
await updateGridColumnsForPrint(
  options?.fields,
  options?.allColumns,
  options?.includeCheckboxes,
);

updateGridRowsForPrint(options?.getRowsToExport ?? defaultGetRowsToExport);

await raf(); // wait for the state changes to take action
```

- **Column Update**: Applies column visibility changes and waits for completion
- **Row Update**: Filters rows based on export criteria
- **State Sync**: Waits for next animation frame to ensure all changes are applied

#### e) Print Window Creation and Setup
```typescript
const printWindow = buildPrintWindow(options?.fileName);
if (process.env.NODE_ENV === 'test') {
  // Test environment handling
  doc.current!.body.appendChild(printWindow);
  handlePrintWindowLoad(printWindow, options);
  handlePrintWindowAfterPrint(printWindow);
} else {
  // Production environment handling
  printWindow.onload = () => {
    handlePrintWindowLoad(printWindow, options);

    const mediaQueryList = printWindow.contentWindow!.matchMedia('print');
    mediaQueryList.addEventListener('change', (mql) => {
      const isAfterPrint = mql.matches === false;
      if (isAfterPrint) {
        handlePrintWindowAfterPrint(printWindow);
      }
    });
  };
  doc.current!.body.appendChild(printWindow);
}
```

- **Test Mode**: Immediately executes all steps synchronously for testing
- **Production Mode**: Sets up async loading and print event listeners
- **Print Detection**: Uses media query to detect when printing is complete
- **Cleanup Trigger**: Automatically cleans up after print dialog closes

### 8. `addExportMenuButtons()` - UI Integration

```typescript
const addExportMenuButtons = React.useCallback<GridPipeProcessor<'exportMenu'>>(
  (
    initialValue,
    options: { printOptions: GridPrintExportOptions & GridExportDisplayOptions },
  ) => {
    if (options.printOptions?.disableToolbarButton) {
      return initialValue;
    }
    return [
      ...initialValue,
      {
        component: <GridPrintExportMenuItem options={options.printOptions} />,
        componentName: 'printExport',
      },
    ];
  },
  [],
);
```

**Purpose**: Integrates the print export button into the grid's export menu.

**Detailed Functionality**:
- **Conditional Addition**: Only adds the button if not disabled via options
- **Menu Integration**: Adds the print export menu item to the existing export menu
- **Component Creation**: Creates a `GridPrintExportMenuItem` component with the provided options
- **Pipe Processing**: Uses the grid's pipe processor system for menu extension

## API Registration

```typescript
const printExportApi: GridPrintExportApi = {
  exportDataAsPrint,
};

useGridApiMethod(apiRef, printExportApi, 'public');
```

The hook registers the `exportDataAsPrint` method as a public API method, making it available through `apiRef.current.exportDataAsPrint()`.

## Pipe Processor Registration

```typescript
useGridRegisterPipeProcessor(apiRef, 'exportMenu', addExportMenuButtons);
```

Registers the export menu button processor to automatically add the print export option to the grid's export menu.

## Key Features and Design Decisions

### 1. **State Management**
- Comprehensive state backup and restoration ensures the grid returns to its exact previous state
- Separate handling of column visibility for edge cases where it's not included in the main state export

### 2. **Performance Optimization**
- Virtualization is disabled during print to ensure all content renders
- Pagination is temporarily modified to show all rows
- Promise-based async operations ensure proper sequencing

### 3. **Cross-Browser Compatibility**
- Specific workarounds for Safari's clone isolation bug
- Chrome-specific CSS containment fix
- Media query-based print completion detection

### 4. **Styling Flexibility**
- Comprehensive style copying from the source document
- Support for custom page styles (string or function)
- Custom body classes for print-specific styling
- Shadow DOM support for style copying

### 5. **User Experience**
- Invisible iframe prevents UI disruption during preparation
- Automatic cleanup after printing
- Configurable export options (toolbar/footer hiding, checkbox inclusion)
- Custom row selection through `getRowsToExport` function

### 6. **Error Handling**
- Validation of required elements before proceeding
- Graceful handling of missing print document
- Safe fallbacks for missing style sources

This hook represents a sophisticated approach to print functionality that balances user experience, performance, and cross-browser compatibility while providing extensive customization options.