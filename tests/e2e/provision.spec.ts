import { test, expect, type Page } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 3100)
const baseUrl = `http://localhost:${port}`

const siteInfo = {
  main: true,
  theme: {
    colors: { primary: '#1e88e5', secondary: '#424242', accent: '#82B1FF', success: '#4CAF50', error: '#FF5252', info: '#2196F3', warning: '#FFC107' },
    dark: false
  },
  authMode: 'user',
  owner: { type: 'user', id: 'test-user' }
}

async function mockSession (page: Page) {
  await page.route('**/simple-directory/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.__PUBLIC_SITE_INFO = ${JSON.stringify(siteInfo)}`
  }))
}

async function mockApplication (page: Page) {
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
}

test('crée automatiquement le jeu de données fragment de lapplication', async ({ page }) => {
  const created = { id: 'ged-auto', href: '/data-fair/api/v1/datasets/ged-auto', title: 'Ma GED - GED' }
  let postBody: any = null

  await mockSession(page)
  await page.route('**/data-fair/api/v1/datasets*', async (route) => {
    if (route.request().method() === 'POST') {
      postBody = route.request().postDataJSON()
      return route.fulfill({ status: 201, json: created })
    }
    return route.fulfill({ json: { results: [] } })
  })
  await page.route('**/data-fair/api/v1/datasets/ged-auto**', route => route.fulfill({ json: { results: [] } }))
  await mockApplication(page)

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

  await expect(page.getByText('Déposer un ou plusieurs fichiers ici')).toBeVisible()
})

test('réutilise un fragment existant sans en créer un nouveau', async ({ page }) => {
  const existing = { id: 'ged-existing', href: '/data-fair/api/v1/datasets/ged-existing', title: 'GED existante' }
  let postCalled = false

  await mockSession(page)
  await page.route('**/data-fair/api/v1/datasets*', async (route) => {
    if (route.request().method() === 'POST') {
      postCalled = true
      return route.fulfill({ status: 201, json: {} })
    }
    return route.fulfill({ json: { results: [existing] } })
  })
  await page.route('**/data-fair/api/v1/datasets/ged-existing**', route => route.fulfill({ json: { results: [] } }))
  await mockApplication(page)

  await page.goto('/')
  await expect(page.getByText('Déposer un ou plusieurs fichiers ici')).toBeVisible()
  expect(postCalled).toBe(false)
})

test('affiche une erreur et un bouton réessayer si le provisionnement échoue', async ({ page }) => {
  await mockSession(page)
  await page.route('**/data-fair/api/v1/datasets*', async (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 403, body: 'Permission refusée' })
    }
    return route.fulfill({ json: { results: [] } })
  })
  await mockApplication(page)

  await page.goto('/')
  await expect(page.getByText('Impossible de préparer le jeu de données')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
})
