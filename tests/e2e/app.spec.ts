import { test, expect } from './fixtures'

test('affiche les fichiers et les dossiers du répertoire racine', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toBeVisible()
  await expect(page.locator('tbody tr', { hasText: 'docs' })).toBeVisible()
})

test('navigue dans un dossier et met à jour le fil darianne et lurl', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await expect(page.locator('tbody tr', { hasText: 'docs' })).toBeVisible()
  await page.locator('tbody tr', { hasText: 'docs' }).locator('div.tbh', { hasText: 'docs' }).click()
  await expect(page.locator('tbody tr', { hasText: 'notes.txt' })).toBeVisible()
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toHaveCount(0)
  await expect(page).toHaveURL(/path=%2Fdocs%2F/)
  await expect(page.locator('.v-banner button', { hasText: 'docs' })).toBeVisible()

  await page.locator('.mdi-home').click()
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toBeVisible()
  await expect(page).toHaveURL(/path=%2F$/)
})

test('ouvre directement un dossier via le paramètre durl path', async ({ ged }) => {
  const { page } = ged
  await page.goto('/?path=%2Fdocs%2F')
  await expect(page.locator('tbody tr', { hasText: 'notes.txt' })).toBeVisible()
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toHaveCount(0)
})

test('crée un dossier', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toBeVisible()
  await page.locator('.mdi-folder-plus-outline').click()
  await page.getByLabel('Nom').fill('archives')
  await page.getByRole('button', { name: 'Créer dossier', exact: true }).click()
  await expect(page.locator('tbody tr', { hasText: 'archives' })).toBeVisible()
})

test('dépose un fichier dans la zone de dépôt', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toBeVisible()
  await page.setInputFiles('#file', {
    name: 'nouveau-fichier.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('contenu du nouveau fichier')
  })
  await expect(page.locator('tbody tr', { hasText: 'nouveau-fichier.txt' })).toBeVisible()
})

test('conserve le document ajouté quand le rafraîchissement renvoie une liste périmée', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toBeVisible()
  ged.freezeReads()
  const listRead = page.waitForResponse(r => r.request().method() === 'GET' && r.url().includes('/lines') && r.url().includes('q_fields=path') && r.url().includes('_r=1'))
  const folderRead = page.waitForResponse(r => r.request().method() === 'GET' && r.url().includes('/lines') && r.url().includes('select=path') && r.url().includes('_r=1'))
  await page.setInputFiles('#file', {
    name: 'pas-encore-indexe.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('contenu du nouveau fichier')
  })
  await Promise.all([listRead, folderRead])
  await page.waitForTimeout(300)
  await expect(page.locator('tbody tr', { hasText: 'pas-encore-indexe.txt' })).toBeVisible()
})

test('remplace un fichier déposé en doublon puis refuse un doublon via le menu', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toBeVisible()

  // le dépôt d'un fichier de même nom remplace le fichier existant (nouvelle révision)
  await page.setInputFiles('#file', {
    name: 'rapport.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('doublon')
  })
  const row = page.locator('tbody tr', { hasText: 'rapport.pdf' })
  await expect(row).toHaveCount(1)
  await expect(row).toContainText('7 o')

  // la création d'un fichier dont le nom existe déjà dans le dossier est refusée
  await page.locator('.mdi-file-plus-outline').click()
  await page.getByLabel('Nom').fill('rapport.pdf')
  await page.locator('.v-overlay input[type="file"]').setInputFiles({
    name: 'rapport.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('x')
  })
  await page.getByRole('button', { name: 'Ajouter fichier', exact: true }).click()
  await expect(page.getByText('Erreur : le fichier est deja présent').first()).toBeVisible()
})

test('supprime un fichier après confirmation', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toBeVisible()
  const row = page.locator('tbody tr', { hasText: 'rapport.pdf' })
  await row.locator('.mdi-delete').click()
  await expect(page.getByText('Supprimer le fichier ?').first()).toBeVisible()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toHaveCount(0)
})

test('supprime un dossier et tout son contenu', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await expect(page.locator('tbody tr', { hasText: 'docs' })).toBeVisible()
  const row = page.locator('tbody tr', { hasText: 'docs' })
  await row.locator('.mdi-delete').click()
  await expect(page.getByText('Supprimer le dossier ?').first()).toBeVisible()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(page.locator('tbody tr', { hasText: 'notes.txt' })).toHaveCount(0)
  await expect(page.locator('tbody tr', { hasText: 'docs' })).toHaveCount(0)
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toBeVisible()
})

