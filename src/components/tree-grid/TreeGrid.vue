<template>
  <section
    class="tree-grid"
    aria-label="Дерево элементов"
    :aria-busy="loading"
  >
    <AgGridVue
      class="tree-grid__table"
      :modules="modules"
      :grid-options="gridOptions"
      :row-data="rowData"
      :loading="loading"
      @model-updated="refreshPositions"
    />
  </section>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  import { AgGridVue } from 'ag-grid-vue3'
  import {
    gridOptions,
    modules,
  } from './grid.config'

  import type { ModelUpdatedEvent } from 'ag-grid-community'
  import type {
    TreeGridItem,
    TreeGridRow,
  } from './types'

  const props = defineProps<{
    items: readonly TreeGridItem[]
    loading: boolean
  }>()

  const toRowId = (id: TreeGridItem['id']): string => {
    return `${typeof id}:${id}`
  }

  const rowData = computed<TreeGridRow[]>(() => {
    return props.items.map((item) => ({
      ...item,
      rowId: toRowId(item.id),
      parentRowId: item.parent === null
        ? null
        : toRowId(item.parent),
    }))
  })

  const refreshPositions = ({ api }: ModelUpdatedEvent<TreeGridRow>): void => {
    api.refreshCells({ columns: ['position'], force: true })
  }
</script>

<style scoped>
  .tree-grid {
    padding: 12px;
    border-radius: 6px;
    background: #f3f2f1;
  }

  .tree-grid__table {
    width: 100%;
  }

  .tree-grid :deep(.tree-grid__position),
  .tree-grid :deep(.tree-grid__group-name),
  .tree-grid :deep(.ag-row-group .ag-group-value) {
    font-weight: 600;
  }

  .tree-grid :deep(.tree-grid__position) {
    font-variant-numeric: tabular-nums;
  }

  .tree-grid :deep(.tree-grid__category .ag-cell-wrapper) {
    padding-inline-start: 0;
  }

  .tree-grid :deep(.tree-grid__category .ag-group-value) {
    margin-inline-start: calc(var(--ag-indentation-level) * var(--ag-row-group-indent-size));
  }
</style>
