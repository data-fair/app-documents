<script setup>
import { deleteFile, deleteFolder, hmDisplay, patchDocument, downloadFile, getRevisions, loading, percentage, loadingIndex, payloadDocument } from '../assets/util.js'
import { ref, onMounted } from 'vue'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import CreateDoc from './createDoc.vue'
import { data, path } from '@/context.js'
const properties = ['nom', 'taille', 'nbrevisions']
const propertiesDisplay = ['Nom', 'Taille', 'Nombre de révisions']
const pathGED = ref([]) // key : id, value : name of the associated folder, it represents the navigation bar upon the data table
const menuHistory = ref([]) // following refs are used to display menu after clicking on button on a line of the table
const menuEditDoc = ref([])
const menuEditFolder = ref([])
const menuDelete = ref([])
const dossier = ref(false)
const fileFormat = new Map([['application/json', 'mdi-code-json'], ['', 'mdi-file-outline'],
  ['image/png', 'mdi-image-outline'],
  ['application/vnd.ms-excel', 'mdi-file-table-outline'],
  ['application/vnd.oasis.opendocument.spreadsheet', 'mdi-file-table-outline'], ['text/csv', 'mdi-file-table-outline'], ['image/jpeg', 'mdi-image-outline'],
  ['application/msword', 'mdi-file-document-outline'], ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'mdi-file-document-outline'],
  ['application/pdf', 'mdi-file-document-outline'], ['text/plain', 'mdi-file-document-outline']])
