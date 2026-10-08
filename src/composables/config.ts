import { computed, inject, ref, type App, type Ref } from 'vue'
import type { Application, Dataset, Field } from '@data-fair/lib-common-types/application/index.js'
import type { MetadataField } from '@/assets/ged'

export interface GedDataset {
  id?: string
  href?: string
  title?: string
  finalizedAt?: string
  applicationKeyPermissions?: Record<string, unknown>
  managedByApp?: boolean
}

export interface ConfigState {
  application: Application
  config: Ref<any>
  setConfig: (newConfig: any) => void
  setDataset: (dataset: GedDataset) => void
  notifyConfigChange: (field: string, value: unknown) => void
  dataset: Ref<Dataset | undefined>
  datasets: Ref<Dataset[]>
  metadata: Ref<MetadataField[]>
  fields: Ref<Record<string, Field>>
  datasetUrl: Ref<string | undefined>
  finalizedAt: Ref<string | undefined>
  error: Ref<string | null>
}

export function setByPath (obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.')
  let current: any = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    } else {
      current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] }
    }
    current = current[key]
  }
  current[keys[keys.length - 1]] = value
}

// interprète un message "set-config" reçu du parent et retourne la nouvelle configuration, ou null
export function resolveConfigMessage (config: any, content: any): any | null {
  if (!content) return null
  if (content.configuration) return content.configuration
  if (content.datasets) return { ...config, ...content }
  if (content.field && 'value' in content) {
    const newConfig = JSON.parse(JSON.stringify(config))
    setByPath(newConfig, content.field, content.value)
    return newConfig
  }
  return null
}

export function createConfig () {
  const application = window.APPLICATION as Application & { href: string }
  const config = ref<any>(application?.configuration || {})

  const dataset = computed(() => config.value?.datasets?.[0] as Dataset | undefined)
  const datasets = computed(() => (config.value?.datasets || []) as Dataset[])
  const metadata = computed(() => (config.value?.metadata || []) as MetadataField[])

  const fields = computed(() => {
    const schema = dataset.value?.schema || []
    return schema.reduce((acc: Record<string, Field>, field: Field) => {
      if (field.key) acc[field.key] = field
      return acc
    }, {})
  })

  const datasetUrl = computed(() => dataset.value?.href)
  const finalizedAt = computed(() => dataset.value?.finalizedAt)

  const error = computed(() => {
    if (!config.value) return 'Il n\'y a pas de configuration définie'
    if (!dataset.value) return 'Veuillez sélectionner une source de données'
    return null
  })

  function applyConfig (newConfig: any) {
    config.value = newConfig
    // useAppInfo lit window.APPLICATION.configuration : on garde les deux sources alignées
    application.configuration = newConfig
  }

  function setConfig (newConfig: any) {
    applyConfig(newConfig)
  }

  // adoption du jeu de données créé ou trouvé : on met à jour la config locale et on la remonte au parent
  function setDataset (dataset: GedDataset) {
    applyConfig({ ...config.value, datasets: [dataset] })
    notifyConfigChange('datasets', [dataset])
  }

  function notifyConfigChange (field: string, value: unknown) {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'set-config',
        content: { field, value }
      }, window.location.origin)
    }
  }

  return {
    install (app: App) {
      app.provide('data-fair-app-config', {
        application,
        config,
        setConfig,
        setDataset,
        notifyConfigChange,
        dataset,
        datasets,
        metadata,
        fields,
        datasetUrl,
        finalizedAt,
        error
      })

      window.addEventListener('message', (event) => {
        if (event.data?.type === 'set-config') {
          const next = resolveConfigMessage(config.value, event.data.content)
          if (next) applyConfig(next)
        }
      })
    }
  }
}

export function useConfig (): ConfigState {
  const config = inject<ConfigState>('data-fair-app-config')
  if (!config) throw new Error('useConfig requires using the plugin createConfig')
  return config
}

export default useConfig
