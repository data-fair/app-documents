<script setup>
import { deleteFile, deleteFolder, hmDisplay, patchDocument, downloadFile, getRevisions, pathGED } from '../assets/request.js'
import { ref, onMounted } from 'vue'
import { changerAffichage, displaySize } from '../assets/content.js'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
import CreateDoc from './createDoc.vue'
import useAppInfo from '@/composables/useAppInfo.js'
import { data, path } from '../context.js'
const { dataUrl, payloadDocument } = useAppInfo()
const properties = ['nom', 'taille', 'path', 'nbrevisions']
const propertiesDisplay = ['Nom', 'Taille', 'path', 'NbRevisions']
const menuHistory = ref([])
const menuEditDoc = ref([])
const menuEditFolder = ref([])
const menuDelete = ref([])
const dossier = ref(false)
onMounted(() => {
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
</script>
<template>
  <div
    id="table-data"
  >
    <v-banner
      class="banner-path"
      line="one"
    >
      <v-icon
        class="v-icn-table"
        @click="changerAffichage('/')"
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
            class="v-btn-path"
            density="default"
            :ripple="false"
            elevation="0"
            @click="changerAffichage(value)"
          >
            {{ value }}
          </v-btn> /
        </div>
      </v-banner-text>
      <template
        #actions
      >
        <div class="banner-btn">
          <CreateDoc />
        </div>
      </template>
    </v-banner>
  </div>
  <div class="table-container">
    <v-table
      density="compact"
      fixed-header
      class="table-v-data"
    >
      <thead>
        <tr>
          <th
            v-for="p in propertiesDisplay"
            :key="p"
          >
            <span
              v-if="p==='Nom'"
              class="nom-display"
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
                class="v-icn-table"
                @click="changerAffichage(value[1].nom)"
              >
                mdi-folder
              </v-icon><div
                class="text-nav"
                @click="changerAffichage(value[1].nom)"
              >{{ value[1][p] }}</div></span>
            <span v-else-if="p==='nom'">
              <v-icon class="v-btn-table-file">
                mdi-file-outline
              </v-icon>
              <div
                :style="{display: 'inline',
                         marginLeft : '10px'
                }"
              >{{ value[1][p] }}</div>
            </span>
            <span v-else-if="p==='taille' && value[1].attachmentPath!==undefined">{{ displaySize(value[1][p]) }}</span>
            <span v-else>{{ value[1][p] }}</span>
          </td>
          <td>
            <div
              v-if="value[1].attachmentPath!==undefined"
              id="edit-document"
              class="menu-document"
            >
              <v-menu
                v-model="menuEditDoc[index]"
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
                    class="v-icn-table"
                  >
                    mdi-pencil
                  </v-icon>
                </template>
                <v-card class="menu-card">
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
            </div>
            <div
              v-if="value[1].attachmentPath===undefined"
              id="edit-folder"
              class="menu-document"
            >
              <v-menu
                v-model="menuEditFolder[index]"
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
                    class="v-icn-table"
                  >
                    mdi-pencil
                  </v-icon>
                </template>
                <v-card class="menu-card">
                  <v-text-field
                    v-model="payloadDocument.nom"
                    type="text"
                    label="Nouveau nom"
                  />
                  <v-btn @click="patchDocument(value[0],payloadDocument,true),menuEditFolder[index]=false">
                    Modifier
                  </v-btn>
                </v-card>
              </v-menu>
            </div>

            <div
              id="delete-documet"
              class="menu-document"
            >
              <v-menu
                v-model="menuDelete[index]"
                :close-on-content-click="false"
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
                    class="v-icn-table v-icn-delete"
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
                    class="v-icn-table v-icn-delete"
                    @click="dossier=true"
                  >
                    mdi-delete
                  </v-icon>
                </template>
                <v-card
                  v-if="dossier"
                  class="menu-card"
                >
                  <div class="text-history">
                    Supprimer tout le contenu du dossier ?
                  </div>
                  <v-btn
                    class="btn-valid-delete"
                    @click="deleteFolder(value[1]['path'],value[1]['nom'], value[0]),menuDelete[index]=false"
                  >
                    Oui
                  </v-btn><v-btn
                    class="btn-valid-delete"
                    @click="menuDelete[index]=false"
                  >
                    Non
                  </v-btn>
                </v-card>
                <v-card
                  v-else
                  class="menu-card"
                >
                  <div class="text-history">
                    Supprimer le fichier ?
                  </div>
                  <v-btn
                    class="btn-valid-delete"
                    @click="deleteFile(value[0]),menuDelete[index]=false"
                  >
                    Oui
                  </v-btn><v-btn
                    class="btn-valid-delete"
                    @click="menuDelete[index]=false"
                  >
                    Non
                  </v-btn>
                </v-card>
              </v-menu>
            </div>
            <div
              v-if="value[1].attachmentPath!==undefined"
              id="menu-history"
              class="menu-document"
            >
              <v-menu

                v-model="menuHistory[index]"
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
                    class="v-icn-table"
                    @click="getRevisions(dataUrl,value[0])"
                  >
                    mdi-history
                  </v-icon>
                </template>
                <v-card class="history-card">
                  <div class="text-history">
                    Historique des modifications :
                  </div>
                  <div
                    v-for="(o,i) in hmDisplay"
                    :key="o"
                    class="text-date"
                  >
                    <v-icon v-if="i===0">
                      mdi-file-plus-outline
                    </v-icon>
                    <v-icon v-else>
                      mdi-file-document-edit-outline
                    </v-icon>
                    {{ o._updatedAt }}
                    <v-icon
                      v-if="i!==hmDisplay.length-1"
                      class="icn-download"
                      @click="downloadFile(o.attachmentPath,o.nom)"
                    >
                      mdi-download-circle-outline
                    </v-icon>
                    <span v-else>: Version actuelle</span>
                  </div>
                </v-card>
              </v-menu>
            </div>
            <v-icon
              v-if="value[1].attachmentPath!==undefined"
              v-tooltip="{
                text: 'Télécharger le fichier',
                location: 'right',
                openDelay:'500'
              }"
              class="v-icn-table"
              @click="downloadFile(value[1].attachmentPath,value[1].nom)"
            >
              mdi-download
            </v-icon>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>
