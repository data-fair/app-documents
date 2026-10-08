import { ref, watch } from 'vue'
import { ofetch } from 'ofetch'
import { buildDatasetSchema, metadataKeyError } from '@/assets/ged'
import { useConfig } from './config'
import { sendUiNotif } from './ui-notif'

interface DatasetRef {
  id: string
  href?: string
  title?: string
}

// écrase la config du parent et récupère le jeu de données fragment de l'application GED
export function useGedDataset () {
  const config = useConfig()
  const provisioning = ref(false)
  const provisionError = ref<string | null>(null)
  let attempted = false

  function adopt (dataset: DatasetRef) {
    config.setDataset({
      id: dataset.id,
      href: dataset.href ?? `${apiBase()}/datasets/${dataset.id}`,
      title: dataset.title,
      applicationKeyPermissions: { classes: ['read', 'write'] },
      managedByApp: true
    })
  }

  // ajoute au jeu de données géré par l'application les colonnes de métadonnées manquantes
  // (jamais de suppression de colonne : on ne veut pas perdre de données)
  async function syncSchema () {
    const dataset = config.dataset.value as { href?: string, managedByApp?: boolean } | undefined
    if (!dataset?.href || !dataset.managedByApp) return
    try {
      const current = await ofetch<{ schema?: { key: string }[] }>(dataset.href, { query: { select: 'schema' } })
      const schema = [...(current.schema ?? [])]
      const keys = new Set(schema.map(f => f.key))
      let changed = false
      for (const field of buildDatasetSchema(config.metadata.value)) {
        if (!keys.has(field.key)) {
          schema.push(field)
          keys.add(field.key)
          changed = true
        }
      }
      if (!changed) return
      await ofetch(dataset.href, { method: 'PATCH', body: { schema } })
    } catch (e) {
      sendUiNotif({ type: 'error', msg: 'Erreur lors de la synchronisation du schéma', error: e })
    }
  }

  watch(config.metadata, () => { syncSchema().catch(() => {}) }, { deep: true })

  function apiBase () {
    const application = window.APPLICATION as { apiUrl?: string } | undefined
    return application?.apiUrl ?? '/data-fair/api/v1'
  }

  async function ensureDataset () {
    if (config.dataset.value) return
    if (attempted) return
    const application = window.APPLICATION
    if (!application?.id || !application.owner) return
    const keyError = metadataKeyError(config.metadata.value)
    if (keyError) {
      provisionError.value = keyError
      return
    }
    attempted = true
    provisioning.value = true
    provisionError.value = null
    try {
      const existing = await ofetch<{ results: DatasetRef[] }>(`${apiBase()}/datasets`, {
        query: { partOf: `application:${application.id}`, select: 'id,href,title', size: 1 }
      }).catch(() => null)
      const found = existing?.results?.[0]
      if (found) {
        adopt(found)
        await syncSchema()
        return
      }
      const created = await ofetch<DatasetRef>(`${apiBase()}/datasets`, {
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
            ...(application.owner.department ? { department: application.owner.department } : {})
          }
        }
      })
      adopt(created)
    } catch (e) {
      attempted = false
      provisionError.value = e instanceof Error ? e.message : 'Erreur lors de la création du jeu de données'
      sendUiNotif({ type: 'error', msg: provisionError.value, error: e })
    } finally {
      provisioning.value = false
    }
  }

  return { provisioning, provisionError, ensureDataset }
}

export default useGedDataset
