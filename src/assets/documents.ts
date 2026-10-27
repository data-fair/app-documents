import {
  mdiCodeJson, mdiFileDelimitedOutline, mdiFileDocumentOutline, mdiFileExcelOutline, mdiFileImageOutline, mdiFileMusicOutline,
  mdiFileOutline, mdiFilePdfBox, mdiFilePowerpointOutline, mdiFileVideoOutline, mdiFileWordOutline, mdiFolderZipOutline,
  mdiLanguageMarkdownOutline
} from '@mdi/js'
import { attachmentFilename } from '@data-fair/lib-utils/format/attachment.js'

export const FOLDER_MIME = '_folder'

export interface DocumentLine {
  _id: string
  nom: string
  path: string
  attachmentPath?: string
  _attachment_url?: string
  taille?: number
  type_mime?: string
  nbrevisions?: number
  _updatedAt?: string
  // configurable metadata fields
  [key: string]: unknown
}

// a folder row: an explicit `_folder` line, or a folder only implied by the paths of its content
export interface FolderRow {
  kind: 'folder'
  name: string
  path: string
  line?: DocumentLine
}

export interface FileRow {
  kind: 'file'
  line: DocumentLine
}

export type Row = FolderRow | FileRow

export interface LinesResponse {
  results: DocumentLine[]
  total?: number
  next?: string
}

export interface Revision extends DocumentLine {
  _i?: number
  _action?: string
}

export function isFolderLine (line: DocumentLine): boolean {
  return line.type_mime === FOLDER_MIME
}

// a path always starts and ends with a slash, the root is '/'
export function normalizePath (value: unknown): string {
  if (typeof value !== 'string') return '/'
  const segments = value.split('/').filter(Boolean)
  return segments.length ? `/${segments.join('/')}/` : '/'
}

export function pathSegments (path: string): string[] {
  return path.split('/').filter(Boolean)
}

// path of the breadcrumb entry at this index (-1 is the root)
export function pathAt (path: string, index: number): string {
  return normalizePath(pathSegments(path).slice(0, index + 1).join('/'))
}

export function childPath (path: string, name: string): string {
  return `${path}${name}/`
}

export function parentPath (path: string): string {
  return pathAt(path, pathSegments(path).length - 2)
}

// names of the direct sub-folders of `path`, given the distinct paths of its descendants
export function subFolderNames (descendantPaths: string[], path: string): string[] {
  const names = new Set<string>()
  for (const p of descendantPaths) {
    if (!p.startsWith(path) || p === path) continue
    const name = p.slice(path.length).split('/')[0]
    if (name) names.add(name)
  }
  return [...names]
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

// folders first (explicit lines and folders implied by paths, merged by name, sorted by name),
// then files in the order data-fair sorted them
export function buildRows (lines: DocumentLine[], impliedFolders: string[], path: string, descending = false): Row[] {
  const folders = new Map<string, FolderRow>()
  const files: FileRow[] = []
  for (const line of lines) {
    if (isFolderLine(line)) folders.set(line.nom, { kind: 'folder', name: line.nom, path: line.path, line })
    else files.push({ kind: 'file', line })
  }
  for (const name of impliedFolders) {
    if (!folders.has(name)) folders.set(name, { kind: 'folder', name, path })
  }
  const sortedFolders = [...folders.values()].sort((a, b) => collator.compare(a.name, b.name) * (descending ? -1 : 1))
  return [...sortedFolders, ...files]
}

// rows of a search: every match of the tree, no implied folder
export function buildSearchRows (lines: DocumentLine[]): Row[] {
  return lines.map(line => isFolderLine(line)
    ? { kind: 'folder', name: line.nom, path: line.path, line }
    : { kind: 'file', line })
}

export function folderNameError (name: string, siblings: string[]): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'empty'
  if (trimmed.includes('/')) return 'slash'
  if (siblings.includes(trimmed)) return 'exists'
  return null
}

// a name the user never changed follows the file when the file is replaced
export function nameAfterReplace (line: DocumentLine, newFileName: string, typedName?: string): string {
  if (typedName?.trim()) return typedName.trim()
  return line.nom === attachmentFilename(line.attachmentPath ?? '') ? newFileName : line.nom
}

export function attachmentUrl (datasetUrl: string, attachmentPath: string): string {
  return `${datasetUrl}/attachments/${attachmentPath.split('/').map(encodeURIComponent).join('/')}`
}

// history entries where the stored file changed, newest first: the versions of the file
export function fileVersions (revisions: Revision[]): Revision[] {
  const versions: Revision[] = []
  for (const revision of revisions) {
    if (revision._action === 'delete' || !revision.attachmentPath) continue
    if (versions.at(-1)?.attachmentPath === revision.attachmentPath) {
      versions[versions.length - 1] = revision
    } else {
      versions.push(revision)
    }
  }
  return versions
}

// by mime type first, then by extension: browsers send no type for many files (.md, .odt…)
const fileTypes: [RegExp, RegExp, string][] = [
  [/pdf/, /^pdf$/, mdiFilePdfBox],
  [/^image\//, /^(png|jpe?g|gif|svg|webp|tiff?|bmp)$/, mdiFileImageOutline],
  [/^video\//, /^(mp4|mov|avi|mkv|webm)$/, mdiFileVideoOutline],
  [/^audio\//, /^(mp3|wav|ogg|flac|m4a)$/, mdiFileMusicOutline],
  [/(spreadsheet|excel)/, /^(xlsx?|ods)$/, mdiFileExcelOutline],
  [/^text\/(csv|tab-separated-values)/, /^(csv|tsv)$/, mdiFileDelimitedOutline],
  [/(presentation|powerpoint)/, /^(pptx?|odp)$/, mdiFilePowerpointOutline],
  [/(wordprocessing|msword|opendocument\.text|rtf)/, /^(docx?|odt|rtf)$/, mdiFileWordOutline],
  [/(zip|compressed|x-tar|gzip|x-7z|x-rar)/, /^(zip|tar|gz|tgz|7z|rar)$/, mdiFolderZipOutline],
  [/json/, /^(json|geojson)$/, mdiCodeJson],
  [/markdown/, /^md$/, mdiLanguageMarkdownOutline],
  [/^text\//, /^txt$/, mdiFileDocumentOutline]
]

export function fileIcon (mime?: string, name?: string): string {
  const type = mime && mime !== 'application/octet-stream' ? mime : ''
  const extension = name?.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  return fileTypes.find(([byType]) => type && byType.test(type))?.[2] ??
    fileTypes.find(([, byExtension]) => extension && byExtension.test(extension))?.[2] ??
    mdiFileOutline
}
