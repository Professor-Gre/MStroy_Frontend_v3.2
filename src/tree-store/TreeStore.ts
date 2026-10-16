import type {
  TreeItem,
  TreeItemId,
  TreeStoreOptions,
} from './types'

export class TreeStore<T extends TreeItem = TreeItem> {
  private itemsById = new Map<TreeItemId, Readonly<T>>()
  private childrenByParent = new Map<TreeItemId | null, Map<TreeItemId, Readonly<T>>>()
  private allItems: readonly Readonly<T>[] | undefined

  private readonly validate: boolean

  constructor(items: readonly T[] = [], options: TreeStoreOptions = {}) {
    this.validate = options.validate ?? false
    this.setItems(items)
  }

  getAll(): readonly Readonly<T>[] {
    return (this.allItems ??= Array.from(this.itemsById.values()))
  }

  getItem(id: TreeItemId): Readonly<T> | undefined {
    return this.itemsById.get(id)
  }

  hasChildren(id: TreeItemId): boolean {
    return this.itemsById.has(id) &&
      (this.childrenByParent.get(id)?.size ?? 0) > 0
  }

  getChildren(id: TreeItemId): readonly Readonly<T>[] {
    if (!this.itemsById.has(id)) {
      return []
    }

    return Array.from(this.childrenByParent.get(id)?.values() ?? [])
  }

  getAllChildren(id: TreeItemId): readonly Readonly<T>[] {
    if (!this.itemsById.has(id)) {
      return []
    }

    const result: Readonly<T>[] = []
    const stack = [this.childrenByParent.get(id)?.values()]

    while (stack.length > 0) {
      const next = stack[stack.length - 1]?.next()

      if (!next || next.done) {
        stack.pop()
        continue
      }

      const item = next.value
      const children = this.childrenByParent.get(item.id)

      result.push(item)

      if (children) {
        stack.push(children.values())
      }
    }

    return result
  }

  getAllParents(id: TreeItemId): readonly Readonly<T>[] {
    const result: Readonly<T>[] = []
    let item = this.itemsById.get(id)

    while (item) {
      result.push(item)
      item = item.parent === null
        ? undefined
        : this.itemsById.get(item.parent)
    }

    return result
  }

  setItems(items: readonly T[]): void {
    const byId = new Map<TreeItemId, Readonly<T>>()
    const byParent = new Map<TreeItemId | null, Map<TreeItemId, Readonly<T>>>()

    for (const input of items) {
      const item = { ...input }

      if (this.validate) {
        this.validateIdentifiers(item)
      }

      if (byId.has(item.id)) {
        throw new Error(`Duplicate item id: ${item.id}`)
      }

      byId.set(item.id, item)

      let children = byParent.get(item.parent)

      if (!children) {
        byParent.set(item.parent, (children = new Map()))
      }

      children.set(item.id, item)
    }

    if (this.validate) {
      this.validateForest(byId)
    }

    this.itemsById = byId
    this.childrenByParent = byParent
    this.allItems = undefined
  }

  addItem(input: T): void {
    const item = { ...input }

    if (this.validate) {
      this.validateIdentifiers(item)
    }

    if (this.itemsById.has(item.id)) {
      throw new Error(`Duplicate item id: ${item.id}`)
    }

    if (this.validate) {
      this.validateParent(item)
    }

    this.itemsById.set(item.id, item)
    this.attach(item)
    this.allItems = undefined
  }

  updateItem(input: T): void {
    const item = { ...input }

    if (this.validate) {
      this.validateIdentifiers(item)
    }

    const previous = this.itemsById.get(item.id)

    if (!previous) {
      throw new Error(`Unknown item id: ${item.id}`)
    }

    if (previous.parent !== item.parent) {
      if (this.validate) this.validateParent(item)
      this.detach(previous)
    }

    this.itemsById.set(item.id, item)
    this.attach(item)
    this.allItems = undefined
  }

  removeItem(id: TreeItemId): void {
    const item = this.itemsById.get(id)

    if (!item) {
      return
    }

    const descendants = this.getAllChildren(id)

    this.detach(item)
    this.itemsById.delete(id)
    this.childrenByParent.delete(id)

    for (const descendant of descendants) {
      this.itemsById.delete(descendant.id)
      this.childrenByParent.delete(descendant.id)
    }

    this.allItems = undefined
  }

  private attach(item: Readonly<T>): void {
    let children = this.childrenByParent.get(item.parent)

    if (!children) {
      this.childrenByParent.set(item.parent, (children = new Map()))
    }

    children.set(item.id, item)
  }

  private detach(item: Readonly<T>): void {
    const children = this.childrenByParent.get(item.parent)

    children?.delete(item.id)

    if (children?.size === 0) {
      this.childrenByParent.delete(item.parent)
    }
  }

  private validateIdentifiers(item: Readonly<T>): void {
    if (typeof item.id === 'number' && !Number.isFinite(item.id)) {
      throw new Error(`Non-finite item id: ${item.id}`)
    }

    if (typeof item.parent === 'number' && !Number.isFinite(item.parent)) {
      throw new Error(`Non-finite parent id: ${item.parent}`)
    }
  }

  private validateParent(item: Readonly<T>): void {
    let parent = item.parent

    while (parent !== null) {
      if (parent === item.id) {
        throw new Error(`Cycle at item: ${item.id}`)
      }

      const ancestor = this.itemsById.get(parent)

      if (!ancestor) {
        throw new Error(`Unknown parent id: ${parent}`)
      }

      parent = ancestor.parent
    }
  }

  private validateForest(items: ReadonlyMap<TreeItemId, Readonly<T>>): void {
    const complete = new Set<TreeItemId>()

    for (const start of items.values()) {
      const path = new Set<TreeItemId>()
      let item: Readonly<T> | undefined = start

      while (item && !complete.has(item.id)) {
        if (path.has(item.id)) {
          throw new Error(`Cycle at item: ${item.id}`)
        }

        path.add(item.id)

        if (item.parent === null) {
          break
        }

        const parent: Readonly<T> | undefined = items.get(item.parent)

        if (!parent) {
          throw new Error(`Unknown parent id: ${item.parent}`)
        }

        item = parent
      }

      for (const id of path) complete.add(id)
    }
  }
}