<style>
.v-icn-table:hover {
  background-color: rgb(220, 220, 220);
}
.v-icn-table, .v-btn-table-file{
  margin: 2px;
  padding: 20px

}

.v-icn-delete{
  color: rgb(254, 69, 69)
}
a{
  text-decoration: none;
  color: #1e88e5;
}
.v-btn-path{
  padding-right:4px !important;
  padding-left:4px !important;
  margin-left:2px
  }

.history-card{
  width:25em !important;
  padding: 20px !important;
}
.btn-valid-delete{
  margin-left: 5em;
}

.nom-display{
  margin-left:3.3em
}

.text-history{
  font-size: 1.5em;
  margin-bottom:0.8em;
}
.text-date{
  margin-bottom: 6px;
}
.banner-path{
  border: solid #1e88e5 !important;
  border-radius: 0.5em !important;
  padding-top:0.3em !important;
  padding-bottom:0.3em !important;
  display: flex !important;
  justify-content: space-between;
  align-items: center
}
.icn-download{
  color: #4caf50;
}
.banner-btn{
  display: flex;
}
.v-banner-actions{
  margin:0px !important;
}
.v-banner {
    flex: 0 0 auto;
    padding: 10px;
    width: 100%;
    box-sizing: border-box;
}
.table-container {
    display : flex !important;
    flex: 1 !important;
    overflow: auto !important;
    width: 100%;
    box-sizing: border-box;
}
.table-v-data{
  width: 100%;
}

.text-nav{
  display: inline;
  padding-top: 10px;
  padding-bottom: 10px;
  padding-right:10px;
  padding-left:10px;
}
.text-nav:hover{
  background-color: rgb(220, 220, 220);
  cursor:pointer;
}
</style>
