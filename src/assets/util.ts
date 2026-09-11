import { ref, watch } from 'vue'
import axios from 'axios'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import useWSClient from '@/composables/useWSClient'
import { sendUiNotif } from '@/composables/ui-notif'
import { data, escapeQueryPath, path, pathArray, refreshCounter, type DocumentLine } from '@/context'

const { dataUrl, datasetId, wsUrl } = useAppInfo()
export const websock = useWSClient(wsUrl) // handle and listen the websocket to have info when data-fair finished indexing data
export const loading = ref(false) // show a progress bar when uploading a file
export const loadingIndex = ref(false) // show a progress bar when data-fair is indexing the file
export const percentage = ref(0) // value of the progress bar loading
export const bufferEvent = ref(0) // number of actions done in same time, when value get back to 0, refetch data
watch(bufferEvent, () => {
  if (bufferEvent.value === 0) {
    loadingIndex.value = false
    refreshCounter.value++ // refetch, the documents list watches this counter
  } else {
    loadingIndex.value = true
  }
})

export interface DocumentPayload {
  nom: string
  file: File | File[] | null
}

function toSingleFile (file: File | File[] | null): File | null {
  if (Array.isArray(file)) return file[0] ?? null
  return file
}

function isDuplicateAttachment (file: File): string | null {
  let duplicateId: string | null = null
  data.value.forEach((value, key) => {
    if (value.attachmentPath !== undefined) {
      const tmp = value.attachmentPath.split('/').pop()
      if (tmp === file.name) duplicateId = key
    }
  })
  return duplicateId
}

function setLinePending (id: string, color: string) {
  const line = data.value.get(id)
  if (line !== undefined) {
    line.load = true
    line.color = color
  }
}

export function toDocumentLine (raw: any): DocumentLine {
  return {
    nom: raw.nom,
    _id: raw._id,
    attachmentPath: raw.attachmentPath,
    taille: raw.taille,
    type_mime: raw.type_mime,
    path: raw.path,
    datecreation: raw.datecreation,
    datemodification: raw.datemodification,
    nbrevisions: raw.nbrevisions,
    load: raw.load,
    color: raw.color
  }
}

export async function postDocument (payload: DocumentPayload) {
  const { nom, file: rawFile } = payload
  const file = toSingleFile(rawFile)
  const url = `${dataUrl}/lines`
  let postOk = false
  if (file !== null && file.size < 5000000) { // we post a file
    const formData = new FormData()
    formData.append('attachment', file)
    formData.append('nom', nom || file.name)
    formData.append('nbrevisions', '1')
    formData.append('taille', String(file.size))
    const date = new Date(file.lastModified)
    formData.append('datecreation', date.toISOString())
    formData.append('datemodification', date.toISOString())
    formData.append('path', path.value)
    formData.append('type_mime', file.type)
    formData.append('_action', 'create')
    percentage.value = 0
    loading.value = true
    try {
      if (isDuplicateAttachment(file) !== null) {
        throw new Error('Erreur : le fichier est deja présent : ' + file.name)
      }
      const request = await axios.post<DocumentLine>(url, formData, {
        onUploadProgress: (progressEvent) => {
          const { loaded, total } = progressEvent
          if (total) percentage.value = Math.floor((loaded * 100) / total)
        }
      })
      if (request.status === 201) {
        loading.value = false
        postOk = true
        const line = toDocumentLine(request.data)
        line.load = true
        line.pending = true
        line.color = '#1e88e5'
        data.value.set(line._id, line)
      }
    } catch (e) {
      loading.value = false
      sendUiNotif({ type: 'error', msg: e instanceof Error ? e.message : 'Erreur lors de la création du fichier', error: e })
    }
  } else if (file === null) { // we post a folder
    const doc = {
      nom,
      path: path.value,
      _action: 'create',
      type_mime: '_folder'
    }
    try {
      for (const v of data.value.values()) {
        if (v.nom === nom) {
          throw new Error('Le nom : ' + nom + ' est déjà présent dans ce dossier')
        }
      }
      if (pathArray.value.includes(nom)) throw new Error('Erreur, le nom du dossier : ' + nom + ' est déjà présent dans l\'arborescence')
      const line = await ofetch<DocumentLine>(url, { method: 'POST', body: doc })
      postOk = true
      line.load = true
      line.pending = true
      line.color = '#1e88e5'
      data.value.set(line._id, line)
    } catch (e) {
      sendUiNotif({ type: 'error', msg: e instanceof Error ? e.message : 'Erreur lors de la création du dossier', error: e })
    }
  } else {
    sendUiNotif({ type: 'error', msg: 'Erreur : Fichier trop volumineux, la taille doit être inférieure à 5 Mo' })
  }
  if (path.value !== '/' && postOk) { // first, check if the data we post is the first value of a folder, if yes delete the folder in the data
    const tmp = path.value.split('/')
    tmp.pop()
    const name = tmp.pop()
    tmp.push('')
    const str = tmp.join('\\/')
    if (name !== undefined) {
      const p = encodeURIComponent('path:/' + str + '/')
      try {
        const rep = await ofetch<{ results: DocumentLine[] }>(`${dataUrl}/lines`, {
          query: { q: name, q_fields: 'nom', q_mode: 'simple', qs: `${p} and type_mime:"_folder"`, _r: Date.now() }
        })
        if (rep.results[0] !== undefined) {
          const id = rep.results[0]._id
          await ofetch(`${dataUrl}/lines/${id}`, { method: 'DELETE' })
        }
      } catch (e) {
        sendUiNotif({ type: 'error', msg: 'Erreur lors du nettoyage du dossier vide', error: e })
      }
    }
  }
  bufferEvent.value++
  if (postOk) {
    try {
      await websock.waitForJournal(datasetId)
    } catch (e) {
      sendUiNotif({ type: 'error', msg: e instanceof Error ? e.message : 'Erreur d\'indexation', error: e })
    }
  }
  bufferEvent.value--
}

