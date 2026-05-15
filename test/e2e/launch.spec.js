const { expect, test } = require('@playwright/test')
const { launchElectron } = require('./helpers')

test.describe('Check Launch MarkText', async () => {
  let app = null
  let page = null

  test.beforeAll(async () => {
    const { app: electronApp, page: firstPage } = await launchElectron()
    app = electronApp
    page = firstPage
  })

  test.afterAll(async () => {
    // contextIsolation 鍚敤鍚?app.close() 浼氱瓑寰?IPC 鍝嶅簲瀵艰嚧瓒呮椂锛岀洿鎺ュ己鍒堕€€鍑?
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {})
  })

  test('Empty MarkText', async () => {
    const title = await page.title()
    expect(/^MarkText|Untitled-1 - MarkText$/.test(title)).toBeTruthy()
  })
})
