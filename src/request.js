import { ref } from 'vue'
export const array = ref(new Map())
export const arrayDisplay = ref(new Map())
export const parentfolder = ref('')
export const loading2 = ref(false)
export async function getMetaData (dataUrl) {
  const url = `${dataUrl}/schema`
  const metaData = (await fetch(url))
  const reponse = await metaData.json()
  return reponse
}

export async function getValueField (key, dataUrl) {
  const url = `${dataUrl}/values/${key}`

  const metaData = await fetch((url), {
    method: 'GET',
    cache: 'no-cache',
    headers: {
      'Content-type': 'application/json'
    }
  })
  const reponse = await metaData.json()
  return reponse
}
export async function postDocumentParam (dataUrl, payload) {
  const { nom, description, version, file, isfolder } = payload
  const formData = new FormData()
  formData.append('attachment', file)
  formData.append('nom', nom)
  formData.append('description', description || 'desc')
  formData.append('version', version)
  formData.append('taille', file.size)
  formData.append('isfolder', isfolder)
  formData.append('parentfolder', parentfolder.value)
  const url = `${dataUrl}/lines`
  const params = {
    method: 'POST',
    body: formData
  }
  const request = await fetch(url, params)
  const reponse = await request.json()
  if (request.status === 201) {
    const obj = {
      attachmentPath: file.name,
      nom,
      taille: file.size,
      version,
      isfolder,
      parentfolder: parentfolder.value
    }
    array.value.set(reponse._id, obj)
    arrayDisplay.value.set(reponse._id, obj)
  } else { console.log('erreur requete') }
  return reponse
}

export async function getDataSet (dataUrl) {
  const url = `${dataUrl}/lines`
  const metaData = (await fetch(url))
  const reponse = await metaData.json()
  let i
  for (i in reponse.results) {
    console.log('ici')
    const fileName = reponse.results[i].isfolder ? '' : reponse.results[i].attachmentPath.replace(/.*\//, '')
    console.log(fileName)
    const obj = {
      attachmentPath: fileName,
      nom: reponse.results[i].nom,
      taille: reponse.results[i].taille,
      version: reponse.results[i].version,
      isfolder: reponse.results[i].isfolder,
      parentfolder: reponse.results[i].parentfolder
    }
    array.value.set(reponse.results[i]._id, obj)
    if (reponse.results[i].parentfolder === undefined || reponse.results[i].parentfolder === '') {
      arrayDisplay.value.set(reponse.results[i]._id, obj)
    }
  }
  console.log(reponse.results)
  console.log(array.value)
  return reponse.results
}

export async function deleteFile (dataUrl, ligneId) {
  const url = `${dataUrl}/lines/${ligneId}`
  const params = {
    method: 'DELETE',
    headers: {
      'Content-type': 'application/json'
    }
  }
  const metaData = await fetch(url, params)
  if (metaData.status === 204) {
    array.value.delete(ligneId)
    arrayDisplay.value.delete(ligneId)
  } else {
    console.log('erreur suppression')
  }
  const reponse = await metaData.text()
  return reponse
}

export async function deleteFolder (dataUrl, ligneId) {
  const url = `${dataUrl}/lines/${ligneId}`
  const params = {
    method: 'DELETE',
    headers: {
      'Content-type': 'application/json'
    }
  }
  const metaData = await fetch(url, params)
  if (metaData.status === 204) {
    array.value.delete(ligneId)
    arrayDisplay.value.delete(ligneId)
    trackAndDeleteDependencies(dataUrl, ligneId)
  } else {
    console.log('erreur suppression')
  }
  const reponse = await metaData.text()
  return reponse
}

async function trackAndDeleteDependencies (dataUrl, ligneId) {
  array.value.forEach((value, key) => {
    if (value.isfolder === true && value.parentfolder === ligneId) {
      deleteFolder(dataUrl, key)
    } else {
      if (value.parentfolder === ligneId) {
        deleteFile(dataUrl, key)
      }
    }
  })
}

export async function postFolder (dataUrl, payload) {
  const { nom, description, version, file, isfolder } = payload
  const url = `${dataUrl}/lines`
  const doc = {
    nom,
    isfolder,
    parentfolder: parentfolder.value
  }
  const params = {
    method: 'POST',
    body: JSON.stringify(doc),
    headers: {
      'Content-type': 'application/json'
    }
  }
  const request = await fetch(url, params)
  const reponse = await request.json()
  if (request.status === 201) {
    const obj = {
      nom,
      isfolder,
      parentfolder: parentfolder.value
    }
    array.value.set(reponse._id, obj)
    arrayDisplay.value.set(reponse._id, obj)
  } else { console.log('erreur requete') }
  console.log(array.value)
  return reponse
}

export async function patchDocument (dataUrl, ligneId, payload) {
  const { nom, description, version, file } = payload
  const url = `${dataUrl}/lines/${ligneId}`
  const data = array.value.get(ligneId)
  const doc = {
    attachmentPath: file === '' ? data.attachmentPath : file.name,
    nom: nom === '' ? data.nom : nom,
    description: description === '' ? data.description : description,
    version: version === '' ? data.version : version,
    taille: file === '' ? data.taille : file.size,
    isfolder: data.isfolder,
    parentfolder: data.parentfolder
  }
  const params = {
    method: 'PATCH',
    body: JSON.stringify(doc),
    headers: {
      'Content-type': 'application/json'
    }
  }
  const request = await fetch(url, params)
  if (request.status === 200) {
    array.value.set(ligneId, doc)
    arrayDisplay.value.set(ligneId, doc)
  } else { console.log('erreur patch') }
  const reponse = await request.json()
  return reponse
}
