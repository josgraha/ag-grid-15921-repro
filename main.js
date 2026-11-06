// Minimal repro for https://github.com/ag-grid/ag-grid/issues/15921
// Header height is not recomputed when the header rows change type but not count.
//
// Before: header rows = [column, floating filter]       (2 rows)
// After:  header rows = [pivot column group, column]    (2 rows)
// The header keeps the height of ~1 row, so its rows overflow onto the body.

const COUNTRIES = ['Ireland', 'France', 'Germany', 'Italy', 'Spain', 'Norway', 'Sweden', 'Japan'];
const YEARS = [2020, 2024];

// Primary columns have floating filters.
const columnDefs = [
  { field: 'country', enableRowGroup: true, filter: 'agTextColumnFilter', floatingFilter: true },
  { field: 'year', enablePivot: true, filter: 'agNumberColumnFilter', floatingFilter: true },
  { field: 'gold', enableValue: true, aggFunc: 'sum', filter: 'agNumberColumnFilter', floatingFilter: true },
];

// Saved column state that turns on pivot mode with one pivot column.
const savedPivotState = {
  state: [
    { colId: 'country', rowGroup: true, rowGroupIndex: 0 },
    { colId: 'year', pivot: true, pivotIndex: 0 },
    { colId: 'gold', aggFunc: 'sum' },
  ],
  applyOrder: true,
};

// Fake server: no pivot -> flat rows; pivot -> grouped rows with pivot result fields.
const datasource = {
  getRows(params) {
    const { pivotMode, pivotCols, rowGroupCols, groupKeys } = params.request;
    setTimeout(() => {
      if (pivotMode && pivotCols.length && rowGroupCols.length && groupKeys.length === 0) {
        const pivotResultFields = YEARS.map((y) => `${y}_gold`);
        const rowData = COUNTRIES.map((country, i) => {
          const row = { country };
          YEARS.forEach((y, j) => (row[`${y}_gold`] = (i + 1) * (j + 3)));
          return row;
        });
        params.success({ rowData, rowCount: rowData.length, pivotResultFields });
        return;
      }
      const rowData = COUNTRIES.flatMap((country, i) =>
        YEARS.map((year, j) => ({ country, year, gold: (i + 1) * (j + 3) }))
      );
      params.success({ rowData, rowCount: rowData.length });
    }, 50);
  },
};

const gridOptions = {
  rowModelType: 'serverSide',
  columnDefs,
  serverSideDatasource: datasource,
  // Pivot result columns have no floating filter.
  processPivotResultColDef: (colDef) => {
    colDef.floatingFilter = false;
  },
};

const gridDiv = document.querySelector('#myGrid');
let api = agGrid.createGrid(gridDiv, gridOptions);

function report() {
  const header = gridDiv.querySelector('.ag-header');
  if (!header) return;
  const rows = [...header.querySelectorAll('.ag-header-row')];
  const needed = rows.reduce((max, r) => Math.max(max, r.offsetTop + r.offsetHeight), 0);
  const actual = header.offsetHeight;
  const types = rows.map((r) =>
    [...r.classList].find((c) => /^ag-header-row-(column|group|filter)$/.test(c)).replace('ag-header-row-', '')
  );
  const ok = actual >= needed;
  document.querySelector('#status').textContent =
    `header rows: ${rows.length} [${types.join(' | ')}]\n` +
    `header height: ${actual}px, rows need: ${needed}px  ->  ${ok ? 'OK' : 'BUG: header rows overflow onto the body'}`;
  document.querySelector('#status').style.color = ok ? 'green' : 'crimson';
}

document.querySelector('#applyPivot').addEventListener('click', () => {
  api.setGridOption('pivotMode', true);
  api.applyColumnState(savedPivotState);
});
document.querySelector('#autoSize').addEventListener('click', () => api.autoSizeAllColumns());
document.querySelector('#reset').addEventListener('click', () => {
  api.destroy();
  api = agGrid.createGrid(gridDiv, gridOptions);
});

// Poll: no grid event fires after the bad state is reached, which is the bug.
setInterval(report, 250);
