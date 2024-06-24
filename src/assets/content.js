import { pathGED } from './request.js'
import { path } from '../context.js'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
/* those methodes are used to handle the display when clicked on folder
*/
export async function changerAffichage (nomfolder) {
  if (nomfolder === '/') {
    path.value = '/'
    pathGED.value = []
  } else if (pathGED.value.includes(nomfolder)) {
    let i = pathGED.value.length - 1
    while (pathGED.value[i] !== nomfolder && i > -1) {
      pathGED.value.pop()
      i--
    }
    path.value = '/' + pathGED.value.join('/') + '/'
  } else {
    pathGED.value.push(nomfolder)
    path.value = '/' + pathGED.value.join('/') + '/'
  }
  reactiveSearchParams.path = path.value
}
export function displaySize (n) {
  let res
  if (n / 1000000 > 1) { // display Mo
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
