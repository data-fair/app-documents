<script setup lang="ts">
import { computed } from 'vue'
import { loading, percentage, loadingIndex } from '@/assets/util'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import NavigationBar from './NavigationBar.vue'
import { data, displaySize, isSearching, navigatePath, path, pathArray, searchQuery, useDocuments, type DocumentLine } from '@/context'
import Actions from './actions/Actions.vue'

useDocuments()

const properties = computed(() => isSearching.value
  ? ['nom', 'path', 'taille', 'nbrevisions']
  : ['nom', 'taille', 'nbrevisions'])
const propertiesDisplay = computed(() => isSearching.value
  ? ['Nom', 'Dossier', 'Taille', 'Nombre de révisions']
  : ['Nom', 'Taille', 'Nombre de révisions'])
const fileFormat = new Map<string, string>([['application/json', 'mdi-code-json'], ['', 'mdi-file-outline'],
  ['image/png', 'mdi-image-outline'],
  ['application/vnd.ms-excel', 'mdi-file-table-outline'],
  ['application/vnd.oasis.opendocument.spreadsheet', 'mdi-file-table-outline'], ['text/csv', 'mdi-file-table-outline'], ['image/jpeg', 'mdi-image-outline'],
  ['application/msword', 'mdi-file-document-outline'], ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'mdi-file-document-outline'],
  ['application/pdf', 'mdi-file-document-outline'], ['text/plain', 'mdi-file-document-outline']])

// method called to change path based on current path or path from reactiveSearchParams
function navigationPath (nomfolder: string) {
  const { newPath, newPathArray } = navigatePath(pathArray.value, nomfolder)
  path.value = newPath
  pathArray.value = newPathArray
  reactiveSearchParams.path = newPath
}

// en mode recherche, ouvre le dossier contenant le document
function openFolder (target?: string) {
  if (!target) return
  searchQuery.value = ''
  path.value = target
  pathArray.value = target.split('/').filter(Boolean)
  reactiveSearchParams.path = target
}

// un dossier trouvé en recherche peut être dans n'importe quel dossier : on ouvre son chemin complet
function onFolderClick (line: DocumentLine) {
  if (isSearching.value) openFolder(`${line.path ?? '/'}${line.nom}/`)
  else navigationPath(line.nom)
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
        v-for="[id, line] in data"
        :key="id"
      >
        <td
          v-for="p in properties"
          :key="p"
        >
          <v-progress-circular
            v-if="line.load && p==='nom'"
            indeterminate
            :size="25"
            :width="3"
            :style="{
              color : `${line.color}`
            }"
          />
          <span v-if="line.attachmentPath===undefined&&p==='nom'">
            <v-icon
              v-if="line.load"
              class="pa-5"
              icon="mdi-folder"
            />
            <v-icon
              v-else
              class="tbh pa-5"
              @click="onFolderClick(line)"
            >
              mdi-folder
            </v-icon>
            <div
              v-if="line.load"
              class="d-inline py-3 px-2"
            >
              {{ line[p] }}
            </div>
            <div
              v-else
              class="d-inline tbh py-3 px-2"
              :style="{
                cursor: 'pointer'
              }"
              @click="onFolderClick(line)"
            >{{ line[p] }}</div>
          </span>
          <span v-else-if="p==='nom'">
            <v-icon
              class="ma-2"
              :icon="fileFormat.get(line.type_mime ?? '') ?? 'mdi-file-outline'"
            />
            <div
              class="d-inline ml-2"
            >{{ line[p] }}</div>
          </span>
          <span v-else-if="p==='path'">
            <v-btn
              variant="text"
              density="compact"
              @click="openFolder(line.path)"
            >
              {{ line.path }}
            </v-btn>
          </span>
          <span v-else-if="p==='taille' && line.attachmentPath!==undefined">{{ displaySize(line.taille ?? 0) }}</span>
          <span v-else>{{ line[p] }}</span>
        </td>
        <td>
          <actions
            :id="id"
            :line="line"
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
