<script setup>
import { getSet, deleteFile, dataset, deleteFolder, hmDisplay, patchDocument, downloadFile, parentfolder, displayError, getRevisions } from './request.js'
import { ref, reactive, onMounted } from 'vue'
import { changerAffichage, pathGED, displaySize } from './content.js'
import CreateDoc from './createDoc.vue'
import reactiveSearchParams from '@data-fair/lib/vue/reactive-search-params-global.js'
const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
const dataUrl = 'http://localhost:5888/data-fair/api/v1/datasets/ccyum-yt3t8o9ywu4iggjlbz'
const properties = ['nom', 'taille', 'version']
const propertiesDisplay = ['Nom', 'Taille', 'Version']
const menuHistory = ref([])
const menuEditDoc = ref([])
const menuEditFolder = ref([])
const menuDelete = ref([])
const ligneId = ref('')
const dossier = ref(false)
const payloadDocument = reactive({
  nom: '',
  description: '',
  version: '',
  file: ''
})
onMounted(async () => {
  let table
  try {
    table = reactiveSearchParams.pathGED.split(',')
  } catch (error) {
    table = ['']
  }
  if (table[0] === '') {
    parentfolder.value = '0'
    getSet(dataUrl)
  } else {
    for (let i = 0; i < table.length; i++) {
      const url = `${dataUrl}/lines/${table[i]}`
      const request = await fetch(url)
      if (request.status === 200) {
        const rep = await request.json()
        pathGED.value.set(table[i], rep.nom)
      } else {
        displayError.value = true
      }
    }
    parentfolder.value = table[table.length - 1]
    getSet(dataUrl)
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
        @click="changerAffichage('0',dataUrl),parentfolder='0'"
      >
        mdi-home
      </v-icon>
      <v-banner-text>
        <div
          v-for="(value,_) in pathGED"
          :key="value[1]"
          :style="{display: 'inline'}"
        >
          <v-btn
            class="v-btn-path"
            density="default"
            :ripple="false"
            elevation="0"
            @click="changerAffichage(value[0],dataUrl)"
          >
            {{ value[1] }}
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
          v-for="(value,index) in dataset"
          :key="value[0]"
        >
          <td
            v-for="p in properties"
            :key="p"
          >
            <span v-if="value[1].isfolder===true&&p==='nom'">
              <v-icon
                class="v-icn-table"
                @click="changerAffichage(value[0],dataUrl)"
              >
                mdi-folder
              </v-icon><div
                class="text-nav"
                @click="changerAffichage(value[0],dataUrl)"
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
            <span v-else-if="p==='taille' && value[1].isfolder===false">{{ displaySize(value[1][p]) }}</span>
          </td>
          <td>
            <div
              v-if="value[1].isfolder===false"
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
                    @click="ligneId=value[0]"
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
                  /><v-btn @click="patchDocument(dataUrl,ligneId,payloadDocument,false), menuEditDoc[index]=false">
                    Modifier
                  </v-btn>
                </v-card>
              </v-menu>
            </div>
            <div
              v-if="value[1].isfolder===true"
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
                    @click="ligneId=value[0]"
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
                  <v-text-field
                    v-model="payloadDocument.description"
                    type="text"
                    label="Nouvelle description"
                  />
                  <v-btn @click="patchDocument(dataUrl,ligneId,payloadDocument,true), menuEditFolder[index]=false">
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
                    v-if="value[1].isfolder===false"
                    v-tooltip="{
                      text: 'Supprimer le fichier',
                      location: 'right',
                      openDelay:'500'
                    }"
                    v-bind="props"
                    class="v-icn-table v-icn-delete"
                    @click="ligneId=value[0],dossier=false"
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
                    @click="ligneId=value[0],dossier=true"
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
                    @click="deleteFolder(dataUrl,ligneId),menuDelete[index]=false"
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
                    @click="deleteFile(dataUrl,ligneId),menuDelete[index]=false"
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
              v-if="value[1].isfolder===false"
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
                      @click="downloadFile(dataUrl,o.attachmentPath,o.nom)"
                    >
                      mdi-download-circle-outline
                    </v-icon>
                    <span v-else>: Version actuelle</span>
                  </div>
                </v-card>
              </v-menu>
            </div>
            <v-icon
              v-if="value[1].isfolder===false"
              v-tooltip="{
                text: 'Télécharger le fichier',
                location: 'right',
                openDelay:'500'
              }"
              class="v-icn-table"
              @click="downloadFile(dataUrl,value[1].attachmentPath,value[1].nom)"
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
