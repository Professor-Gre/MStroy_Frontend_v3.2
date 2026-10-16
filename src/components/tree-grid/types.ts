import type { TreeItem } from '@/tree-store'

export interface TreeGridItem extends TreeItem {
  readonly label: string
}

export interface TreeGridRow extends TreeGridItem {
  readonly rowId: string
  readonly parentRowId: string | null
}
