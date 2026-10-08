import { test, expect } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 3100)
const baseUrl = `http://localhost:${port}`
const created = { id: 'ged-auto', href: '/data-fair/api/v1/datasets/ged-auto', title: 'Ma GED - GED' }

const siteInfo = {
  main: true,
  theme: {
    colors: { primary: '#1e88e5', secondary: '#424242', accent: '#82B1FF', success: '#4CAF50', error: '#FF5252', info: '#2196F3', warning: '#FFC107' },
    dark: false
  },
  authMode: 'user',
  owner: { type: 'user', id: 'test-user' }
}

test('crée automatiquement le jeu de données fragment de lapplication', async ({ page }) => {
  let postBody: any = null

  await page.route('**/simple-directory/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.__PUBLIC_SITE_INFO = ${JSON.stringify(siteInfo)}`
  }))

  await page.route('**/data-fair/api/v1/datasets*', async (route) => {
    if (route.request().method() === 'POST') {
      postBody = route.request().postDataJSON()
      return route.fulfill({ status: 201, json: created })
    }
    return route.fulfill({ json: { results: [] } })
  })

  await page.route('**/data-fair/api/v1/datasets/ged-auto/**', (route) => {
    return route.fulfill({ json: { results: [] } })
  })

  await page.addInitScript((app) => {
    Object.defineProperty(window, 'APPLICATION', { value: app, writable: false, configurable: false })
  }, {
    id: 'app0',
    slug: 'ged-test',
    title: 'Ma GED',
    href: `${baseUrl}/app/app0`,
    apiUrl: `${baseUrl}/data-fair/api/v1`,
    wsUrl: `ws://${new URL(baseUrl).host}/ws`,
    owner: { type: 'user', id: 'test-user', name: 'Test User' },
    configuration: { metadata: [{ key: 'auteur', title: 'Auteur', type: 'string' }] }
  })

  await page.goto('/')
  await expect.poll(() => postBody).not.toBeNull()

  expect(postBody.isRest).toBe(true)
  expect(postBody.rest).toEqual({ history: true })
  expect(postBody.partOf).toEqual({ type: 'application', id: 'app0' })
  expect(postBody.owner).toMatchObject({ type: 'user', id: 'test-user' })
  const keys = postBody.schema.map((f: any) => f.key)
  expect(keys).toContain('path')
  expect(keys).toContain('attachmentPath')
  expect(keys).toContain('auteur')
  expect(postBody.schema.find((f: any) => f.key === 'attachmentPath')['x-refersTo']).toBe('http://schema.org/DigitalDocument')

  // une fois le jeu de données adopté, la GED s'affiche
  await expect(page.getByText('Déposer un ou plusieurs fichiers ici')).toBeVisible()
})
