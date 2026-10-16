<template>
  <button @click="addItemWithParams">
    Добавить элемент
  </button>
  <button @click="updateItemWithParams">
    Перенести элемент
  </button>
  <button @click="removeItemWithParams">
    Удалить поддерево
  </button>
  <button @click="setItemsWithParams">
    Заменить данные
  </button>

  <TreeGrid
    :items="items"
    :loading="isLoading"
  />
</template>

<script setup lang="ts">
  import TreeGrid from '@/components/tree-grid/TreeGrid.vue'
  import { useTreeStore } from '@/composables/useTreeStore'
  import '@/styles.css'

  import type { TreeGridItem } from '@/components/tree-grid/types'

  const {
    items,
    isLoading,
    addItem,
    updateItem,
    removeItem,
    setItems,
  } = useTreeStore<TreeGridItem>('/items.json', { validate: true })

  const addItemWithParams = (): void => {
    addItem({ id: 9, parent: 3, label: 'Новый элемент' })
  }

  const updateItemWithParams = (): void => {
    updateItem({ id: 9, parent: 1, label: 'Новый элемент' })
  }

  const removeItemWithParams = (): void => {
    removeItem('91064cef')
  }

  const setItemsWithParams = (): void => {
    setItems([{ id: 10, parent: null, label: 'Новый корень' }])
  }
</script>
