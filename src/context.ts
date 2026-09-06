import { computed, ref, watch } from 'vue'
import { ofetch } from 'ofetch'
import { useFetch } from '@data-fair/lib-vue/fetch.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import useAppInfo from '@/composables/useAppInfo'
import { sendUiNotif } from '@/composables/ui-notif'

export interface DocumentLine {
  nom: string
  _id: string
  attachmentPath?: string
  taille?: number
  type_mime?: string
  path?: string
  datecreation?: string
  datemodification?: string
  nbrevisions?: number
  load?: boolean
  color?: string
}

export interface LinesResponse {
  results: DocumentLine[]
  total?: number
}

export const path = ref('/') // current path, default is '/'
export const pathArray = ref<string[]>([]) // it represents the navigation bar upon the data table in an array
export const data = ref(new Map<string, DocumentLine>()) // represent the data of the current path, displayed in table but also used to see if we are not uploading or updating a file we already have
export const refreshCounter = ref(0) // bumped when an operation finished indexing, watched by useDocuments to refetch

export function escapeQueryPath (p: string): string {
  return p.replace(/\//g, '\\/').replace(/ /g, '\\ ') // could fail if regexp dont work and provoque error 400
}

export function extractFolderNames (results: Array<{ path?: string }>, currentPath: string): string[] {
  const segmentCount = currentPath.split('/').length
  const names = new Set<string>()
  for (const result of results) {
    if (result.path === undefined) continue
    const segments = result.path.split('/')
    const name = segments[segmentCount - 1]
    if (name !== undefined && name !== '') names.add(name)
  }
  return [...names]
}

export function buildLinesMap (results: DocumentLine[], folderNames: string[], currentPath: string): Map<string, DocumentLine> {
  const lines = new Map<string, DocumentLine>()
  for (const result of results) {
    lines.set(result._id, { ...result })
  }
  for (const name of folderNames) {
    lines.set(name, { nom: name, _id: name, path: currentPath, attachmentPath: undefined })
  }
  return lines
}

export function navigatePath (currentPathArray: string[], target: string): { newPath: string, newPathArray: string[] } {
  if (target === '/') {
    return { newPath: '/', newPathArray: [] }
  }
  if (currentPathArray.includes(target)) {
    const copy = [...currentPathArray]
    let i = copy.length - 1
    while (copy[i] !== target && i > -1) {
      copy.pop()
      i--
    }
    return { newPath: '/' + copy.join('/') + '/', newPathArray: copy }
  }
  const copy = [...currentPathArray, target]
  return { newPath: '/' + copy.join('/') + '/', newPathArray: copy }
}

export function displaySize (n: number): string {
  if (n / 1000000 > 1) { // display Mo
    return (n / 1000000).toFixed(1) + ' Mo'
  } else if (n / 1000 > 1) { // display Ko
    return (n / 1000).toFixed(1) + ' Ko'
  }
  return n + ' o'
}

let captureDone = false
function triggerCaptureOnce () {
  if (captureDone) return
  captureDone = true
  window.triggerCapture?.(false)
}

export function useDocuments () {
  const { dataUrl } = useAppInfo()

  const url = computed(() => `${dataUrl}/lines`)
  const query = computed(() => ({
    qs: 'path:"' + path.value + '"',
    q_fields: 'path',
    q_mode: 'complete',
    size: 10000
  }))
  const { data: response, loading, refresh } = useFetch<LinesResponse>(url, { query })

  async function applyLines () {
    const res = response.value
    if (!res) return
    let folderNames: string[] = []
    try {
      const folders = await ofetch<LinesResponse>(`${dataUrl}/lines`, {
        query: {
          qs: `(path:${escapeQueryPath(path.value)}*)`,
          q_mode: 'complete',
          size: 10000,
          select: 'path'
        }
      })
      folderNames = extractFolderNames(folders.results ?? [], path.value)
    } catch (e) {
      sendUiNotif({ type: 'error', msg: 'Impossible de récupérer les dossiers', error: e })
    }
    data.value = buildLinesMap(res.results ?? [], folderNames, path.value)
  }

  // set path at value from reactive params or set '/' by default
  const initialPath = reactiveSearchParams.path
  path.value = initialPath || '/'
  pathArray.value = path.value.split('/').filter(Boolean)

  watch(response, applyLines)
  watch(refreshCounter, () => { refresh() })
  watch(loading, (l) => {
    if (!l) triggerCaptureOnce()
  })

  return { loading, refresh }
}
