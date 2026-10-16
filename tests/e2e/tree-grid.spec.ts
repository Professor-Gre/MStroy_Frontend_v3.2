import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function expectRows(page: Page, selector: string, expected: string[]) {
  // AgGrid переиспользует DOM-узлы; row-index отражает визуальный порядок строк
  await expect.poll(() => page.locator('.ag-row').evaluateAll((rows, cellSelector) => {
    return rows
      .sort((a, b) => Number(a.getAttribute('row-index')) - Number(b.getAttribute('row-index')))
      .map((row) => row.querySelector(cellSelector)?.textContent?.trim() ?? '')
  }, selector)).toEqual(expected)
}

const expectedLabels = [
  'Айтем 1', 'Айтем 2', 'Айтем 4', 'Айтем 7',
  'Айтем 8', 'Айтем 5', 'Айтем 6', 'Айтем 3',
]

test('показывает загрузку, затем дерево с категориями и порядковыми номерами', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('status')).toHaveText('Загрузка данных…')
  await expect(page.locator('.tree-grid')).toHaveAttribute('aria-busy', 'true')
  await expectRows(page, '[col-id="label"]', expectedLabels)
  await expect(page.locator('.tree-grid')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByRole('status')).toBeHidden()
  await expect(page.locator('.ag-header-cell-text')).toHaveText(['№ п/п', 'Категория', 'Наименование'])
  await expectRows(page, '[col-id="position"]', ['1', '2', '3', '4', '5', '6', '7', '8'])
  await expectRows(page, '.ag-group-value', [
    'Группа', 'Группа', 'Группа', 'Элемент', 'Элемент', 'Элемент', 'Элемент', 'Элемент',
  ])
})

test('сворачивает поддерево и пересчитывает номера видимых строк', async ({ page }) => {
  await page.goto('/')
  await expectRows(page, '[col-id="label"]', expectedLabels)

  const group = page.locator('.ag-row[row-id="number:4"]')
  await group.locator('.ag-group-expanded').click()

  await expectRows(page, '[col-id="label"]', [
    'Айтем 1', 'Айтем 2', 'Айтем 4', 'Айтем 5', 'Айтем 6', 'Айтем 3',
  ])
  await expectRows(page, '[col-id="position"]', ['1', '2', '3', '4', '5', '6'])

  await group.locator('.ag-group-contracted').click()
  await expectRows(page, '[col-id="label"]', expectedLabels)
})

test('позволяет сворачивать и раскрывать группу с клавиатуры', async ({ page }) => {
  await page.goto('/')
  await expectRows(page, '[col-id="label"]', expectedLabels)
  const category = page.locator('.ag-row[row-id="number:1"] [col-id="ag-Grid-AutoColumn"]')

  await category.click()
  await page.keyboard.press('Enter')
  await expectRows(page, '[col-id="label"]', ['Айтем 1'])

  await page.keyboard.press('Enter')
  await expectRows(page, '[col-id="label"]', expectedLabels)
})

test('не смешивает числовые и строковые идентификаторы в настоящей AgGrid', async ({ page }) => {
  await page.route('**/items.json', (route) => route.fulfill({
    json: [
      { id: 1, parent: null, label: 'Числовой корень' },
      { id: '1', parent: null, label: 'Строковый корень' },
      { id: 2, parent: 1, label: 'Первый ребёнок' },
      { id: '2', parent: '1', label: 'Второй ребёнок' },
    ],
  }))
  await page.goto('/')

  await expectRows(page, '[col-id="label"]', [
    'Числовой корень', 'Первый ребёнок', 'Строковый корень', 'Второй ребёнок',
  ])
})

for (const width of [1440, 390]) {
  test(`выравнивает стрелки и сохраняет вложенность подписей при ширине ${width}px`, async ({ page }) => {
    await page.goto('/')
    await expectRows(page, '[col-id="label"]', expectedLabels)
    await page.setViewportSize({ width, height: 900 })

    const measurements = []

    for (const id of ['number:1', 'string:91064cef', 'number:4']) {
      const row = page.locator(`.ag-row[row-id="${id}"]`)
      const arrow = await row.locator('.ag-group-expanded').boundingBox()
      const label = await row.locator('.ag-group-value').boundingBox()

      expect(arrow).not.toBeNull()
      expect(label).not.toBeNull()

      measurements.push({ arrowX: arrow!.x, labelX: label!.x })
    }

    expect(measurements[1]!.arrowX).toBe(measurements[0]!.arrowX)
    expect(measurements[2]!.arrowX).toBe(measurements[0]!.arrowX)
    expect(measurements[1]!.labelX).toBeGreaterThan(measurements[0]!.labelX)
    expect(measurements[2]!.labelX).toBeGreaterThan(measurements[1]!.labelX)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    if (width === 390) {
      await page.locator('.ag-body-horizontal-scroll-viewport').evaluate((element) => {
        element.scrollLeft = element.scrollWidth
      })

      await expect(page.locator('.ag-row [col-id="label"]').first()).toBeInViewport()
    }
  })
}

test('обновляет настоящую таблицу после операций composable без перезагрузки', async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/tree-grid.html')
  await expectRows(page, '[col-id="label"]', expectedLabels)

  await page.getByRole('button', { name: 'Добавить элемент' }).click()
  await expect(page.locator('.ag-row[row-id="number:3"] .ag-group-value')).toHaveText('Группа')
  await expect(page.locator('.ag-row[row-id="number:9"] [col-id="label"]')).toHaveText('Новый элемент')

  await page.getByRole('button', { name: 'Перенести элемент' }).click()
  await expect(page.locator('.ag-row[row-id="number:3"] .ag-group-value')).toHaveText('Элемент')

  await page.getByRole('button', { name: 'Удалить поддерево' }).click()
  await expectRows(page, '[col-id="label"]', ['Айтем 1', 'Айтем 3', 'Новый элемент'])
  await expectRows(page, '[col-id="position"]', ['1', '2', '3'])

  await page.getByRole('button', { name: 'Заменить данные' }).click()
  await expectRows(page, '[col-id="label"]', ['Новый корень'])
  await expectRows(page, '.ag-group-value', ['Элемент'])
  await expectRows(page, '[col-id="position"]', ['1'])
})
