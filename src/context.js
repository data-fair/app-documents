import { useFetch } from '@vueuse/core'
import { computed, ref } from 'vue'
import { errorMessage, displayError, dataset } from './assets/request'
import useAppInfo from '@/composables/useAppInfo'
const { dataUrl } = useAppInfo()
export const path = ref('/')
const qs = computed(() => encodeURIComponent('path:"' + path.value + '"'))
const urlget = computed(() => `${dataUrl}/lines?qs=${qs.value}&q_fields=path&q_mode=complete`)
const params = {
  refetch: true,
  async afterFetch (ctx) {
    const array = JSON.parse(ctx.data).results
    const lines = new Map()
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
        nbrevisions: data.nbrevisions,
        _id: data._id
      }
      lines.set(data._id, obj)
    }
    // 2nd step -> get all existing folder of this repository ie search all file with path=path/other_name/ and store this name into folders set
    const url2 = `${dataUrl}/lines?q=${path.value}*&q_fields=path&q_mode=complete`
    const str = `^${path.value}[^\\/]\\w*/$`
    const rex = new RegExp(str)
    const folders = new Set()
    try {
      const request = await fetch(url2, params)
      if (request.status === 200) {
        const reponse = await request.json()
        reponse.results.forEach((value) => {
          const t = value.path.match(rex)
          if (t !== null) {
            const temp = t[0].split('/')
            const folderName = temp[temp.length - 2]
            folders.add(folderName)
          }
        })
      }
      folders.forEach((value) => {
        const obj = {
          nom: value,
          path: path.value
        }
        lines.set(value, obj)
      })
    } catch (e) {
      errorMessage.value = e.response.status + ' : impossible de récupérer les dossiers'
      displayError.value = true
    }
    console.log('exec')
    dataset.value = lines
    ctx.data = lines
    return ctx
  }
}
export const { isFetching, data, execute } = useFetch(urlget, params)
