import { computed, inject, onScopeDispose, provide, reactive, ref, watch, type InjectionKey } from 'vue'
import { ofetch } from 'ofetch'
import { useDebounce } from '@vueuse/core'
import { useFetch } from '@data-fair/lib-vue/fetch.js'
import { useWS } from '@data-fair/lib-vue/ws.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { useConfig } from './config'
import type { GedDatasetInfo } from './useGedDataset'
import { buildSearchQuery } from '@/assets/ged'
import {
  FOLDER_MIME, buildRows, buildSearchRows, childPath, isFolderLine, nameAfterReplace, normalizePath, subFolderNames,
  type DocumentLine, type LinesResponse, type Row
} from '@/assets/documents'

export const SEARCH_SIZE = 100
// ponytail: a folder shows its first 10 000 entries (data-fair page limit); page with `after` if GEDs get bigger
export const FOLDER_SIZE = 10000
// ponytail: implied folders (legacy data without `_folder` lines) come from the first 1 000 distinct descendant paths
const VALUES_SIZE = 1000

const BASE_FIELDS = ['_id', 'nom', 'path', 'attachmentPath', '_attachment_url', 'taille', 'type_mime', 'nbrevisions', '_updatedAt']

export interface Upload {
  name: string
  loaded: number
  total: number
}

export class DuplicateError extends Error {
  constructor (public fileName: string) { super(`duplicate ${fileName}`) }
}

// multipart write with upload progress, which fetch does not report
function postForm<T> (url: string, body: FormData, onProgress: (loaded: number, total: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded, e.total) }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as T)
      else reject(Object.assign(new Error(typeof xhr.response === 'string' ? xhr.response : `${xhr.status} ${xhr.statusText}`), { status: xhr.status, data: xhr.response }))
    }
    xhr.onerror = () => reject(new Error('network error'))
    xhr.send(body)
  })
}

// columns missing from the dataset are skipped: data-fair rejects unknown properties
function appendFields (form: FormData, fields: Record<string, unknown>, keys: Set<string>) {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') continue
    if (!key.startsWith('_') && !keys.has(key)) continue
    form.append(key, String(value))
  }
}

