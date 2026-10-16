<template>
  <main class="app">
    <TreeGrid
      :items="items"
      :loading="isLoading"
    />
  </main>
</template>

<script setup lang="ts">
  import {
    onMounted,
    shallowRef,
  } from 'vue'

  import TreeGrid from '@/components/tree-grid/TreeGrid.vue'

  import type { TreeGridItem } from '@/components/tree-grid/types'

  const items = shallowRef<TreeGridItem[]>([])
  const isLoading = shallowRef(true)

  onMounted(async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}items.json`)

    items.value = await response.json()
    isLoading.value = false
  })
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
