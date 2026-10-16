import {
  onMounted,
  onScopeDispose,
  shallowReadonly,
  shallowRef,
} from 'vue'

import { TreeStore } from '@/tree-store'

import type {
  TreeItem,
  TreeItemId,
  TreeStoreOptions,
} from '@/tree-store'

const LOAD_DELAY_MS = 2000

export function useTreeStore<T extends TreeItem>(url: string, options: TreeStoreOptions = {}) {
  const store = new TreeStore<T>([], options)
  const items = shallowRef(store.getAll())
  const isLoading = shallowRef(true)
  const controller = new AbortController()

  let delayTimer: ReturnType<typeof setTimeout> | undefined
  let finishDelay: (() => void) | undefined

  const syncItems = (): void => {
    items.value = store.getAll()
  }

  const setItems = (nextItems: readonly T[]): void => {
    store.setItems(nextItems)
    syncItems()
  }

  const addItem = (item: T): void => {
    store.addItem(item)
    syncItems()
  }

  const updateItem = (item: T): void => {
    store.updateItem(item)
    syncItems()
  }

  const removeItem = (id: TreeItemId): void => {
    store.removeItem(id)
    syncItems()
  }

  onMounted(async () => {
    try {
      await new Promise<void>((resolve) => {
        finishDelay = resolve
        delayTimer = setTimeout(resolve, LOAD_DELAY_MS)
      })

      if (controller.signal.aborted) {
        return
      }

      const response = await fetch(url, { signal: controller.signal })
      const loadedItems: T[] = await response.json()

      if (!controller.signal.aborted) {
        setItems(loadedItems)
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        throw error
      }
    } finally {
      isLoading.value = false
    }
  })

  onScopeDispose(() => {
    controller.abort()
    clearTimeout(delayTimer)
    finishDelay?.()
  })

  return {
    items: shallowReadonly(items),
    isLoading: shallowReadonly(isLoading),
    setItems,
    addItem,
    updateItem,
    removeItem,
  }
}