// post all the files from the drag and drop zone
export async function postFilesDragDrop (filesInput: FileList | File[]) {
  const files: File[] = Array.from(filesInput)
  const processFiles = async (files: File[]) => {
    const promise = files.map(async (file) => {
      if (file.size === 0) {
        const payload: DocumentPayload = { nom: file.name, file: null }
        await postDocument(payload)
      } else {
        const payload: DocumentPayload = { nom: file.name, file }
        const duplicateId = isDuplicateAttachment(file)
        if (duplicateId !== null) {
          await patchDocument(duplicateId, payload, false)
        } else {
          await postDocument(payload)
        }
      }
    })
    await Promise.all(promise)
  }
  await processFiles(files)
}

export async function patchDocument (id: string, payload: DocumentPayload, folder: boolean, chemin?: string) {
  const { nom, file: rawFile } = payload
  const file = toSingleFile(rawFile)
  const line = data.value.get(id)
  if (line === undefined) return
  bufferEvent.value++
  try {
    if (!folder) {
      if (file && file.size < 5000000) {
        const url = `${dataUrl}/lines`
        const formData = new FormData()
        const date = new Date(file.lastModified)
        formData.append('attachment', file)
        formData.append('nom', nom || line.nom)
        formData.append('nbrevisions', String((line.nbrevisions ?? 1) + 1))
        formData.append('datecreation', line.datecreation ?? date.toISOString())
        formData.append('datemodification', date.toISOString())
        formData.append('path', line.path ?? path.value)
        formData.append('taille', String(file.size))
        formData.append('type_mime', file.type)
        formData.append('_action', 'update')
        formData.append('_id', id)
        formData.append('attachmentPath', line.attachmentPath ?? '')
        percentage.value = 0
        loading.value = true
        try {
          if (date.toISOString() === line.datemodification) {
            throw new Error('Le fichier : ' + file.name + ' n\'a pas été modifié')
          }
          const request = await axios.post<DocumentLine>(url, formData, {
            onUploadProgress: (progressEvent) => {
              const { loaded, total } = progressEvent
              if (total) percentage.value = Math.floor((loaded * 100) / total)
            }
          })
          loading.value = false
          if (request.status === 200) {
            setLinePending(id, '#1e88e5')
            await websock.waitForJournal(datasetId)
          }
        } catch (e) {
          loading.value = false
          sendUiNotif({ type: 'error', msg: e instanceof Error ? e.message : 'Erreur lors de la modification du fichier', error: e })
        }
      } else if (!file) { // we only change the name
        const formData = new FormData()
        formData.append('nom', nom || line.nom)
        try {
          await ofetch(`${dataUrl}/lines/${id}`, { method: 'PATCH', body: formData })
          const updated = data.value.get(id)
          if (updated !== undefined) {
            updated.nom = nom || updated.nom
            setLinePending(id, '#1e88e5')
          }
          await websock.waitForJournal(datasetId)
        } catch (e) {
          sendUiNotif({ type: 'error', msg: e instanceof Error ? e.message : 'Erreur lors du renommage', error: e })
        }
      } else {
        sendUiNotif({ type: 'error', msg: 'Fichier trop volumineux, taille > 5Mo' })
      }
    } else { // if we patch a folder
      if (!chemin) {
        sendUiNotif({ type: 'error', msg: 'Chemin du dossier manquant' })
        return
      }
      const i = chemin.split('/').length - 1 // get the index of folder's name we change in the path
      const str = chemin + id + '/'
      const p = escapeQueryPath(str)
      try {
        const reponse = await ofetch<{ results: DocumentLine[] }>(`${dataUrl}/lines`, {
          query: { q_mode: 'complete', qs: `(path:${p}*)`, _r: Date.now() }
        })
        const updated = data.value.get(id)
        if (updated !== undefined) updated.nom = nom
        setLinePending(id, '#1e88e5')
        await Promise.all(reponse.results.map(async (value) => { // patch the path field
          const segments = value.path?.split('/') ?? []
          segments[i] = nom
          const newpath = segments.join('/')
          const fd = new FormData()
          fd.append('path', newpath)
          try {
            await ofetch(`${dataUrl}/lines/${value._id}`, { method: 'PATCH', body: fd })
          } catch (e) {
            sendUiNotif({ type: 'error', msg: 'Erreur lors du renommage du contenu du dossier', error: e })
          }
        }))
        await websock.waitForJournal(datasetId)
      } catch (e) {
        sendUiNotif({ type: 'error', msg: 'Erreur lors du renommage du dossier', error: e })
      }
    }
  } finally {
    bufferEvent.value--
  }
}
