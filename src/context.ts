import { computed, ref, watch } from 'vue'
import { ofetch } from 'ofetch'
import { useFetch } from '@data-fair/lib-vue/fetch.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import useAppInfo from '@/composables/useAppInfo'
import { sendUiNotif } from '@/composables/ui-notif'
import { escapeQueryPath, extractFolderNames, buildLinesMap, mergePendingLines, type DocumentLine, type LinesResponse } from '@/assets/documents'

export * from '@/assets/documents'

export const path = ref('/') // current path, default is '/'
export const pathArray = ref<string[]>([]) // it represents the navigation bar upon the data table in an array
export const data = ref(new Map<string, DocumentLine>()) // represent the data of the current path, displayed in table but also used to see if we are not uploading or updating a file we already have
export const refreshCounter = ref(0) // bumped when an operation finished indexing, used as cache-buster in useDocuments query

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
    size: 10000,
    _r: refreshCounter.value
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
          select: 'path',
          _r: refreshCounter.value
        }
      })
      folderNames = extractFolderNames(folders.results ?? [], path.value)
    } catch (e) {
      sendUiNotif({ type: 'error', msg: 'Impossible de récupérer les dossiers', error: e })
    }
    const lines = buildLinesMap(res.results ?? [], folderNames, path.value)
    data.value = mergePendingLines(lines, data.value, path.value)
  }

  // set path at value from reactive params or set '/' by default
  const initialPath = reactiveSearchParams.path
  path.value = initialPath || '/'
  pathArray.value = path.value.split('/').filter(Boolean)

  watch(response, applyLines)
  watch(loading, (l) => {
    if (!l) triggerCaptureOnce()
  })

  return { loading, refresh }
}