onMounted(() => { // set path at the current display value, / default or use reactive search params
  try {
    path.value = reactiveSearchParams.path
    pathGED.value = path.value.split('/')
    pathGED.value.pop()
    pathGED.value.shift()
  } catch (e) {
    path.value = '/'
    pathGED.value = []
  }
})
// method called to change path based on current path or path from reactiveSearchParams
function navigationPath (nomfolder) {
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
    class="pt-4 mr-10"
    :style="{
      height:'40px'
    }"
  >
    <v-progress-linear
      v-show="loading"
      v-model="percentage"
      height="15"
      class="progress-bar"
      color="success"
    >
      Envoi des fichiers
    </v-progress-linear>
    <v-progress-linear
      v-show="loadingIndex"
      class="progress-bar"
      height="15"
      color="success"
      indeterminate
    >
      Traitement en cours
    </v-progress-linear>
  </div>
  <div
    class="px-2"
    :style="{
      borderStyle: 'solid',
      borderColor: '#1e88e5',
      borderRadius: '0.5em'
    }"
  >
    <v-banner
      class="py-1"

      lines="one"
    >
      <v-icon
        class="tbh pa-5"
        @click="navigationPath('/')"
      >
        mdi-home
      </v-icon>
      <v-banner-text>
        <div
          v-for="(value) in pathGED"
          :key="value"
          :style="{display: 'inline'}"
        >
          <v-btn
            class="px-1 ml-1"
            density="default"
            :ripple="false"
            elevation="0"
            @click="navigationPath(value)"
          >
            {{ value }}
          </v-btn> /
        </div>
      </v-banner-text>
      <template
        #actions
      >
        <CreateDoc />
      </template>
    </v-banner>
  </div>
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
        v-for="(value,index) in data"
        :key="value[0]"
      >
        <td
          v-for="p in properties"
          :key="p"
        >
          <span v-if="value[1].attachmentPath===undefined&&p==='nom'">
            <v-icon
              class="tbh pa-5"
              @click="navigationPath(value[1].nom)"
            >
              mdi-folder
            </v-icon><div
              class="d-inline tbh py-3 px-2"
              :style="{
                cursor: 'pointer'
              }"
              @click="navigationPath(value[1].nom)"
            >{{ value[1][p] }}</div></span>
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
          <v-menu
            v-if="value[1].attachmentPath!==undefined"
            v-model="menuEditDoc[index]"
            class="d-inline"
            :close-on-content-click="false"
            location="left"
          >
            <template #activator="{ props }">
              <v-icon

                v-tooltip="{
                  text: 'Editer le document',
                  location: 'right',
                  openDelay:'500'
                }"
                v-bind="props"
                class="tbh pa-5"
              >
                mdi-pencil
              </v-icon>
            </template>
            <v-card
              class="pa-3"
              :style="{width: '20em'}"
            >
              <v-text-field
                v-model="payloadDocument.nom"
                type="text"
                label="Nouveau nom (facultatif)"
              />
              <v-file-input
                v-model="payloadDocument.file"
                label="File input"
              /><v-btn @click="patchDocument(value[0],payloadDocument,false), menuEditDoc[index]=false">
                Modifier
              </v-btn>
            </v-card>
          </v-menu>
          <v-menu
            v-if="value[1].attachmentPath===undefined"
            v-model="menuEditFolder[index]"
            class="d-inline"
            :close-on-content-click="false"
            location="left"
          >
            <template #activator="{ props }">
              <v-icon

                v-tooltip="{
                  text: 'Editer le dossier',
                  location: 'right',
                  openDelay:'500'
                }"
                v-bind="props"
                class="tbh pa-5"
              >
                mdi-pencil
              </v-icon>
            </template>
            <v-card
              class="pa-3"
              :style="{width: '20em'}"
            >
              <v-text-field
                v-model="payloadDocument.nom"
                type="text"
                label="Nouveau nom"
              />
              <v-btn @click="patchDocument(value[0],payloadDocument,true,value[1].path),menuEditFolder[index]=false">
                Modifier
              </v-btn>
            </v-card>
          </v-menu>
          <v-menu
            v-model="menuDelete[index]"
            :close-on-content-click="false"
            class="d-inline"
            location="start"
          >
            <template #activator="{ props }">
              <v-icon
                v-if="value[1].attachmentPath!==undefined"
                v-tooltip="{
                  text: 'Supprimer le fichier',
                  location: 'right',
                  openDelay:'500'
                }"
                v-bind="props"
                class="tbh pa-5"
                color="red"
                @click="dossier=false"
              >
                mdi-delete
              </v-icon>
              <v-icon
                v-else
                v-tooltip="{
                  text: 'Supprimer le dossier',
                  location: 'right',
                  openDelay:'500'
                }"
                v-bind="props"
                class="tbh pa-5 my-1"
                color="red"
                @click="dossier=true"
              >
                mdi-delete
              </v-icon>
            </template>
            <v-card
              v-if="dossier"
              class="pa-3"
              :style="{width: '20em'}"
            >
              <div class="mb-3 text-h6">
                Supprimer tout le contenu du dossier ?
              </div>
              <v-btn
                class="ml-15"
                @click="deleteFolder(value[1]['path'],value[1]['nom'], value[0]),menuDelete[index]=false"
              >
                Oui
              </v-btn><v-btn
                class="ml-10"
                @click="menuDelete[index]=false"
              >
                Non
              </v-btn>
            </v-card>
            <v-card
              v-else
              class="pa-3"
              :style="{width: '20em'}"
            >
              <div class="mb-3 text-h6">
                Supprimer le fichier ?
              </div>
              <v-btn
                class="ml-15"
                @click="deleteFile(value[0]),menuDelete[index]=false"
              >
                Oui
              </v-btn><v-btn
                class="ml-10"
                @click="menuDelete[index]=false"
              >
                Non
              </v-btn>
            </v-card>
          </v-menu>
          <v-menu
            v-if="value[1].attachmentPath!==undefined"
            v-model="menuHistory[index]"
            class="d-inline"
            :close-on-content-click="false"
            location="start"
          >
            <template #activator="{ props }">
              <v-icon

                v-tooltip="{
                  text: 'Voir l\'historique des modifications',
                  location: 'right',
                  openDelay:'500'
                }"
                v-bind="props"
                class="tbh pa-5"
                @click="getRevisions(value[0])"
              >
                mdi-history
              </v-icon>
            </template>
            <v-card
              class="pa-3"
              :style="{width: '20em'}"
            >
              <div class="text-h6 mb-1">
                Historique des modifications :
              </div>
              <div
                v-for="(o,i) in hmDisplay"
                :key="o"
                class="mb-2"
              >
                <v-icon v-if="i===0">
                  mdi-file-plus-outline
                </v-icon>
                <v-icon v-else>
                  mdi-file-document-edit-outline
                </v-icon>
                {{ o._updatedAt }} :
                <v-icon
                  v-if="i!==hmDisplay.length-1"
                  color="light-green"
                  @click="downloadFile(o.attachmentPath,o.nom)"
                >
                  mdi-download-circle-outline
                </v-icon>
                <span v-else>Version actuelle</span>
              </div>
            </v-card>
          </v-menu>
          <v-icon
            v-if="value[1].attachmentPath!==undefined"
            v-tooltip="{
              text: 'Télécharger le fichier',
              location: 'right',
              openDelay:'500'
            }"
            class="tbh pa-5 my-1"
            @click="downloadFile(value[1].attachmentPath,value[1].nom)"
          >
            mdi-download
          </v-icon>
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
