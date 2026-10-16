// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import TreeGrid from './TreeGrid.vue'

describe('TreeGrid', () => {
  it('передаёт состояние загрузки в AgGrid и атрибут доступности', async () => {
    const wrapper = mount(TreeGrid, {
      props: { items: [], loading: true },
      global: { stubs: { AgGridVue: true } },
    })
    const grid = wrapper.getComponent({ name: 'AgGridVue' })

    expect(grid.props('loading')).toBe(true)
    expect(wrapper.attributes('aria-busy')).toBe('true')

    await wrapper.setProps({ loading: false })
    expect(grid.props('loading')).toBe(false)
    expect(wrapper.attributes('aria-busy')).toBe('false')
    wrapper.unmount()
  })

  it('создаёт разные ключи для числовых и строковых идентификаторов', () => {
    const items = [
      { id: 1, parent: null, label: 'Числовой корень' },
      { id: '1', parent: null, label: 'Строковый корень' },
      { id: 2, parent: 1, label: 'Первый ребёнок' },
      { id: '2', parent: '1', label: 'Второй ребёнок' },
    ]
    const wrapper = mount(TreeGrid, {
      props: { items, loading: false },
      global: { stubs: { AgGridVue: true } },
    })

    expect(wrapper.getComponent({ name: 'AgGridVue' }).props('rowData')).toEqual([
      { ...items[0], rowId: 'number:1', parentRowId: null },
      { ...items[1], rowId: 'string:1', parentRowId: null },
      { ...items[2], rowId: 'number:2', parentRowId: 'number:1' },
      { ...items[3], rowId: 'string:2', parentRowId: 'string:1' },
    ])
    expect(items.every((item) => !('rowId' in item))).toBe(true)
    wrapper.unmount()
  })

  it('обновляет строки AgGrid при изменении входных элементов', async () => {
    const wrapper = mount(TreeGrid, {
      props: { items: [{ id: 1, parent: null, label: 'Корень' }], loading: false },
      global: { stubs: { AgGridVue: true } },
    })

    await wrapper.setProps({ items: [{ id: 2, parent: null, label: 'Замена' }] })

    expect(wrapper.getComponent({ name: 'AgGridVue' }).props('rowData')).toEqual([
      { id: 2, parent: null, label: 'Замена', rowId: 'number:2', parentRowId: null },
    ])
    wrapper.unmount()
  })

  it('обновляет производные ячейки после изменения модели строк', () => {
    const wrapper = mount(TreeGrid, {
      props: { items: [], loading: false },
      global: { stubs: { AgGridVue: true } },
    })
    const refreshCells = vi.fn()

    wrapper.getComponent({ name: 'AgGridVue' }).vm.$emit('modelUpdated', {
      api: { refreshCells },
    })

    expect(refreshCells).toHaveBeenCalledWith({ force: true })
    wrapper.unmount()
  })
})
