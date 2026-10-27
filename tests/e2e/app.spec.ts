import { test, expect, type MockLine } from './fixtures'
import type { Page } from '@playwright/test'

const row = (page: Page, name: string) => page.locator('tbody tr').filter({ has: page.locator('td').first().getByText(name, { exact: true }) })
const names = (page: Page) => page.locator('tbody tr.v-data-table__tr td:first-child').allInnerTexts()

async function dropFiles (page: Page, files: { name: string, content?: string, type?: string }[]) {
  await page.evaluate((files) => {
    const transfer = new DataTransfer()
    for (const f of files) transfer.items.add(new File([f.content ?? 'x'], f.name, { type: f.type ?? 'text/plain' }))
    const target = document.querySelector('.v-data-table')!
    for (const type of ['dragenter', 'dragover', 'drop']) target.dispatchEvent(new DragEvent(type, { dataTransfer: transfer, bubbles: true, cancelable: true }))
  }, files)
}

async function dialogSubmit (page: Page, label: string) {
  await page.locator('.v-overlay--active').getByRole('button', { name: label, exact: true }).click()
  await expect(page.locator('.v-overlay--active .v-card')).toHaveCount(0)
}

test('liste dossiers explicites, dossiers déduits et fichiers, et navigue par le fil dariane', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await expect.poll(() => names(page)).toEqual(['docs', 'images', 'rapport.pdf'])
  await expect(row(page, 'rapport.pdf')).toContainText(/123\sko/)

  await row(page, 'docs').getByRole('link', { name: 'docs', exact: true }).click()
  await expect.poll(() => names(page)).toEqual(['notes.txt'])
  await expect(page).toHaveURL(/path=%2Fdocs%2F/)
  await page.getByRole('link', { name: 'Racine' }).click()
  await expect.poll(() => names(page)).toContain('rapport.pdf')
  await expect(page).not.toHaveURL(/path=/)

  // a parent page changes the folder through the reactive params
  await page.evaluate(() => { (window as any).vIframeOptions.reactiveParams.path = '/images/' })
  await expect.poll(() => names(page)).toEqual(['photo.png'])
})

test('un dossier survit à la suppression de son dernier fichier', async ({ ged }) => {
  const { page, lines } = ged
  await page.goto('/')
  await page.getByRole('button', { name: 'Nouveau dossier' }).click()
  await page.getByLabel('Nom du dossier').fill('projets')
  await dialogSubmit(page, 'Créer')
  await row(page, 'projets').getByRole('link', { name: 'projets', exact: true }).click()
  await dropFiles(page, [{ name: 'plan.txt' }])
  await expect(row(page, 'plan.txt')).toBeVisible()
  await row(page, 'plan.txt').getByRole('button', { name: 'Supprimer plan.txt' }).click()
  await dialogSubmit(page, 'Supprimer')
  await expect(page.getByText('Ce dossier est vide.')).toBeVisible()
  await page.getByRole('link', { name: 'Racine' }).click()
  await expect(row(page, 'projets')).toBeVisible()
  expect(lines.filter(l => l.nom === 'projets' && l.type_mime === '_folder')).toHaveLength(1)
})

