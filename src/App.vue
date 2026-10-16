<template>
  <main class="app">
    <TreeGrid
      :items="items"
      :loading="isLoading"
    />
  </main>
</template>

<script setup lang="ts">
  import TreeGrid from '@/components/tree-grid/TreeGrid.vue'
  import { useTreeStore } from '@/composables/useTreeStore'

  import type { TreeGridItem } from '@/components/tree-grid/types'

  const {
    items,
    isLoading,
  } = useTreeStore<TreeGridItem>(`${import.meta.env.BASE_URL}items.json`)
</script>

<style scoped>
  .app {
    max-width: 1100px;
    margin-inline: auto;
    padding: 48px 24px;
  }

  @media (max-width: 600px) {
    .app {
      padding: 24px 12px;
    }
  }
</style>