export function createDocuments (datasetInfo: () => GedDatasetInfo | null, sort: () => string | undefined) {
  const { dataset, datasetUrl, metadata, accessKey } = useConfig()

  const path = computed({
    get: () => normalizePath(reactiveSearchParams.path),
    set: (value: string) => {
      if (value === '/') delete reactiveSearchParams.path
      else reactiveSearchParams.path = value
    }
  })
  const search = computed({
    get: () => reactiveSearchParams.q ?? '',
    set: (value: string | null) => {
      if (value) reactiveSearchParams.q = value
      else delete reactiveSearchParams.q
    }
  })
  const searchTerm = useDebounce(computed(() => search.value.trim()), 300)
  const isSearching = computed(() => !!searchTerm.value)

  // a new value per page load and per write: the http cache of /lines would otherwise serve a previous state
  const version = ref(Date.now())

  const schemaKeys = computed(() => new Set((datasetInfo()?.schema ?? []).map(f => f.key)))
  // the sort comes from the url: a column that does not exist would make data-fair refuse the listing
  const sortParam = computed(() => {
    const value = sort()
    return value && schemaKeys.value.has(value.replace(/^-/, '')) ? value : undefined
  })
  const select = computed(() => [...BASE_FIELDS, ...metadata.value.map(m => m.key)].filter(k => schemaKeys.value.has(k)).join(','))
  const linesUrl = computed(() => datasetInfo() && datasetUrl.value ? `${datasetUrl.value}/lines` : null)

  const listing = useFetch<LinesResponse>(() => isSearching.value ? null : linesUrl.value, {
    query: () => ({ path_eq: path.value, size: FOLDER_SIZE, select: select.value, sort: sortParam.value ?? 'nom', _r: version.value })
  })
  const descendantPaths = useFetch<string[]>(() => isSearching.value || !linesUrl.value ? null : `${datasetUrl.value}/values/path`, {
    query: () => ({ path_starts: path.value, size: VALUES_SIZE, _r: version.value })
  })
  const searchResults = useFetch<LinesResponse>(() => isSearching.value ? linesUrl.value : null, {
    query: () => {
      const { q, q_fields: qFields } = buildSearchQuery(searchTerm.value, metadata.value)
      return { q, q_mode: 'complete', q_fields: qFields.split(',').filter(k => schemaKeys.value.has(k)).join(','), size: SEARCH_SIZE, select: select.value, ...(sortParam.value ? { sort: sortParam.value } : {}), _r: version.value }
    }
  })

  const rows = computed<Row[] | null>(() => {
    if (isSearching.value) return searchResults.data.value ? buildSearchRows(searchResults.data.value.results) : null
    if (!listing.data.value || !descendantPaths.data.value) return null
    return buildRows(listing.data.value.results, subFolderNames(descendantPaths.data.value, path.value), path.value, sortParam.value === '-nom')
  })
  const total = computed(() => (isSearching.value ? searchResults.data.value?.total : listing.data.value?.total) ?? 0)
  const loading = computed(() => listing.loading.value || descendantPaths.loading.value || searchResults.loading.value)

  const uploads = reactive(new Map<number, Upload>())
  let uploadId = 0
  const uploadProgress = computed(() => {
    let loaded = 0
    let total = 0
    for (const u of uploads.values()) { loaded += u.loaded; total += u.total }
    return total ? Math.round(loaded * 100 / total) : 0
  })

  function refresh () {
    version.value = Date.now()
  }

  // every write, a worker's bulk or another user's write, ends with a finalize-end in the dataset journal (as in app-contribs)
  const pending = ref(false)
  let pendingTimeout: ReturnType<typeof setTimeout> | undefined
  function endPending () {
    clearTimeout(pendingTimeout)
    pending.value = false
    refresh()
  }
  function waitFinalize () {
    pending.value = true
    clearTimeout(pendingTimeout)
    // ponytail: without the journal (no realtime-journal permission) the list only refreshes after 30 s
    pendingTimeout = setTimeout(endPending, 30000)
  }
  const datasetId = dataset.value?.id
  if (datasetId) {
    useWS('/data-fair/')?.subscribe(`datasets/${datasetId}/journal`, (event: { type?: string }) => {
      if (event.type === 'finalize-end') endPending()
    }, { applicationKey: accessKey, appId: window.APPLICATION?.id })
  }
  onScopeDispose(() => clearTimeout(pendingTimeout))

  function openFolder (target: string) {
    search.value = ''
    path.value = normalizePath(target)
  }

  // the file of this name in a folder, a sub-folder of the same name aside
  async function findFile (folder: string, name: string) {
    const res = await ofetch<LinesResponse>(`${datasetUrl.value}/lines`, {
      query: { path_eq: folder, nom_eq: name, size: 10, select: select.value, _r: Date.now() }
    })
    return res.results.find(line => !isFolderLine(line))
  }

  // a document name already used in the folder by another document
  async function nameTaken (folder: string, name: string, exceptId?: string) {
    const existing = await findFile(folder, name.trim())
    return !!existing && existing._id !== exceptId
  }

  // an explicit folder line or a folder implied by the paths of its content
  async function folderExists (folder: string, name: string) {
    const [lines, paths] = await Promise.all([
      ofetch<LinesResponse>(`${datasetUrl.value}/lines`, { query: { path_eq: folder, nom_eq: name.trim(), type_mime_eq: FOLDER_MIME, size: 0, _r: Date.now() } }),
      ofetch<string[]>(`${datasetUrl.value}/values/path`, { query: { path_starts: childPath(folder, name.trim()), size: 1, _r: Date.now() } })
    ])
    return !!lines.total || paths.length > 0
  }

  // every line under a folder path, following data-fair's pagination
  async function descendants (folder: string) {
    const lines: DocumentLine[] = []
    let next: string | undefined = `${datasetUrl.value}/lines`
    let query: Record<string, unknown> | undefined = { path_starts: folder, size: FOLDER_SIZE, select: '_id,path', _r: Date.now() }
    while (next) {
      const res: LinesResponse = await ofetch<LinesResponse>(next, { query })
      lines.push(...res.results)
      next = res.results.length ? res.next : undefined
      query = undefined
    }
    return lines
  }

  // without indexedAt a data-fair worker indexes the bulk after the response
  async function bulk (actions: Record<string, unknown>[]) {
    if (!actions.length) return
    const res = await ofetch<{ nbErrors?: number, errors?: { error: string }[], indexedAt?: string }>(`${datasetUrl.value}/_bulk_lines`, { method: 'POST', body: actions })
    if (res.indexedAt) refresh()
    else waitFinalize()
    if (res.nbErrors) throw new Error(res.errors?.[0]?.error ?? `${res.nbErrors} errors`)
  }

  async function createFolder (name: string) {
    await ofetch(`${datasetUrl.value}/lines`, { method: 'POST', body: { nom: name.trim(), path: path.value, type_mime: FOLDER_MIME } })
    refresh()
  }

  function track<T> (name: string, size: number, run: (onProgress: (loaded: number, total: number) => void) => Promise<T>) {
    const id = ++uploadId
    uploads.set(id, { name, loaded: 0, total: size })
    return run((loaded, total) => { uploads.set(id, { name, loaded, total }) })
      .finally(() => { uploads.delete(id) })
  }

  async function uploadFile (file: File, options: { name?: string, metadata?: Record<string, unknown>, replace?: boolean } = {}) {
    const folder = path.value
    const name = options.name?.trim() || file.name
    const existing = await findFile(folder, name)
    if (existing) {
      if (!options.replace) throw new DuplicateError(name)
      return await replaceFile(existing, file, { metadata: options.metadata })
    }
    const form = new FormData()
    form.append('attachment', file)
    const now = new Date().toISOString()
    appendFields(form, {
      nom: name,
      path: folder,
      taille: file.size,
      type_mime: file.type || 'application/octet-stream',
      nbrevisions: 0,
      datecreation: now,
      datemodification: now,
      ...options.metadata
    }, schemaKeys.value)
    await track(file.name, file.size, onProgress => postForm(`${datasetUrl.value}/lines`, form, onProgress))
    refresh()
  }

  async function uploadFiles (files: File[]) {
    const results = await Promise.allSettled(files.map(file => uploadFile(file, { replace: true })))
    const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
    if (failed.length) throw failed[0].reason
  }

  async function replaceFile (line: DocumentLine, file: File, options: { name?: string, metadata?: Record<string, unknown> } = {}) {
    const form = new FormData()
    form.append('attachment', file)
    appendFields(form, {
      _action: 'patch',
      _id: line._id,
      nom: nameAfterReplace(line, file.name, options.name),
      taille: file.size,
      type_mime: file.type || 'application/octet-stream',
      nbrevisions: (Number(line.nbrevisions) || 0) + 1,
      datemodification: new Date().toISOString(),
      ...options.metadata
    }, schemaKeys.value)
    await track(file.name, file.size, onProgress => postForm(`${datasetUrl.value}/lines`, form, onProgress))
    refresh()
  }

  async function patchLine (line: DocumentLine, patch: Record<string, unknown>) {
    const body = Object.fromEntries(Object.entries(patch).filter(([key]) => schemaKeys.value.has(key)))
    await ofetch(`${datasetUrl.value}/lines/${encodeURIComponent(line._id)}`, { method: 'PATCH', body })
    refresh()
  }

  async function deleteFile (line: DocumentLine) {
    await ofetch(`${datasetUrl.value}/lines/${encodeURIComponent(line._id)}`, { method: 'DELETE' })
    refresh()
  }

  async function renameFolder (folder: { name: string, path: string, line?: DocumentLine }, newName: string) {
    const name = newName.trim()
    const oldPrefix = childPath(folder.path, folder.name)
    const newPrefix = childPath(folder.path, name)
    const actions: Record<string, unknown>[] = (await descendants(oldPrefix))
      .map(l => ({ _action: 'patch', _id: l._id, path: newPrefix + l.path.slice(oldPrefix.length) }))
    if (folder.line) actions.push({ _action: 'patch', _id: folder.line._id, nom: name })
    // a folder only implied by paths gets its own line, so that it survives once emptied
    else actions.push({ _action: 'create', nom: name, path: folder.path, type_mime: FOLDER_MIME })
    await bulk(actions)
  }

  async function deleteFolder (folder: { name: string, path: string, line?: DocumentLine }) {
    const lines = await descendants(childPath(folder.path, folder.name))
    if (folder.line) lines.push(folder.line)
    await bulk(lines.map(l => ({ _action: 'delete', _id: l._id })))
  }

  return {
    path,
    search,
    isSearching,
    rows,
    total,
    loading,
    initialized: computed(() => isSearching.value ? searchResults.initialized.value : listing.initialized.value),
    uploads,
    uploadProgress,
    pending,
    openFolder,
    createFolder,
    uploadFile,
    uploadFiles,
    replaceFile,
    patchLine,
    deleteFile,
    renameFolder,
    deleteFolder,
    nameTaken,
    folderExists,
    refresh
  }
}

export type Documents = ReturnType<typeof createDocuments>
const key: InjectionKey<Documents> = Symbol('documents')

export function provideDocuments (datasetInfo: () => GedDatasetInfo | null, sort: () => string | undefined) {
  const documents = createDocuments(datasetInfo, sort)
  provide(key, documents)
  return documents
}

export function useDocuments () {
  const documents = inject(key)
  if (!documents) throw new Error('useDocuments requires provideDocuments')
  return documents
}

// keep the url path well formed when it comes from a shared link
watch(() => reactiveSearchParams.path, (value) => {
  if (value !== undefined && value !== normalizePath(value)) reactiveSearchParams.path = normalizePath(value)
}, { immediate: true })
