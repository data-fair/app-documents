import type { Config } from '@/config/index.js'

export interface AppInfo {
  dataUrl: string
  datasetId: string
  wsUrl: string
}

export default function useAppInfo (): AppInfo {
  const application = window.APPLICATION
  const config = application?.configuration as unknown as Config | undefined
  if (!application || !config) throw new Error('Il n\'y a pas de configuration définie')
  const dataset = config.datasets?.[0]
  if (!dataset?.href || !dataset?.id) throw new Error('Veuillez sélectionner une source de données')
  return {
    dataUrl: dataset.href,
    datasetId: dataset.id,
    wsUrl: application.wsUrl
  }
}