test('renomme puis supprime un dossier de plus de 12 éléments, sans rien oublier', async ({ ged }) => {
  const { page, lines } = ged
  for (let i = 0; i < 20; i++) lines.push({ _id: `bulk${i}`, nom: `doc-${i}.txt`, path: i % 2 ? '/docs/' : '/docs/sous/', attachmentPath: `bulk${i}/h/doc-${i}.txt`, taille: 10, nbrevisions: 0 })
  await page.goto('/')
  await row(page, 'docs').getByRole('button', { name: 'Renommer le dossier docs' }).click()
  await page.getByLabel('Nom du dossier').fill('archives')
  await dialogSubmit(page, 'Renommer')
  await expect(row(page, 'archives')).toBeVisible()
  expect(lines.filter(l => l.path.startsWith('/docs/'))).toHaveLength(0)
  expect(lines.filter(l => l.path.startsWith('/archives/'))).toHaveLength(21)

  // an implied folder gets its own line when renamed
  await row(page, 'images').getByRole('button', { name: 'Renommer le dossier images' }).click()
  await page.getByLabel('Nom du dossier').fill('photos')
  await dialogSubmit(page, 'Renommer')
  expect(lines.find(l => l.nom === 'photos')?.type_mime).toBe('_folder')

  await row(page, 'archives').getByRole('button', { name: 'Supprimer archives' }).click()
  await dialogSubmit(page, 'Supprimer')
  await expect(row(page, 'archives')).toHaveCount(0)
  expect(lines.filter(l => l.path.startsWith('/archives/') || l.nom === 'archives')).toHaveLength(0)
})

test('remplace un fichier : nom, compteur, téléchargement et historique des versions', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await page.getByRole('button', { name: 'Importer', exact: true }).click()
  await page.locator('.v-overlay--active input[type=file]').setInputFiles({ name: 'note.md', mimeType: 'text/markdown', buffer: Buffer.from('# note') })
  await dialogSubmit(page, 'Importer')
  await expect(row(page, 'note.md').locator('td').nth(2)).toHaveText('0')

  // a name the user never changed follows the new file
  await row(page, 'note.md').getByRole('button', { name: 'Modifier note.md' }).click()
  await page.locator('.v-overlay--active input[type=file]').setInputFiles({ name: 'note.png', mimeType: 'image/png', buffer: Buffer.from('png') })
  await dialogSubmit(page, 'Enregistrer')
  await expect(row(page, 'note.png').locator('td').nth(2)).toHaveText('1')

  // a custom name is kept, the download uses the real file name
  await row(page, 'note.png').getByRole('button', { name: 'Modifier note.png' }).click()
  await page.getByLabel('Nom affiché').fill('Compte rendu')
  await dialogSubmit(page, 'Enregistrer')
  await row(page, 'Compte rendu').getByRole('button', { name: 'Modifier Compte rendu' }).click()
  await page.locator('.v-overlay--active input[type=file]').setInputFiles({ name: 'note.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf') })
  await dialogSubmit(page, 'Enregistrer')
  await expect(row(page, 'Compte rendu').locator('td').nth(2)).toHaveText('2')
  const download = page.waitForEvent('download')
  await row(page, 'Compte rendu').getByRole('link', { name: 'Télécharger Compte rendu' }).click()
  expect((await download).suggestedFilename()).toBe('note.pdf')

  // the rename is a revision of data-fair, not a version of the file
  await row(page, 'Compte rendu').getByRole('button', { name: 'Historique de Compte rendu' }).click()
  const versions = page.locator('.v-overlay--active .v-list-item')
  await expect(versions).toHaveCount(3)
  await expect(versions.nth(0)).toContainText('Version actuelle')
  await expect(versions.nth(0)).toContainText('note.pdf')
  await expect(versions.nth(1)).toContainText('Révision 1')
  await expect(versions.nth(2)).toContainText('Originale')
  await expect(versions.nth(2)).toContainText('note.md')
  await page.keyboard.press('Escape')
  await expect(row(page, 'Compte rendu').getByRole('button', { name: 'Historique de Compte rendu' })).toBeFocused()
})

