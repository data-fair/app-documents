import { test, expect, mockApplication, mockSite } from './fixtures'
import type { Page } from '@playwright/test'

const created = { id: 'ged-auto', href: '/data-fair/api/v1/datasets/ged-auto', title: 'GED test - GED' }

async function mockDatasets (page: Page, options: { existing?: { id: string, href: string, title: string }, postStatus?: number } = {}) {
  const calls = { post: null as any, patch: null as any }
  await page.route('**/data-fair/api/v1/datasets?**', route => route.fulfill({ json: { results: options.existing ? [options.existing] : [] } }))
  await page.route('**/data-fair/api/v1/datasets', (route) => {
    calls.post = route.request().postDataJSON()
    if (options.postStatus) return route.fulfill({ status: options.postStatus, body: 'Permission refusée' })
    return route.fulfill({ status: 201, json: created })
  })
  await page.route('**/data-fair/api/v1/datasets/*', (route) => {
    if (route.request().method() === 'PATCH') {
      calls.patch = route.request().postDataJSON()
      return route.fulfill({ json: {} })
    }
    return route.fulfill({ json: { schema: [{ key: 'path' }, { key: 'nom' }], rest: { history: true } } })
  })
  await page.route('**/data-fair/api/v1/datasets/*/{lines,values}**', route => route.fulfill({ json: route.request().url().includes('/values/') ? [] : { total: 0, results: [] } }))
  return calls
}

test('crée le jeu de données fragment de lapplication et complète son schéma', async ({ page }) => {
  await mockSite(page)
  const calls = await mockDatasets(page)
  await mockApplication(page, { metadata: [{ key: 'auteur', title: 'Auteur', type: 'string' }] })
  await page.goto('/')
  await expect(page.getByText('Ce dossier est vide.')).toBeVisible()

  expect(calls.post).toMatchObject({ isRest: true, rest: { history: true }, partOf: { type: 'application', id: 'app0' }, owner: { type: 'user', id: 'test-user', name: 'Test User' } })
  const keys = calls.post.schema.map((f: any) => f.key)
  expect(keys).toEqual(expect.arrayContaining(['path', 'nom', 'attachmentPath', 'auteur']))
  expect(calls.post.schema.find((f: any) => f.key === 'attachmentPath')['x-refersTo']).toBe('http://schema.org/DigitalDocument')
  // the metadata column missing from the stored schema is added, none is removed
  expect(calls.patch.schema.map((f: any) => f.key)).toEqual(expect.arrayContaining(['path', 'nom', 'auteur']))
})

test('réutilise le fragment existant de lapplication', async ({ page }) => {
  await mockSite(page)
  const calls = await mockDatasets(page, { existing: { id: 'ged-existing', href: '/data-fair/api/v1/datasets/ged-existing', title: 'GED existante' } })
  await mockApplication(page, {})
  await page.goto('/')
  await expect(page.getByText('Ce dossier est vide.')).toBeVisible()
  expect(calls.post).toBeNull()
})

test.describe('échec du provisionnement', () => {
  test.use({ expectedConsole: ['status of 403'] })
  test('affiche lerreur et propose de réessayer', async ({ page }) => {
    await mockSite(page)
    await mockDatasets(page, { postStatus: 403 })
    await mockApplication(page, {})
    await page.goto('/')
    await expect(page.getByText('Impossible d\'ouvrir la GED')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })
})

test('signale un jeu de données choisi qui na pas les colonnes de la GED', async ({ page }) => {
  await mockSite(page)
  await page.route('**/data-fair/api/v1/datasets/autre**', route => route.fulfill({ json: { schema: [{ key: 'titre' }], rest: {} } }))
  await mockApplication(page, { datasets: [{ id: 'autre', href: '/data-fair/api/v1/datasets/autre' }] })
  await page.goto('/')
  await expect(page.getByText('n\'a pas les colonnes de la GED')).toBeVisible()
})
