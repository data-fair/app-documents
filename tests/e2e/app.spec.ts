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
