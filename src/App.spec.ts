// @vitest-environment jsdom

import {
  flushPromises,
  mount,
} from '@vue/test-utils'
import {
  expect,
  it,
  vi,
} from 'vitest'

import App from './App.vue'

it('передаёт в таблицу загрузку и данные из настоящего composable', async () => {
  vi.useFakeTimers()
  const items = [{ id: 1, parent: null, label: 'Корень' }]
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(items))

  vi.stubGlobal('fetch', fetchMock)
  const wrapper = mount(App, { global: { stubs: { TreeGrid: true } } })

  try {
    const grid = wrapper.getComponent({ name: 'TreeGrid' })
    expect(grid.props('items')).toEqual([])
    expect(grid.props('loading')).toBe(true)

    await vi.advanceTimersByTimeAsync(2000)
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/items.json', { signal: expect.any(AbortSignal) })
    expect(grid.props('items')).toEqual(items)
    expect(grid.props('loading')).toBe(false)
  } finally {
    wrapper.unmount()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  }
})
