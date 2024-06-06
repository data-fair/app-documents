import { ref } from 'vue'
export const array = ref(new Map())
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
  const { nom, description, version, file } = payload
  const url = `${dataUrl}/lines`
  const doc = {
    attachmentPath: file.name,
    nom,
    description,
    version,
    taille: file.size
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
      attachmentPath: file.name,
      nom,
      taille: file.size,
      version
    }
    array.value.set(reponse._id, obj)
  } else { console.log('erreur requete') }
  return reponse
}

export async function getDataSet (dataUrl) {
  const url = `${dataUrl}/lines`
  const metaData = (await fetch(url))
  const reponse = await metaData.json()
  let i
  for (i in reponse.results) {
    const obj = {
      attachmentPath: reponse.results[i].attachmentPath,
      nom: reponse.results[i].nom,
      taille: reponse.results[i].taille,
      version: reponse.results[i].version
    }
    array.value.set(reponse.results[i]._id, obj)
  }
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
  } else {
    console.log('erreur suppression')
  }
  const reponse = await metaData.json()
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
    taille: file === '' ? data.taille : file.size
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
    loading2.value = true
    setTimeout(() => {
      getDataSet(dataUrl)
      loading2.value = false
    }, 10000)
  } else { console.log('erreur patch') }
  const reponse = await request.json()
  return reponse
}
