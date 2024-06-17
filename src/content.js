import { dataset, parentfolder, arrayDisplay, histoModif, hmDisplay } from './request.js'
import { ref } from 'vue' // key : id, value : name of the associated folder, it represents the navigation bar upon the data table
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
export const pathGED = ref(new Map())
/* those methodes are used to handle the display when clicked on folder
or when clicked on show history, it modifiy arrayDisplay, hmDisplay and pathGED values
*/

export async function changerAffichage (ligneId) {
  parentfolder.value = ligneId
  arrayDisplay.value.clear()
  if (ligneId === '') {
    pathGED.value.clear()
  } else if (pathGED.value.has(ligneId)) {
    const keys = Array.from(pathGED.value.keys())
    let i = keys.length - 1
    while (keys[i] !== ligneId) {
      pathGED.value.delete(keys[i])
      i--
    }
  } else {
    pathGED.value.set(ligneId, dataset.value.get(ligneId).nom)
  }
  dataset.value.forEach((value, key) => {
    if (value.parentfolder === parentfolder.value) {
      arrayDisplay.value.set(key, value)
    }
  })
  reactiveSearchParams.parentFolder = ligneId
  reactiveSearchParams.pathGED = Array.from(pathGED.value.keys())
}

export function afficherHistoriqueModif (ligneId) {
  hmDisplay.value = []
  const tab = histoModif.value.get(ligneId)
  let date
  tab.forEach((val) => {
    date = new Date(parseInt(val))
    hmDisplay.value.push(date.toLocaleString())
  })
}

export function displaySize (n) {
  let res
  if (n / 1000000000 > 1) { // display Go
    res = n / 1000000000
    res = res.toFixed(1)
    return res + ' Go'
  } else if (n / 1000000 > 1) { // display Mo
    res = n / 1000000
    res = res.toFixed(1)
    return res + ' Mo'
  } else if (n / 1000 > 1) { // display Ko
    res = n / 1000
    res = res.toFixed(1)
    return res + ' Ko'
  } else {
    return n + ' o'
  }
}
