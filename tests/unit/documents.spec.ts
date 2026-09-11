import { test, expect } from '@playwright/test'
import {
  buildLinesMap,
  displaySize,
  escapeQueryPath,
  extractFolderNames,
  mergePendingLines,
  navigatePath,
  type DocumentLine
} from '../../src/assets/documents'

test.describe('displaySize', () => {
  test('affiche les octets en dessous de 1 Ko', () => {
    expect(displaySize(0)).toBe('0 o')
    expect(displaySize(500)).toBe('500 o')
    expect(displaySize(999)).toBe('999 o')
  })

  test('affiche les Ko entre 1 Ko et 1 Mo', () => {
    expect(displaySize(2048)).toBe('2.0 Ko')
    expect(displaySize(123456)).toBe('123.5 Ko')
  })

  test('affiche les Mo au delà de 1 Mo', () => {
    expect(displaySize(2500000)).toBe('2.5 Mo')
  })
})

test.describe('escapeQueryPath', () => {
  test('échappe les slashs et les espaces', () => {
    expect(escapeQueryPath('/')).toBe('\\/')
    expect(escapeQueryPath('/docs/')).toBe('\\/docs\\/')
    expect(escapeQueryPath('/mes documents/')).toBe('\\/mes\\ documents\\/')
  })
})

test.describe('extractFolderNames', () => {
  test('extrait les dossiers immédiats à la racine', () => {
    const results = [
      { path: '/' },
      { path: '/docs/' },
      { path: '/docs/notes.txt' },
      { path: '/images/photo.png' }
    ]
    expect(extractFolderNames(results, '/')).toEqual(['docs', 'images'])
  })

  test('extrait les dossiers immédiats dun sous-dossier', () => {
    const results = [
      { path: '/docs/' },
      { path: '/docs/sous-dossier/' },
      { path: '/docs/sous-dossier/fichier.pdf' }
    ]
    expect(extractFolderNames(results, '/docs/')).toEqual(['sous-dossier'])
  })

  test('ne déduit aucun dossier sans contenu enfant', () => {
    expect(extractFolderNames([{ path: '/' }], '/')).toEqual([])
  })

  test('ignore les lignes sans path', () => {
    expect(extractFolderNames([{}], '/')).toEqual([])
  })
})

test.describe('buildLinesMap', () => {
  test('indexe les fichiers par _id et ajoute les dossiers déduits', () => {
    const files: DocumentLine[] = [
      { _id: 'file1', nom: 'rapport.pdf', path: '/', attachmentPath: 'file1/abc/rapport.pdf' }
    ]
    const map = buildLinesMap(files, ['docs'], '/')
    expect(map.size).toBe(2)
    expect(map.get('file1')?.nom).toBe('rapport.pdf')
    const folder = map.get('docs')
    expect(folder?.nom).toBe('docs')
    expect(folder?.attachmentPath).toBeUndefined()
    expect(folder?.path).toBe('/')
  })

  test('ne mute pas les objets résultats passés en entrée', () => {
    const files: DocumentLine[] = [{ _id: 'file1', nom: 'rapport.pdf' }]
    const map = buildLinesMap(files, [], '/')
    expect(map.get('file1')?.nom).toBe('rapport.pdf')
    expect(files[0].load).toBeUndefined()
  })
})

test.describe('mergePendingLines', () => {
  test('conserve une ligne en cours de création absente de la réponse', () => {
    const lines = new Map<string, DocumentLine>([['file1', { _id: 'file1', nom: 'rapport.pdf' }]])
    const previous = new Map<string, DocumentLine>([['new1', { _id: 'new1', nom: 'nouveau.txt', path: '/', load: true, pending: true, color: '#1e88e5' }]])
    const merged = mergePendingLines(lines, previous, '/')
    expect(merged.get('new1')?.nom).toBe('nouveau.txt')
    expect(merged.get('new1')?.pending).toBe(true)
  })

  test('ignore les lignes en attente dun autre dossier', () => {
    const lines = new Map<string, DocumentLine>()
    const previous = new Map<string, DocumentLine>([['new1', { _id: 'new1', nom: 'nouveau.txt', path: '/docs/', pending: true }]])
    const merged = mergePendingLines(lines, previous, '/')
    expect(merged.has('new1')).toBe(false)
  })

  test('ne conserve pas les lignes terminées absentes de la réponse', () => {
    const lines = new Map<string, DocumentLine>()
    const previous = new Map<string, DocumentLine>([['file1', { _id: 'file1', nom: 'ancien.pdf', path: '/' }]])
    const merged = mergePendingLines(lines, previous, '/')
    expect(merged.size).toBe(0)
  })

  test('ne conserve pas une suppression en cours (load sans pending)', () => {
    const lines = new Map<string, DocumentLine>()
    const previous = new Map<string, DocumentLine>([['file1', { _id: 'file1', nom: 'supprime.pdf', path: '/', load: true, color: 'red' }]])
    const merged = mergePendingLines(lines, previous, '/')
    expect(merged.size).toBe(0)
  })

  test('ne remplace pas une ligne présente dans la réponse', () => {
    const lines = new Map<string, DocumentLine>([['file1', { _id: 'file1', nom: 'a-jour.pdf' }]])
    const previous = new Map<string, DocumentLine>([['file1', { _id: 'file1', nom: 'en-attente.pdf', path: '/', pending: true }]])
    const merged = mergePendingLines(lines, previous, '/')
    expect(merged.get('file1')?.nom).toBe('a-jour.pdf')
  })
})

test.describe('navigatePath', () => {
  test('descend dans un dossier', () => {
    const { newPath, newPathArray } = navigatePath([], 'docs')
    expect(newPath).toBe('/docs/')
    expect(newPathArray).toEqual(['docs'])
  })

  test('descend de plusieurs niveaux', () => {
    const { newPath, newPathArray } = navigatePath(['docs'], 'archives')
    expect(newPath).toBe('/docs/archives/')
    expect(newPathArray).toEqual(['docs', 'archives'])
  })

  test('remonte vers un ancêtre en tronquant la fin du chemin', () => {
    const { newPath, newPathArray } = navigatePath(['docs', 'archives', 'temp'], 'docs')
    expect(newPath).toBe('/docs/')
    expect(newPathArray).toEqual(['docs'])
  })

  test('retourne à la racine', () => {
    const { newPath, newPathArray } = navigatePath(['docs', 'archives'], '/')
    expect(newPath).toBe('/')
    expect(newPathArray).toEqual([])
  })

  test('ne mute pas le tableau passé en entrée', () => {
    const current = ['docs']
    navigatePath(current, 'archives')
    expect(current).toEqual(['docs'])
  })
})
