import { reactive } from 'vue'
export default function useAppInfo () {
  // @ts-ignore
  const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
  const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
  const dataset = config.datasets?.[0]
  const wsUrl = application.wsUrl
  if (!dataset) {
    throw new Error('Veuillez sélectionner une source de données')
  }
  const dataUrl = config.datasets[0].href
  const datasetId = config.datasets[0].id
  const payloadDocument = reactive({
    nom: '',
    file: ''
  })
  return {
    dataUrl,
    datasetId,
    payloadDocument,
    wsUrl
  }
}