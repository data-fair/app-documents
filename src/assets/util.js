import { ref, watch } from 'vue'
import axios from 'axios'
import useAppInfo from '@/composables/useAppInfo'
import useWSClient from '@/composables/useWSClient.js'
import { execute, path, data, pathArray } from '../context.js'
const { dataUrl, datasetId, wsUrl } = useAppInfo()
export const websock = useWSClient(wsUrl) // handle and listen the websocket to have info when data-fair finished indexing data
export const loading = ref(false) // show a progress bar when uploading a file
export const loadingIndex = ref(false) // show a progress bar when data-fair is indexing the file
export const percentage = ref(0) // value of the progress bar loading
export const displayError = ref(false) // display error v-snackbar if error on requests
export const errorMessage = ref('') // error message to display
export const bufferEvent = ref(0) // number of actions done in same time, when value get back to 0, refetch data
watch(bufferEvent, () => {
  if (bufferEvent.value === 0) {
    loadingIndex.value = false
    execute() // refetch, method provided by useFetch
  } else {
    loadingIndex.value = true
  }
})

export async function postDocument (payload) {
  const { nom, file } = payload
  const url = `${dataUrl}/lines`
  let postOk = false
  if (file !== null && file.size < 5000000) { // we post a file
    const formData = new FormData()
    formData.append('attachment', file)
    formData.append('nom', nom || file.name)
    formData.append('nbrevisions', 1)
    formData.append('taille', file.size)
    const date = new Date(file.lastModified)
    formData.append('datecreation', date.toISOString())
    formData.append('datemodification', date.toISOString())
    formData.append('path', path.value)
    formData.append('type_mime', file.type)
    formData.append('_action', 'create')
    const params = {
      url,
      method: 'POST',
      data: formData,
      onUploadProgress: function (progressEvent) {
        const { loaded, total } = progressEvent
        percentage.value = Math.floor((loaded * 100) / total)
      }
    }
    percentage.value = 0
    loading.value = true
    let request
    try {
      // check if the file is already present in the current folder
      data.value.forEach((value, key) => {
        if (value.attachmentPath !== undefined) {
          const tmp = value.attachmentPath.split('/').pop()
          if (tmp === file.name) {
            throw new Error('Erreur : le fichier est deja présent : ' + value.nom)
          }
        }
      })
      request = await axios(params)
      if (request.status === 201) {
        loading.value = false
        postOk = true
        const reponse = await request.data
        reponse.load = true
        reponse.color = '#1e88e5'
        data.value.set(reponse._id, reponse)
      }
    } catch (e) {
      errorMessage.value = e.message
      displayError.value = true
      loading.value = false
    }
  } else if (file === null) { // we post a folder
    const doc = {
      nom,
      path: path.value,
      _action: 'create',
      type_mime: '_folder'
    }
    const params = {
      method: 'POST',
      body: JSON.stringify(doc),
      headers: {
        'Content-type': 'application/json'
      }
    }
    try {
      for (const v of data.value.values()) {
        if (v.nom === nom) {
          throw new Error('Le nom : ' + nom + ' est déjà présent dans ce dossier')
        }
      }
      if (pathArray.value.includes(nom)) throw new Error('Erreur, le nom du dossier : ' + nom + ' est déjà présent dans l\'arborescence')
      const request = await fetch(url, params)
      if (request.status === 201) {
        postOk = true
        const reponse = await request.json()
        reponse.load = true
        reponse.color = '#1e88e5'
        data.value.set(reponse._id, reponse)
      }
    } catch (e) {
      errorMessage.value = e.message
      displayError.value = true
    }
  } else {
    errorMessage.value = 'Erreur : Fichier trop volumineux, la taille doit être inférieure à 5 Mo'
    displayError.value = true
  }
  if (path.value !== '/' && postOk) { // first, check if the data we post is the first value of a fodler, if yes delete the folder in the data
    const tmp = path.value.split('/')
    tmp.pop()
    const name = tmp.pop()
    tmp.push('')
    const str = tmp.join('\\/')
    const p = encodeURIComponent('path:/' + str + '/')
    const url2 = `${dataUrl}/lines?q=${name}&q_fields=nom&q_mode=simple&qs=${p} and type_mime:"_folder"`
    const request = await fetch(url2)
    if (request.ok) {
      const rep = await request.json()
      if (rep.results[0] !== undefined) {
        const id = rep.results[0]._id
        const url = `${dataUrl}/lines/${id}`
        const params = {
          method: 'DELETE',
          headers: {
            'Content-type': 'application/json'
          }
        }
        try {
          const request = await fetch(url, params)
          if (!request.ok) {
            if (request.status === 404) {
              //
            }
          }
        } catch (e) {
          errorMessage.value = e.message
          displayError.value = true
        }
      }
    }
  }
  bufferEvent.value++
  if (postOk) {
    try {
      await websock.waitForJournal(datasetId)
    } catch (e) {
      errorMessage.value = e.message
      displayError.value = true
    }
  }
  bufferEvent.value--
}
// method : post all the files from the drag and drop zone
export async function postFilesDragDrop (filesInput) {
  const files = []
  for (let i = 0; i < filesInput.length; i++) {
    files.push(filesInput.item(i))
  }
  const processFiles = async (files) => {
    const promise = files.map(async (file) => {
      if (file.size === 0) {
        const payload = {
          nom: file.name,
          file: null
        }
        postDocument(payload)
      } else {
        const payload = {
          nom: file.name,
          file
        }
        let post = true
        data.value.forEach((value, key) => {
          if (value.attachmentPath !== undefined) {
            const tmp = value.attachmentPath.split('/').pop()
            if (tmp === file.name) {
              post = false
              patchDocument(key, payload, false)
            }
          }
        })
        if (post) postDocument(payload)
      }
    })
    await Promise.all(promise)
  }
  await processFiles(files)
}
export async function patchDocument (id, payload, folder, chemin) {
  const { nom, file } = payload
  let url = `${dataUrl}/lines/`
  const line = data.value.get(id)
  const formData = new FormData()
  let request
  bufferEvent.value++
  if (!folder) {
    if ((file !== '' || file === undefined) && file.size < 5000000) {
      formData.append('attachment', file)
      formData.append('nom', nom || line.nom)
      formData.append('nbrevisions', line.nbrevisions + 1)
      formData.append('datecreation', line.datecreation)
      const date = new Date(file.lastModified)
      formData.append('datemodification', date.toISOString())
      formData.append('path', line.path)
      formData.append('taille', file.size)
      formData.append('type_mime', file.type)
      formData.append('_action', 'update')
      formData.append('_id', id)
      formData.append('attachmentPath', line.attachmentPath)
      const params = {
        url,
        method: 'POST',
        data: formData,
        onUploadProgress: function (progressEvent) {
          const { loaded, total } = progressEvent
          percentage.value = Math.floor((loaded * 100) / total)
        }
      }
      percentage.value = 0
      loading.value = true
      try {
        if (date.toISOString() === line.datemodification) {
          throw new Error('Le fichier : ' + file.name + ' n\'a pas été modifié')
        }
        request = await axios(params)
        loading.value = false
        if (request.status === 200) {
          const line = data.value.get(id)
          line.load = true
          line.color = '#1e88e5'
          loading.value = false
          await websock.waitForJournal(datasetId)
        }
      } catch (e) {
        errorMessage.value = e.message
        displayError.value = true
        loading.value = false
      }
    } else if (file === '' || file === undefined) {
      url = `${dataUrl}/lines/${id}`
      formData.append('nom', nom || line.nom)
      const params = {
        method: 'PATCH',
        body: formData
      }
      try {
        const request = await fetch(url, params)
        if (request.status === 200) {
          const line = data.value.get(id)
          line.nom = nom || line.nom
          line.load = true
          line.color = '#1e88e5'
          await websock.waitForJournal(datasetId)
        }
      } catch (e) {
        errorMessage.value = e.message
        displayError.value = true
      }
    } else {
      errorMessage.value = 'Fichier trop volumineux, taille > 5Mo'
      displayError.value = true
    }
  } else { // if we patch a folder
    const i = chemin.split('/').length - 1 // get the index of folder's name we change in the path
    const str = chemin + id + '/'
    const p = str.replace(/\//g, '\\/').replace(/ /g, '\\ ') // could fail if regexp dont work and provoque error 400
    const url = `${dataUrl}/lines?q_mode=complete&qs=(path:${p}*)`
    const params = {
      method: 'GET',
      headers: {
        'Content-type': 'application/json'
      }
    }
    try {
      const request = await fetch(url, params)
      if (request.ok) {
        const line = data.value.get(id)
        line.nom = nom
        line.load = true
        line.color = '#1e88e5'
        const reponse = await request.json()
        reponse.results.forEach(async (value) => { // patch the path field
          let newpath = value.path.split('/')
          const fd = new FormData()
          newpath[i] = nom
          newpath = newpath.join('/')
          fd.append('path', newpath)
          const nurl = `${dataUrl}/lines/${value._id}`
          const params = {
            method: 'PATCH',
            body: fd
          }
          try {
            await fetch(nurl, params)
          } catch (e) {
            errorMessage.value = e.response.status + ' : ' + e.response.data
            displayError.value = true
          }
        })
      }
    } catch (e) {
      errorMessage.value = e.response.status + ' : ' + e.response.data
      displayError.value = true
    }
    try {
      await websock.waitForJournal(datasetId)
    } catch (e) {
      errorMessage.value = e.message
      displayError.value = true
    }
  }
  bufferEvent.value--
}