test('un dépôt de même nom crée une version et garde les métadonnées, limport refuse le doublon', async ({ ged }) => {
  const { page, lines } = ged
  await page.goto('/')
  await expect(row(page, 'rapport.pdf')).toBeVisible()
  await dropFiles(page, [{ name: 'rapport.pdf', content: 'version 2' }])
  await expect(row(page, 'rapport.pdf').locator('td').nth(2)).toHaveText('1')
  const line = lines.find(l => l._id === 'file1') as MockLine
  expect(line.auteur).toBe('Durand')
  expect(line.attachmentPath).toMatch(/rapport\.pdf$/)

  await page.getByRole('button', { name: 'Importer', exact: true }).click()
  await page.locator('.v-overlay--active input[type=file]').setInputFiles({ name: 'rapport.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') })
  await page.locator('.v-overlay--active').getByRole('button', { name: 'Importer', exact: true }).click()
  await expect(page.locator('.v-overlay--active .v-alert')).toContainText('existe déjà dans ce dossier')

  // with several files, the new ones are imported and only the duplicates stay selected
  await page.locator('.v-overlay--active input[type=file]').setInputFiles([
    { name: 'rapport.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') },
    { name: 'nouveau.txt', mimeType: 'text/plain', buffer: Buffer.from('x') }
  ])
  await page.locator('.v-overlay--active').getByRole('button', { name: 'Importer', exact: true }).click()
  await expect(page.locator('.v-overlay--active .v-alert')).toContainText('« rapport.pdf » existe déjà')
  await expect(row(page, 'nouveau.txt')).toBeVisible()
  expect(lines.filter(l => l.nom === 'nouveau.txt')).toHaveLength(1)
  expect(lines.filter(l => l.nom === 'rapport.pdf')).toHaveLength(1)
})

test('refuse de renommer un document avec le nom dun autre document du dossier', async ({ ged }) => {
  const { page, lines } = ged
  await page.goto('/')
  await row(page, 'rapport.pdf').getByRole('button', { name: 'Modifier rapport.pdf' }).click()
  await page.locator('.v-overlay--active').getByLabel('Nom affiché').fill('docs')
  await dialogSubmit(page, 'Enregistrer')
  expect(lines.find(l => l._id === 'file1')?.nom).toBe('docs')

  await dropFiles(page, [{ name: 'autre.txt' }])
  await expect(row(page, 'autre.txt')).toBeVisible()
  await row(page, 'autre.txt').getByRole('button', { name: 'Modifier autre.txt' }).click()
  await page.locator('.v-overlay--active').getByLabel('Nom affiché').fill('docs')
  await page.locator('.v-overlay--active').getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.locator('.v-overlay--active').getByText('« docs » existe déjà dans ce dossier')).toBeVisible()
  expect(lines.filter(l => l.nom === 'docs' && l.type_mime !== '_folder')).toHaveLength(1)
})

test('écrit et modifie les métadonnées dun document', async ({ ged }) => {
  const { page, lines } = ged
  await page.goto('/')
  await page.getByRole('button', { name: 'Importer', exact: true }).click()
  await page.locator('.v-overlay--active input[type=file]').setInputFiles({ name: 'avec-meta.txt', mimeType: 'text/plain', buffer: Buffer.from('x') })
  await page.getByLabel('Auteur').fill('Dupont')
  await dialogSubmit(page, 'Importer')
  expect(lines.find(l => l.nom === 'avec-meta.txt')?.auteur).toBe('Dupont')

  await row(page, 'rapport.pdf').getByRole('button', { name: 'Modifier rapport.pdf' }).click()
  await expect(page.getByLabel('Auteur')).toHaveValue('Durand')
  await page.getByLabel('Auteur').fill('Martin')
  await dialogSubmit(page, 'Enregistrer')
  expect(lines.find(l => l._id === 'file1')?.auteur).toBe('Martin')
})

