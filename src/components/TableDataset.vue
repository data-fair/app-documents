<script setup>
import { loading, percentage, loadingIndex } from '../assets/util.js'
import { onMounted } from 'vue'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import NavigationBar from './NavigationBar.vue'
import { data, path, pathArray } from '@/context.js'
import Actions from './actions/Actions.vue'
const properties = ['nom', 'taille', 'nbrevisions']
const propertiesDisplay = ['Nom', 'Taille', 'Nombre de révisions']
const fileFormat = new Map([['application/json', 'mdi-code-json'], ['', 'mdi-file-outline'],
  ['image/png', 'mdi-image-outline'],
  ['application/vnd.ms-excel', 'mdi-file-table-outline'],
  ['application/vnd.oasis.opendocument.spreadsheet', 'mdi-file-table-outline'], ['text/csv', 'mdi-file-table-outline'], ['image/jpeg', 'mdi-image-outline'],
  ['application/msword', 'mdi-file-document-outline'], ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'mdi-file-document-outline'],
  ['application/pdf', 'mdi-file-document-outline'], ['text/plain', 'mdi-file-document-outline']])
onMounted(() => { // set path at value from reactive params or set '/' by default
  try {
    path.value = reactiveSearchParams.path
    pathArray.value = path.value.split('/')
    pathArray.value.pop()
    pathArray.value.shift()
  } catch (e) {
    path.value = '/'
    pathArray.value = []
  }
})
// method called to change path based on current path or path from reactiveSearchParams
function navigationPath (nomfolder) {
  if (nomfolder === '/') {
    path.value = '/'
    pathArray.value = []
  } else if (pathArray.value.includes(nomfolder)) {
    let i = pathArray.value.length - 1
    while (pathArray.value[i] !== nomfolder && i > -1) {
      pathArray.value.pop()
      i--
    }
    path.value = '/' + pathArray.value.join('/') + '/'
  } else {
    pathArray.value.push(nomfolder)
    path.value = '/' + pathArray.value.join('/') + '/'
  }
  reactiveSearchParams.path = path.value
}
// method : display the size into readable value with a unit
function displaySize (n) {
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
</script>
<template>
  <div
    class="pt-2"
    :style="{
      height:'40px'
    }"
  >
    <v-progress-linear
      v-show="loading"
      v-model="percentage"
      height="15"
      color="success"
    >
      Envoi des fichiers
    </v-progress-linear>
    <v-progress-linear
      v-show="loadingIndex"
      height="15"
      color="success"
      indeterminate
    >
      Traitement en cours
    </v-progress-linear>
  </div>
  <navigation-bar @update-path="navigationPath" />
  <v-table
    density="compact"
    fixed-header
    class="w-100"
    :style="{
      overflow: 'auto',
      height: '100%'
    }"
  >
    <thead>
      <tr>
        <th
          v-for="p in propertiesDisplay"
          :key="p"
        >
          <span
            v-if="p==='Nom'"
            class="ml-12"
          >{{ p }}</span>
          <span v-else>{{ p }}</span>
        </th>
        <th>Actions </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(value) in data"
        :key="value[0]"
      >
        <td
          v-for="p in properties"
          :key="p"
        >
          <v-progress-circular
            v-if="value[1].load && p==='nom'"
            indeterminate
            :size="25"
            :width="3"
            :style="{
              color : `${value[1].color}`
            }"
          />
          <span v-if="value[1].attachmentPath===undefined&&p==='nom'">
            <v-icon
              v-if="value[1].load"
              class="pa-5"
              icon="mdi-folder"
            />
            <v-icon
              v-else
              class="tbh pa-5"
              @click="navigationPath(value[1].nom)"
            >
              mdi-folder
            </v-icon>
            <div
              v-if="value[1].load"
              class="d-inline py-3 px-2"
            >
              {{ value[1][p] }}
            </div>
            <div
              v-else
              class="d-inline tbh py-3 px-2"
              :style="{
                cursor: 'pointer'
              }"
              @click="navigationPath(value[1].nom)"
            >{{ value[1][p] }}</div>
          </span>
          <span v-else-if="p==='nom'">
            <v-icon
              class="ma-2"
              :icon="fileFormat.get(value[1]['type_mime'])||'mdi-file-outline'"
            />
            <div
              class="d-inline ml-2"
            >{{ value[1][p] }}</div>
          </span>
          <span v-else-if="p==='taille' && value[1].attachmentPath!==undefined">{{ displaySize(value[1][p]) }}</span>
          <span v-else>{{ value[1][p] }}</span>
        </td>
        <td>
          <actions
            :id="value[0]"
            :line="value[1]"
          />
        </td>
      </tr>
    </tbody>
  </v-table>
</template>
<style>
.tbh:hover {
  background-color: rgb(220, 220, 220);
}
</style>
