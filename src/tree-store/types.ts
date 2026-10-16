export type TreeItemId = string | number

export interface TreeItem {
  readonly id: TreeItemId
  readonly parent: TreeItemId | null
}

export interface TreeStoreOptions {
  readonly validate?: boolean
}
