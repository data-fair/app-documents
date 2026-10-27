import { test, expect } from '@playwright/test'
import * as mdi from '@mdi/js'
import {
  attachmentUrl,
  buildRows,
  buildSearchRows,
  childPath,
  fileIcon,
  fileVersions,
  folderNameError,
  nameAfterReplace,
  normalizePath,
  parentPath,
  pathAt,
  subFolderNames,
  type DocumentLine,
  type Revision
} from '../../src/assets/documents'

const file = (nom: string, extra: Partial<DocumentLine> = {}): DocumentLine => ({ _id: nom, nom, path: '/', attachmentPath: `${nom}/h/${nom}`, ...extra })
const folder = (nom: string, path = '/'): DocumentLine => ({ _id: `f-${nom}`, nom, path, type_mime: '_folder' })

test.describe('chemins', () => {
  test('normalise un chemin venu de lurl', () => {
    expect(normalizePath(undefined)).toBe('/')
    expect(normalizePath('')).toBe('/')
    expect(normalizePath('docs')).toBe('/docs/')
    expect(normalizePath('//docs//2024')).toBe('/docs/2024/')
  })

  test('remonte le fil dariane par position, même avec des noms répétés', () => {
    expect(pathAt('/a/b/a/', 0)).toBe('/a/')
    expect(pathAt('/a/b/a/', 1)).toBe('/a/b/')
    expect(pathAt('/a/b/a/', 2)).toBe('/a/b/a/')
    expect(pathAt('/a/b/a/', -1)).toBe('/')
  })

  test('calcule le dossier enfant et le dossier parent', () => {
    expect(childPath('/', 'docs')).toBe('/docs/')
    expect(childPath('/docs/', '2024')).toBe('/docs/2024/')
    expect(parentPath('/docs/2024/')).toBe('/docs/')
    expect(parentPath('/docs/')).toBe('/')
  })
})

test.describe('subFolderNames', () => {
  test('déduit les sous-dossiers directs des chemins descendants', () => {
    expect(subFolderNames(['/', '/docs/', '/docs/2024/', '/photos/'], '/').sort()).toEqual(['docs', 'photos'])
    expect(subFolderNames(['/docs/', '/docs/2024/', '/docs/2024/mars/'], '/docs/')).toEqual(['2024'])
  })

  test('ignore le dossier courant et les chemins hors du dossier', () => {
    expect(subFolderNames(['/docs/', '/autre/'], '/docs/')).toEqual([])
  })
})

test.describe('buildRows', () => {
  test('liste les dossiers avant les fichiers, sans doublon entre dossier explicite et déduit', () => {
    const rows = buildRows([file('a.txt'), folder('docs'), file('b.txt')], ['docs', 'photos'], '/')
    expect(rows.map(r => r.kind === 'folder' ? `dir:${r.name}` : r.line.nom)).toEqual(['dir:docs', 'dir:photos', 'a.txt', 'b.txt'])
    expect(rows[0]).toMatchObject({ kind: 'folder', line: { _id: 'f-docs' } })
    expect(rows[1]).toMatchObject({ kind: 'folder', name: 'photos', path: '/' })
    expect(rows[1].kind === 'folder' && rows[1].line).toBeFalsy()
  })

  test('garde lordre de data-fair pour les fichiers et trie les dossiers par nom', () => {
    const lines = [file('doc-10.pdf'), folder('b'), file('Doc-1.pdf'), folder('A'), file('doc-2.pdf')]
    expect(buildRows(lines, ['c'], '/').map(r => r.kind === 'folder' ? `dir:${r.name}` : r.line.nom))
      .toEqual(['dir:A', 'dir:b', 'dir:c', 'doc-10.pdf', 'Doc-1.pdf', 'doc-2.pdf'])
    expect(buildRows(lines, ['c'], '/', true).slice(0, 3).map(r => r.kind === 'folder' && r.name)).toEqual(['c', 'b', 'A'])
  })

  test('garde les dossiers trouvés par une recherche', () => {
    const rows = buildSearchRows([folder('docs', '/archives/'), file('a.txt')])
    expect(rows[0]).toMatchObject({ kind: 'folder', name: 'docs', path: '/archives/' })
    expect(rows[1].kind).toBe('file')
  })
})

test.describe('folderNameError', () => {
  test('refuse un nom vide, un slash ou un doublon', () => {
    expect(folderNameError('  ', [])).toBe('empty')
    expect(folderNameError('a/b', [])).toBe('slash')
    expect(folderNameError('docs ', ['docs'])).toBe('exists')
    expect(folderNameError('docs', ['photos'])).toBeNull()
  })
})

test.describe('noms de fichier', () => {
  test('un nom jamais modifié suit le nouveau fichier', () => {
    expect(nameAfterReplace(file('note.md'), 'note.png')).toBe('note.png')
  })

  test('un nom personnalisé est conservé', () => {
    expect(nameAfterReplace(file('note.md', { nom: 'Compte rendu' }), 'note.png')).toBe('Compte rendu')
  })

  test('un nom saisi lemporte', () => {
    expect(nameAfterReplace(file('note.md'), 'note.png', ' Nouveau nom ')).toBe('Nouveau nom')
  })

  test('encode chaque segment de lurl de la pièce jointe', () => {
    expect(attachmentUrl('/data-fair/api/v1/datasets/ged', 'id/h/a #1?.pdf')).toBe('/data-fair/api/v1/datasets/ged/attachments/id/h/a%20%231%3F.pdf')
  })
})

test.describe('fileVersions', () => {
  test('ne garde que les révisions où le fichier change, datées de son dépôt', () => {
    const revisions: Revision[] = [
      { ...file('v2.pdf'), attachmentPath: 'x/2/v2.pdf', _updatedAt: '2026-03-03', nom: 'renommé' },
      { ...file('v2.pdf'), attachmentPath: 'x/2/v2.pdf', _updatedAt: '2026-03-02' },
      { ...file('v1.pdf'), attachmentPath: 'x/1/v1.pdf', _updatedAt: '2026-03-01' }
    ]
    const versions = fileVersions(revisions)
    expect(versions.map(v => v.attachmentPath)).toEqual(['x/2/v2.pdf', 'x/1/v1.pdf'])
    expect(versions[0]._updatedAt).toBe('2026-03-02')
  })

  test('ignore les suppressions et les lignes sans fichier', () => {
    expect(fileVersions([{ ...file('a'), _action: 'delete' }, folder('docs')])).toEqual([])
  })
})

test.describe('fileIcon', () => {
  test('choisit licône selon le type, puis selon lextension', () => {
    expect(fileIcon('application/pdf', 'a.pdf')).toBe(mdi.mdiFilePdfBox)
    expect(fileIcon('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(mdi.mdiFileExcelOutline)
    expect(fileIcon('text/csv')).toBe(mdi.mdiFileDelimitedOutline)
    expect(fileIcon('', 'lisez-moi.md')).toBe(mdi.mdiLanguageMarkdownOutline)
    expect(fileIcon('application/octet-stream', 'note.ODT')).toBe(mdi.mdiFileWordOutline)
    expect(fileIcon('application/octet-stream', 'inconnu.bin')).toBe(mdi.mdiFileOutline)
  })
})
