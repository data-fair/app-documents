import { useFetch } from '@vueuse/core'
import { computed, ref } from 'vue'
import { errorMessage, displayError } from './assets/util.js'
import useAppInfo from '@/composables/useAppInfo'
const { dataUrl } = useAppInfo()
export const path = ref('/') // current path, default is /
export const data = ref(new Map()) // represent the data of the current path, it's used to see if we are not uploading or updating a file we already have
const qs = computed(() => encodeURIComponent('path:"' + path.value + '"'))
const urlget = computed(() => `${dataUrl}/lines?qs=${qs.value}&q_fields=path&q_mode=complete`) // refresh page if this url changes (if path change)
// we call afterFetch method to intercept response and do an other request to find all folders to display
// we mix both results into the response and we update data
const params = {
  refetch: true,
  async afterFetch (ctx) {
    const array = JSON.parse(ctx.data).results
    const lines = new Map()
    data.value.clear()
    let i
    for (i in array) {
      const data = array[i]
      const obj = {
        nom: data.nom,
        attachmentPath: data.attachmentPath,
        taille: data.taille,
        type_mime: data.type_mime,
        path: data.path,
        datecreation: data.datecreation,
        datemodification: data.datemodification,
        nbrevisions: data.nbrevisions,
        _id: data._id
      }
      lines.set(data._id, obj)
    }
    // 2nd step -> get all existing folder of this repository ie search all file with path=path/other_name/ and store this name into folders set
    const tmp = path.value.split('/')
    const p = tmp.join('\\/')
    const url2 = `${dataUrl}/lines?qs=(path:${p}*)&q_mode=complete`
    const folders = new Set()
    try {
      const request = await fetch(url2, params)
      if (request.status === 200) {
        const reponse = await request.json()
        reponse.results.forEach((value) => {
          const t = value.path.split('/')
          if (t[tmp.length - 1] !== '') {
            const folderName = t[tmp.length - 1]
            folders.add(folderName)
          }
        })
      }
      folders.forEach((value) => {
        const obj = {
          nom: value,
          path: path.value,
          attachmentPath: undefined
        }
        lines.set(value, obj)
      })
    } catch (e) {
      errorMessage.value = e.response.status + ' : impossible de récupérer les dossiers'
      displayError.value = true
    }
    data.value = lines
    ctx.data = lines
    return ctx
  }
}
export const { execute, onFetchError } = useFetch(urlget, params)

onFetchError((e) => {
  // ignore error message NS_BINDING_ABORT throw when we this method is called 2 times in a row and the first call wasn't finished
  if (!(e.message === 'The operation was aborted. ')) {
    errorMessage.value = e
    displayError.value = true
  }
})