test('recherche dans toute larborescence, ouvre un dossier trouvé et revient en effaçant', async ({ ged }) => {
  const { page, requests } = ged
  await page.goto('/')
  await expect(row(page, 'rapport.pdf')).toBeVisible()
  const before = requests.length
  await page.getByRole('textbox', { name: 'Rechercher' }).pressSequentially('not', { delay: 30 })
  await expect.poll(() => names(page)).toEqual(['notes.txt'])
  expect(requests.slice(before).filter(r => r.query.q)).toHaveLength(1)

  await page.getByLabel('Vider Rechercher').click()
  await expect.poll(() => names(page)).toEqual(['docs', 'images', 'rapport.pdf'])
  await expect(page).not.toHaveURL(/q=/)

  await page.getByRole('textbox', { name: 'Rechercher' }).fill('notes')
  await row(page, 'notes.txt').getByRole('button', { name: '/docs/' }).click()
  await expect(page).toHaveURL(/path=%2Fdocs%2F/)
  await expect.poll(() => names(page)).toEqual(['notes.txt'])
})

test('gère les noms de dossier spéciaux et les noms répétés dans le chemin', async ({ ged }) => {
  const { page } = ged
  const special = 'Rapports "2026" (v1): a*b?'
  await page.goto('/')
  await page.getByRole('button', { name: 'Nouveau dossier' }).click()
  await page.getByLabel('Nom du dossier').fill('a/b')
  await expect(page.getByText('Le nom ne peut pas contenir')).toBeVisible()
  await page.getByLabel('Nom du dossier').fill(special)
  await dialogSubmit(page, 'Créer')
  await row(page, special).getByRole('link', { name: special, exact: true }).click()
  await dropFiles(page, [{ name: 'dedans.txt' }])
  await expect(row(page, 'dedans.txt')).toBeVisible()

  await page.goto('/?path=%2Fa%2Fb%2Fa%2F')
  await page.getByRole('navigation', { name: "Fil d'Ariane" }).getByRole('link', { name: 'a', exact: true }).first().click()
  await expect(page).toHaveURL(/path=%2Fa%2F$/)
})

test.describe('historique désactivé sur le jeu de données', () => {
  test.use({ gedOptions: { history: false } })
  test('masque le bouton historique', async ({ ged }) => {
    const { page } = ged
    await page.goto('/')
    await expect(row(page, 'rapport.pdf').getByRole('link', { name: 'Télécharger rapport.pdf' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Historique/ })).toHaveCount(0)
  })
})

test('déclenche la capture une fois les lignes affichées et allège la vignette', async ({ ged }) => {
  const { page } = ged
  await page.addInitScript(() => {
    (window as any).triggerCapture = () => {
      (window as any).__captureRows = document.querySelectorAll('tbody tr.v-data-table__tr').length
      return Promise.resolve(false)
    }
  })
  await page.goto('/?thumbnail=true')
  await expect.poll(() => page.evaluate(() => (window as any).__captureRows)).toBe(3)
  await expect(page.getByRole('button', { name: 'Importer' })).toHaveCount(0)
  await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0)
})

test('affiche les métadonnées en colonnes et trie par data-fair, dossiers en tête', async ({ ged }) => {
  const { page, lines, requests } = ged
  lines.push({ _id: 'gros', nom: 'gros.pdf', path: '/', attachmentPath: 'gros/h/gros.pdf', taille: 9000000, type_mime: 'application/pdf', nbrevisions: 0, auteur: 'Martin' })
  await page.goto('/')
  await expect(page.getByRole('columnheader', { name: 'Auteur' })).toBeVisible()
  await expect(row(page, 'rapport.pdf')).toContainText('Durand')
  await expect.poll(() => names(page)).toEqual(['docs', 'images', 'gros.pdf', 'rapport.pdf'])

  await page.getByRole('columnheader', { name: 'Taille' }).click()
  await expect(page).toHaveURL(/sort=taille/)
  await expect.poll(() => names(page)).toEqual(['docs', 'images', 'rapport.pdf', 'gros.pdf'])
  await page.getByRole('columnheader', { name: 'Taille' }).click()
  await expect(page).toHaveURL(/sort=-taille/)
  await expect.poll(() => names(page)).toEqual(['docs', 'images', 'gros.pdf', 'rapport.pdf'])
  expect(requests.some(r => r.suffix === '/lines' && r.query.sort === '-taille')).toBe(true)
})
