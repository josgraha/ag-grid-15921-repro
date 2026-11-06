# AG Grid #15921 repro

Minimal reproduction for [ag-grid/ag-grid#15921](https://github.com/ag-grid/ag-grid/issues/15921):
**the header height is not recomputed when the header rows change type but not count** (pivot + floating filters, server-side row model).

AG Grid Enterprise 36.3.0, plain JavaScript, loaded from the jsDelivr CDN. No build step: open `index.html`.

## Steps

1. Load the page. Header rows are `[column, floating filter]`; the status line says `OK`.
2. Click **1. Apply saved pivot column state**. Pivot mode turns on with one pivot column (`year`).
   Header rows become `[pivot column group, column]`: still 2 rows, different types.
   - **Actual:** the header stays ~49px while its rows need 96px. The rows overflow and hide the first body row (`Ireland`). The status line turns red.
   - **Expected:** the header is resized to fit its rows.
3. Click **2. Auto-size columns**. This fires `displayedColumnsChanged` again, the height is recomputed, and `Ireland` reappears.

## Setup

- Primary columns: `floatingFilter: true`.
- Pivot result columns: `floatingFilter: false` (via `processPivotResultColDef`).
- `rowModelType: 'serverSide'` with a fake in-memory datasource that returns `pivotResultFields` in pivot mode.
