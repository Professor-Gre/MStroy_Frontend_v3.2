import {
  describe,
  expect,
  it,
} from 'vitest'
import { TreeStore } from './TreeStore'
import type { TreeItem } from './types'

const fixture = () => [
  { id: 1, parent: null, label: 'Корень' },
  { id: 'two', parent: 1, label: 'Ветка' },
  { id: 3, parent: 1, label: 'Лист' },
  { id: 4, parent: 'two', label: 'Вложенная ветка' },
  { id: 5, parent: 'two', label: 'Лист' },
  { id: 6, parent: 'two', label: 'Лист' },
  { id: 7, parent: 4, label: 'Лист' },
  { id: 8, parent: 4, label: 'Лист' },
]
const ids = (items: readonly TreeItem[]) => {
  return items.map(({ id }) => id)
}

describe('TreeStore', () => {
  it('поддерживает пустое хранилище и неизвестные идентификаторы', () => {
    const store = new TreeStore()

    expect(store.getAll()).toEqual([])
    expect(store.getItem(1)).toBeUndefined()
    expect(store.getChildren(1)).toEqual([])
    expect(store.getAllChildren(1)).toEqual([])
    expect(store.getAllParents(1)).toEqual([])
    expect(() => store.removeItem(1)).not.toThrow()
  })

  it('индексирует детей, обходит дерево в глубину и включает исходный узел в цепочку родителей', () => {
    const items = fixture()
    const store = new TreeStore(items)

    expect(store.getAll()).toEqual(items)
    expect(store.getItem(4)).toEqual(items[3])
    expect(ids(store.getChildren('two'))).toEqual([4, 5, 6])
    expect(ids(store.getAllChildren(1))).toEqual(['two', 4, 7, 8, 5, 6, 3])
    expect(ids(store.getAllParents(7))).toEqual([7, 4, 'two', 1])
    expect(ids(store.getAllParents(1))).toEqual([1])
    expect(store.getChildren(8)).toEqual([])
  })

  it('различает числовые и строковые идентификаторы, поддерживает несколько корней и произвольный порядок данных', () => {
    const items = [
      { id: 2, parent: '1' },
      { id: 1, parent: null },
      { id: '1', parent: null },
    ]
    const store = new TreeStore(items, { validate: true })

    expect(store.getItem(1)).toEqual(items[1])
    expect(store.getChildren(1)).toEqual([])
    expect(ids(store.getChildren('1'))).toEqual([2])
  })

  it('полностью заменяет данные и не сохраняет ссылку на входной массив', () => {
    const items = fixture()
    const store = new TreeStore(items)

    items.pop()
    expect(store.getAll()).toHaveLength(8)

    store.setItems([{ id: 9, parent: null, label: 'Замена' }])
    expect(ids(store.getAll())).toEqual([9])
    expect(store.getItem(1)).toBeUndefined()
    expect(store.getChildren('two')).toEqual([])
  })

  it('добавляет, полностью заменяет и переносит элементы с сохранением установленного порядка', () => {
    const store = new TreeStore<TreeItem & { label?: string }>(fixture(), { validate: true })
    const snapshot = store.getAll()

    store.addItem({ id: 9, parent: 1 })
    expect(ids(store.getChildren(1))).toEqual(['two', 3, 9])

    store.updateItem({ id: 'two', parent: 1 })
    expect(store.getItem('two')).toEqual({ id: 'two', parent: 1 })
    expect(ids(store.getChildren(1))).toEqual(['two', 3, 9])

    store.updateItem({ id: 4, parent: 1 })
    expect(ids(store.getChildren(1))).toEqual(['two', 3, 9, 4])
    expect(ids(store.getChildren('two'))).toEqual([5, 6])
    expect(ids(store.getChildren(4))).toEqual([7, 8])
    expect(ids(store.getAll())).toEqual([1, 'two', 3, 4, 5, 6, 7, 8, 9])
    expect(snapshot).toHaveLength(8)
  })

  it('удаляет поддеревья целиком и позволяет повторно использовать удалённые идентификаторы', () => {
    const store = new TreeStore(fixture())

    store.removeItem('two')
    expect(ids(store.getAll())).toEqual([1, 3])
    expect(ids(store.getChildren(1))).toEqual([3])

    for (const id of ['two', 4, 5, 6, 7, 8]) {
      expect(store.getItem(id)).toBeUndefined()
    }

    store.addItem({ id: 4, parent: 1, label: 'Новый лист' })
    expect(store.getChildren(4)).toEqual([])

    store.removeItem(3)
    store.removeItem(1)
    expect(store.getAll()).toEqual([])
  })

  it('всегда отклоняет дубликаты и обновление отсутствующих элементов без изменения состояния', () => {
    const store = new TreeStore(fixture())
    const snapshot = store.getAll()

    expect(() => store.addItem({ id: 1, parent: null, label: '' })).toThrow()
    expect(() => store.updateItem({ id: 99, parent: null, label: '' })).toThrow()
    expect(() => store.setItems([fixture()[0]!, fixture()[0]!])).toThrow()
    expect(store.getAll()).toBe(snapshot)
  })

  it('отклоняет некорректные структуры при создании и замене данных без изменения состояния', () => {
    const invalid: TreeItem[][] = [
      [{ id: 1, parent: 99 }],
      [{ id: 1, parent: 1 }],
      [{ id: 1, parent: 2 }, { id: 2, parent: 1 }],
    ]
    const store = new TreeStore<TreeItem>(fixture(), { validate: true })
    const snapshot = store.getAll()

    for (const items of invalid) {
      expect(() => new TreeStore(items, { validate: true })).toThrow()
      expect(() => store.setItems(items)).toThrow()
      expect(store.getAll()).toBe(snapshot)
    }
  })

  it('проверяет новые цепочки родителей до изменения данных', () => {
    const store = new TreeStore<TreeItem>(fixture(), { validate: true })
    const snapshot = store.getAll()

    expect(() => store.addItem({ id: 9, parent: 99 })).toThrow()
    expect(() => store.addItem({ id: 9, parent: 9 })).toThrow()
    expect(() => store.updateItem({ id: 1, parent: 7 })).toThrow()
    expect(() => store.updateItem({ id: 4, parent: 4 })).toThrow()
    expect(() => store.updateItem({ id: 4, parent: 99 })).toThrow()

    expect(store.getAll()).toBe(snapshot)
    expect(ids(store.getAllParents(7))).toEqual([7, 4, 'two', 1])
  })

  it('позволяет отключить проверку структуры', () => {
    const store = new TreeStore([{ id: 1, parent: 99 }])

    store.addItem({ id: 2, parent: 98 })
    store.updateItem({ id: 1, parent: 97 })

    expect(store.getItem(1)?.parent).toBe(97)
    expect(store.getAll()).toHaveLength(2)
  })

  it.each([NaN, Infinity, -Infinity])('при включённой проверке отклоняет неконечные идентификаторы и ссылки на родителей: %s', (invalid) => {
    expect(() => new TreeStore([{ id: invalid, parent: null }], { validate: true })).toThrow()
    expect(() => new TreeStore([{ id: 1, parent: invalid }], { validate: true })).toThrow()

    const store = new TreeStore<TreeItem>(fixture(), { validate: true })
    const snapshot = store.getAll()

    expect(() => store.setItems([{ id: invalid, parent: null }])).toThrow()
    expect(() => store.setItems([{ id: 1, parent: invalid }])).toThrow()
    expect(() => store.addItem({ id: invalid, parent: null })).toThrow()
    expect(() => store.addItem({ id: 9, parent: invalid })).toThrow()
    expect(() => store.updateItem({ id: 4, parent: invalid })).toThrow()

    expect(store.getAll()).toBe(snapshot)
    expect(ids(store.getAllParents(7))).toEqual([7, 4, 'two', 1])
  })

  it('принимает конечные числовые идентификаторы и не преобразует строковые идентификаторы в числа', () => {
    const store = new TreeStore([
      { id: -1.5, parent: null },
      { id: 0, parent: -1.5 },
      { id: 'NaN', parent: 0 },
      { id: 'Infinity', parent: 'NaN' },
    ], { validate: true })

    expect(ids(store.getAllParents('Infinity'))).toEqual(['Infinity', 'NaN', 0, -1.5])
  })

  it('проверяет наличие детей без возврата массива и учитывает изменения дерева', () => {
    const store = new TreeStore<TreeItem>([], { validate: true })

    expect(store.hasChildren(1)).toBe(false)

    store.setItems([{ id: 1, parent: null }, { id: 2, parent: null }])
    expect(store.hasChildren(1)).toBe(false)

    store.addItem({ id: 3, parent: 1 })
    expect(store.hasChildren(1)).toBe(true)
    expect(store.hasChildren(3)).toBe(false)

    store.updateItem({ id: 3, parent: 2 })
    expect(store.hasChildren(1)).toBe(false)
    expect(store.hasChildren(2)).toBe(true)

    store.removeItem(3)
    expect(store.hasChildren(2)).toBe(false)

    store.setItems([])
    expect(store.hasChildren(1)).toBe(false)
  })

  it('копирует элементы при каждой записи, сохраняя ссылки на вложенные объекты', () => {
    const root = { id: 1, parent: null as number | null, label: 'Корень', metadata: { color: 'red' } }
    const store = new TreeStore([root], { validate: true })

    root.id = 99
    root.parent = 99
    root.label = 'Изменено извне'

    expect(store.getItem(1)).toEqual({ id: 1, parent: null, label: 'Корень', metadata: root.metadata })
    expect(store.getItem(1)?.metadata).toBe(root.metadata)

    const child = { id: 2, parent: 1, label: 'Дочерний элемент', metadata: root.metadata }
    store.addItem(child)

    child.id = 98
    child.parent = 98

    expect(ids(store.getChildren(1))).toEqual([2])

    const replacement = { id: 2, parent: null as number | null, label: 'Новый корень', metadata: root.metadata }
    store.updateItem(replacement)

    replacement.parent = 1
    replacement.label = 'Изменено извне'

    expect(store.getItem(2)?.parent).toBeNull()
    expect(store.getItem(2)?.label).toBe('Новый корень')
    expect(store.hasChildren(1)).toBe(false)

    const reset = { id: 3, parent: null, label: 'Сброс', metadata: root.metadata }
    store.setItems([reset])

    reset.id = 97

    expect(ids(store.getAll())).toEqual([3])
  })

  it('проверяет, обходит и удаляет глубокое дерево без рекурсивных вызовов', () => {
    const items = Array.from({ length: 30_000 }, (_, id) => ({
      id,
      parent: id === 0 ? null : id - 1,
    })).reverse()
    const store = new TreeStore(items, { validate: true })

    expect(store.getAllChildren(0)).toHaveLength(29_999)
    expect(store.getAllParents(29_999)).toHaveLength(30_000)

    store.removeItem(1)
    expect(ids(store.getAll())).toEqual([0])
  })
})