test('recherche un document dans toute larborescence', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toBeVisible()
  await page.getByPlaceholder('Rechercher').fill('notes')
  await expect(page.locator('tbody tr', { hasText: 'notes.txt' })).toBeVisible()
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toHaveCount(0)
  await page.getByPlaceholder('Rechercher').clear()
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toBeVisible()
})

test('écrit les métadonnées à la création dun fichier', async ({ ged }) => {
  const { page, requests } = ged
  await page.goto('/')
  await page.locator('.mdi-file-plus-outline').click()
  await page.getByLabel('Nom').fill('avec-meta.txt')
  await page.locator('.v-overlay input[type="file"]').setInputFiles({
    name: 'avec-meta.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('x')
  })
  await page.getByLabel('Auteur').fill('Dupont')
  await page.getByRole('button', { name: 'Ajouter fichier', exact: true }).click()
  await expect.poll(() => requests.some(r =>
    r.method === 'POST' && r.suffix === '/lines' &&
    (r.body ?? '').includes('name="auteur"') && (r.body ?? '').includes('Dupont')
  )).toBe(true)
})

test('modifie les métadonnées dun document', async ({ ged }) => {
  const { page, requests } = ged
  await page.goto('/')
  const row = page.locator('tbody tr', { hasText: 'rapport.pdf' })
  await row.locator('.mdi-pencil').click()
  await page.getByLabel('Auteur').fill('Martin')
  await page.getByRole('button', { name: 'Modifier', exact: true }).click()
  await expect.poll(() => requests.some(r =>
    r.method === 'PATCH' && r.suffix === '/lines/file1' &&
    (r.body ?? '').includes('name="auteur"') && (r.body ?? '').includes('Martin')
  )).toBe(true)
})

test('renomme un fichier', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  const row = page.locator('tbody tr', { hasText: 'rapport.pdf' })
  await row.locator('.mdi-pencil').click()
  await page.getByLabel('Nouveau nom (facultatif)').fill('rapport-v2.pdf')
  await page.getByRole('button', { name: 'Modifier', exact: true }).click()
  await expect(page.locator('tbody tr', { hasText: 'rapport-v2.pdf' })).toBeVisible()
})

test('renomme un dossier et son contenu', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  const row = page.locator('tbody tr', { hasText: 'docs' })
  await row.locator('.mdi-pencil').click()
  await page.getByLabel('Nouveau nom', { exact: true }).fill('archives')
  await page.getByRole('button', { name: 'Modifier', exact: true }).click()
  await expect(page.locator('tbody tr', { hasText: 'archives' })).toBeVisible()
  await expect(page.locator('tbody tr', { hasText: 'notes.txt' })).toHaveCount(0)
})

test('ouvre le dossier dun résultat de recherche', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await page.getByPlaceholder('Rechercher').fill('notes')
  const row = page.locator('tbody tr', { hasText: 'notes.txt' })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: '/docs/' }).click()
  await expect(page).toHaveURL(/path=%2Fdocs%2F/)
  await expect(page.locator('tbody tr', { hasText: 'notes.txt' })).toBeVisible()
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toHaveCount(0)
})

test('télécharge un fichier', async ({ ged }) => {
  const { page, requests } = ged
  await page.goto('/')
  const row = page.locator('tbody tr', { hasText: 'rapport.pdf' })
  await row.locator('.mdi-download').click()
  await expect.poll(() => requests.some(r => r.method === 'GET' && r.suffix.startsWith('/attachments/'))).toBe(true)
})

test('affiche lhistorique des révisions dun fichier', async ({ ged }) => {
  const { page } = ged
  await page.goto('/')
  await expect(page.locator('tbody tr', { hasText: 'rapport.pdf' })).toBeVisible()
  const row = page.locator('tbody tr', { hasText: 'rapport.pdf' })
  await row.locator('.mdi-history').click()
  await expect(page.getByText('Historique des modifications :')).toBeVisible()
  await expect(page.getByText('Version actuelle')).toBeVisible()
  await expect(page.locator('.mdi-download').first()).toBeVisible()
})
