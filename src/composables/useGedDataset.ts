import { ref } from 'vue'
import { ofetch } from 'ofetch'
import { buildDatasetSchema, mergeDatasetSchema, metadataKeyError, type GedSchemaField } from '@/assets/ged'
import { useConfig } from './config'

interface DatasetRef {
  id: string
  href?: string
  title?: string
}

export interface GedDatasetInfo {
  schema?: GedSchemaField[]
  rest?: { history?: boolean }
}

// takes over the parent's configuration and provides the GED dataset, a fragment of the application
export function useGedDataset () {
  const config = useConfig()
  const provisionError = ref<string | null>(null)
  const datasetInfo = ref<GedDatasetInfo | null>(null)
  const ready = ref(false)
  let running = false
  let again = false

  function apiBase () {
    return window.APPLICATION?.apiUrl ?? '/data-fair/api/v1'
  }

  function adopt (dataset: DatasetRef) {
    config.setDataset({
      id: dataset.id,
      href: dataset.href ?? `${apiBase()}/datasets/${dataset.id}`,
      title: dataset.title,
      applicationKeyPermissions: { classes: ['read', 'write'], operations: ['realtime-journal'] },
      managedByApp: true
    })
  }

  async function loadInfo (href: string) {
    return await ofetch<GedDatasetInfo>(href, { query: { select: 'schema,rest' } })
  }

  // adds the missing metadata columns to the dataset managed by the application, never removes one
  async function syncSchema () {
    const dataset = config.dataset.value as { href?: string, managedByApp?: boolean } | undefined
    if (!dataset?.href || !dataset.managedByApp || !datasetInfo.value) return
    const { schema, changed } = mergeDatasetSchema(datasetInfo.value.schema ?? [], buildDatasetSchema(config.metadata.value))
    if (!changed) return
    await ofetch(dataset.href, { method: 'PATCH', body: { schema } })
    datasetInfo.value = { ...datasetInfo.value, schema }
  }

  async function provision () {
    const application = window.APPLICATION
    if (!application?.id || !application.owner) return
    const keyError = metadataKeyError(config.metadata.value)
    if (keyError) throw new Error(keyError)
    // a failed lookup is an error, not an absence: it must not create a second dataset
    const existing = await ofetch<{ results: DatasetRef[] }>(`${apiBase()}/datasets`, {
      query: { partOf: `application:${application.id}`, select: 'id,href,title', size: 1 }
    })
    const found = existing.results?.[0] ?? await ofetch<DatasetRef>(`${apiBase()}/datasets`, {
      method: 'POST',
      body: {
        title: `${application.title || 'Documents'} - GED`,
        isRest: true,
        rest: { history: true },
        schema: buildDatasetSchema(config.metadata.value),
        partOf: { type: 'application', id: application.id },
        owner: {
          type: application.owner.type,
          id: application.owner.id,
          name: (application.owner as { name?: string }).name ?? application.owner.id,
          ...(application.owner.department ? { department: application.owner.department } : {})
        }
      }
    })
    adopt(found)
  }

  async function ensureDataset () {
    // a dataset switched in the draft while loading is loaded right after
    if (running) {
      again = true
      return
    }
    running = true
    provisionError.value = null
    datasetInfo.value = null
    ready.value = false
    try {
      const dataset = config.dataset.value as { href?: string } | undefined
      if (dataset?.href) {
        datasetInfo.value = await loadInfo(dataset.href).catch(() => null)
      } else {
        await provision()
        const href = (config.dataset.value as { href?: string } | undefined)?.href
        if (href) datasetInfo.value = await loadInfo(href)
      }
      await syncSchema()
    } catch (e) {
      provisionError.value = e instanceof Error ? e.message : String(e)
    } finally {
      running = false
      ready.value = true
    }
    if (again) {
      again = false
      await ensureDataset()
    }
  }

  // the schema is synced on load only: syncing the draft while a key is typed would add a column per keystroke
  return { provisionError, datasetInfo, ready, ensureDataset }
}

export default useGedDataset
