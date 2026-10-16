import {
  afterAll,
  describe,
  it,
} from 'vitest'
import type { BenchRegistration } from 'vitest'

import { TreeStore } from './TreeStore'
import type { TreeItem } from './types'

type Shape = 'широкое дерево' | 'глубокая цепочка' | 'смешанное дерево'

function makeItems(count: number, shape: Shape): TreeItem[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    parent: id === 0
      ? null
      : shape === 'широкое дерево'
        ? 0
        : shape === 'глубокая цепочка'
          ? id - 1
          : Math.floor((id - 1) / 4),
  }))
}

// Число повторений ограничивает стоимость подготовки хранилища вне замеряемых операций.
const runOptions = { time: 0, iterations: 30, warmup: false }
const shapes: Shape[] = ['широкое дерево', 'глубокая цепочка', 'смешанное дерево']

for (const count of [10_000, 100_000]) {
  for (const shape of shapes) {
    describe(`${shape}, ${count} элементов`, () => {
      const items = makeItems(count, shape)
      const store = new TreeStore(items)
      store.getAll()
      const measurements: { Метод: string; 'Среднее, мс': number; 'Минимум, мс': number }[] = []

      const measure = async (registration: BenchRegistration<string>) => {
        const result = await registration.run(runOptions)
        measurements.push({
          Метод: registration.name,
          'Среднее, мс': Number(result.latency.mean.toFixed(6)),
          'Минимум, мс': Number(result.latency.min.toFixed(6)),
        })
      }

      afterAll(() => {
        console.log(`${shape}, ${count} элементов`)
        console.table(measurements)
      })

      it('измеряет построение индексов и полную замену данных', async ({ bench }) => {
        await measure(bench('constructor', () => new TreeStore(items)))
        await measure(bench('setItems', () => store.setItems(items)))
      }, 30_000)

      it('измеряет поиск и обходы', async ({ bench }) => {
        await measure(bench('getItem', () => store.getItem(count - 1)))
        await measure(bench('hasChildren', () => store.hasChildren(0)))
        await measure(bench('getChildren', () => store.getChildren(0)))
        await measure(bench('getAllChildren', () => store.getAllChildren(0)))
        await measure(bench('getAllParents', () => store.getAllParents(count - 1)))
      }, 30_000)

      it('разделяет первое чтение getAll и чтение из кеша', async ({ bench }) => {
        await measure(bench('getAll без кеша', {
          beforeEach: () => {
            store.updateItem(items[count - 1]!)
          },
        }, () => store.getAll()))
        store.getAll()
        await measure(bench('getAll из кеша', () => store.getAll()))
      }, 30_000)

      it('измеряет изменение дерева без включённой валидации', async ({ bench }) => {
        let mutableStore: TreeStore
        const prepare = () => {
          mutableStore = new TreeStore(items)
        }

        await measure(bench('addItem', { beforeEach: prepare }, () => {
          mutableStore.addItem({ id: count, parent: 0 })
        }))
        await measure(bench('updateItem', { beforeEach: prepare }, () => {
          mutableStore.updateItem({ id: count - 1, parent: null })
        }))
        await measure(bench('removeItem всего дерева', { beforeEach: prepare }, () => {
          mutableStore.removeItem(0)
        }))
      }, 30_000)

      it('измеряет валидацию и обновление без смены родителя', async ({ bench }) => {
        await measure(bench('constructor с валидацией', () => {
          return new TreeStore(items, { validate: true })
        }))
        const validatedStore = new TreeStore(items, { validate: true })
        await measure(bench('updateItem без смены родителя, с валидацией', () => {
          validatedStore.updateItem(items[count - 1]!)
        }))
      }, 30_000)
    })
  }
}
