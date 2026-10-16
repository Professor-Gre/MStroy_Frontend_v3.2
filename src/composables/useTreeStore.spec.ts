// @vitest-environment jsdom

import {
  defineComponent,
  isReadonly,
} from 'vue'
import {
  flushPromises,
  mount,
} from '@vue/test-utils'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { useTreeStore } from './useTreeStore'
import type { TreeItem } from '@/tree-store'

interface Item extends TreeItem {
  label: string
}

const initialItems: Item[] = [
  { id: 1, parent: null, label: 'Корень' },
  { id: 'child', parent: 1, label: 'Дочерний элемент' },
]
const fetchMock = vi.fn<typeof fetch>()
const unmountCallbacks: (() => void)[] = []

function mountStore() {
  let state!: ReturnType<typeof useTreeStore<Item>>

  const wrapper = mount(defineComponent({
    setup() {
      state = useTreeStore<Item>('/items.json', { validate: true })
      return () => null
    },
  }))

  unmountCallbacks.push(() => wrapper.unmount())
  return { state, wrapper }
}

async function completeLoading() {
  await vi.advanceTimersByTimeAsync(2000)
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers()
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(Response.json(initialItems))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(async () => {
  for (const unmount of unmountCallbacks.splice(0)) {
    unmount()
  }

  await flushPromises()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useTreeStore', () => {
  it('начинает с пустого хранилища и доступного только для чтения состояния', () => {
    const { state } = mountStore()

    expect(state.items.value).toEqual([])
    expect(state.isLoading.value).toBe(true)
    expect(isReadonly(state.items)).toBe(true)
    expect(isReadonly(state.isLoading)).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('запрашивает JSON только после двух секунд и публикует загруженные элементы', async () => {
    const { state } = mountStore()

    await vi.advanceTimersByTimeAsync(1999)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(state.isLoading.value).toBe(true)

    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/items.json', { signal: expect.any(AbortSignal) })
    expect(state.items.value).toEqual(initialItems)
    expect(state.isLoading.value).toBe(false)
  })

  it('сохраняет загрузку, пока сервер не вернул данные', async () => {
    let resolveResponse!: (response: Response) => void
    fetchMock.mockReturnValue(new Promise((resolve) => {
      resolveResponse = resolve
    }))
    const { state } = mountStore()

    await vi.advanceTimersByTimeAsync(2000)
    expect(state.items.value).toEqual([])
    expect(state.isLoading.value).toBe(true)

    resolveResponse(Response.json(initialItems))
    await flushPromises()
    expect(state.items.value).toEqual(initialItems)
    expect(state.isLoading.value).toBe(false)
  })

  it('публикует новый массив после добавления элемента', async () => {
    const { state } = mountStore()
    await completeLoading()
    const previous = state.items.value
    const added = { id: 3, parent: 1, label: 'Новый элемент' }

    state.addItem(added)

    expect(state.items.value).toEqual([...initialItems, added])
    expect(state.items.value).not.toBe(previous)
    expect(previous).toEqual(initialItems)
  })

  it('публикует обновлённые поля и родителя элемента', async () => {
    const { state } = mountStore()
    await completeLoading()
    const previous = state.items.value
    const updated = { id: 'child', parent: null, label: 'Новый корень' }

    state.updateItem(updated)

    expect(state.items.value).toEqual([initialItems[0], updated])
    expect(state.items.value).not.toBe(previous)
    expect(previous).toEqual(initialItems)
  })

  it('убирает из реактивного массива удалённый элемент и его потомков', async () => {
    const { state } = mountStore()
    await completeLoading()

    state.removeItem(1)

    expect(state.items.value).toEqual([])
    expect(state.isLoading.value).toBe(false)
  })

  it('полностью заменяет опубликованные данные через setItems', async () => {
    const { state } = mountStore()
    await completeLoading()
    const replacement = [{ id: 9, parent: null, label: 'Замена' }]

    state.setItems(replacement)

    expect(state.items.value).toEqual(replacement)
    expect(state.items.value).not.toBe(replacement)
  })

  it('не меняет опубликованный массив при отклонённой операции', async () => {
    const { state } = mountStore()
    await completeLoading()
    const previous = state.items.value

    expect(() => state.addItem({ id: 1, parent: null, label: 'Дубликат' })).toThrow()
    expect(() => state.updateItem({ id: 1, parent: 'child', label: 'Цикл' })).toThrow()
    expect(state.items.value).toBe(previous)
    expect(state.items.value).toEqual(initialItems)
  })

  it('отменяет таймер при размонтировании до начала запроса', async () => {
    const { wrapper } = mountStore()

    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
    await completeLoading()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('прерывает выполняющийся запрос при размонтировании', async () => {
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Запрос отменён', 'AbortError'))
      }, { once: true })
    }))
    const { state, wrapper } = mountStore()
    await vi.advanceTimersByTimeAsync(2000)
    const signal = fetchMock.mock.calls[0]![1]!.signal!

    wrapper.unmount()
    await flushPromises()

    expect(signal.aborted).toBe(true)
    expect(state.items.value).toEqual([])
  })

  it('игнорирует поздний ответ после размонтирования, даже если fetch не учёл отмену', async () => {
    let resolveResponse!: (response: Response) => void
    fetchMock.mockReturnValue(new Promise((resolve) => {
      resolveResponse = resolve
    }))
    const { state, wrapper } = mountStore()
    await vi.advanceTimersByTimeAsync(2000)

    wrapper.unmount()
    resolveResponse(Response.json(initialItems))
    await flushPromises()

    expect(state.items.value).toEqual([])
  })
})
