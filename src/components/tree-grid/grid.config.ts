import {
  CellStyleModule,
  ClientSideRowModelModule,
  RenderApiModule,
  themeQuartz,
} from 'ag-grid-community'
import { TreeDataModule } from 'ag-grid-enterprise'

import type { GridOptions } from 'ag-grid-community'
import type { TreeGridRow } from './types'

export const modules = [
  ClientSideRowModelModule,
  TreeDataModule,
  RenderApiModule,
  CellStyleModule,
]

export const gridOptions: GridOptions<TreeGridRow> = {
  theme: themeQuartz.withParams({
    backgroundColor: '#ffffff',
    foregroundColor: '#454545',
    headerBackgroundColor: '#ffffff',
    headerTextColor: '#454545',
    borderColor: '#c9c9c9',
    rowBorder: true,
    columnBorder: false,
    headerColumnBorder: true,
    headerColumnBorderHeight: '100%',
    pinnedColumnBorder: false,
    wrapperBorder: false,
    wrapperBorderRadius: 2,
    fontFamily: 'Arial, sans-serif',
    fontSize: 14,
    headerFontSize: 13,
    headerFontWeight: 600,
    rowHeight: 48,
    headerHeight: 48,
    rowGroupIndentSize: 16,
    cellHorizontalPadding: 16,
    accentColor: '#365e8f',
    rowHoverColor: '#f5f7fa',
  }),

  defaultColDef: {
    sortable: false,
    resizable: false,
    suppressMovable: true,
  },

  columnDefs: [
    {
      colId: 'position',
      headerName: '№ п/п',
      width: 72,
      pinned: 'left',
      lockPinned: true,
      cellClass: 'tree-grid__position',
      valueGetter: ({ node }) => {
        return node?.rowIndex == null
          ? ''
          : node.rowIndex + 1
      },
    },
    {
      field: 'label',
      headerName: 'Наименование',
      minWidth: 220,
      flex: 1,
      cellClassRules: {
        'tree-grid__group-name': ({ node }) => {
          return node.group === true
        },
      },
    },
  ],

  autoGroupColumnDef: {
    headerName: 'Категория',
    cellClass: 'tree-grid__category',
    minWidth: 260,
    width: 300,
    valueGetter: ({ node }) => {
      return node?.group
        ? 'Группа'
        : 'Элемент'
    },
    cellRendererParams: { suppressCount: true },
  },

  getRowId: ({ data }) => {
    return data.rowId
  },
  treeData: true,
  treeDataParentIdField: 'parentRowId',
  groupDefaultExpanded: -1,
  suppressGroupRowsSticky: true,
  animateRows: false,
  overlayLoadingTemplate: "<span role='status'>Загрузка данных…</span>",
  overlayNoRowsTemplate: '<span>Нет элементов для отображения</span>',
  domLayout: 'autoHeight',
}
