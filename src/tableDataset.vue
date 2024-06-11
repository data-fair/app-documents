<script setup>
import { getDataSet, deleteFile, patchDocument, arrayDisplay, deleteFolder, hmDisplay } from './request.js'
import { computedAsync } from '@vueuse/core'
import { ref, reactive } from 'vue'
import { afficherHistoriqueModif, changerAffichage, pathGED } from './content.js'
const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
const dataUrl = config.datasets?.[0].href
const properties = ['nom', 'taille', 'attachmentPath', 'version']
const propertiesDisplay = ['Nom', 'Taille', 'Document numérique attaché', 'Version']
const displayDocument = ref(false)
const displayFolder = ref(false)
const supprDisplay = ref(false)
const showHistory = ref(false)
const ligneId = ref('')
const payloadDocument = reactive({
  nom: '',
  description: '',
  version: '',
  file: ''
})
computedAsync(() => getDataSet(dataUrl), {})
</script>
<template>
  <div
    id="table-data"
    class="table-data"
  >
    <v-banner line="one">
      <v-icon
        class="v-icn-table"
        @click="changerAffichage('')"
      >
        mdi-home
      </v-icon>
      <div
        v-for="(value,_) in pathGED"
        :key="value[1]"
      >
        <v-btn
          class="v-btn-path"
          density="compact"
          :ripple="false"
          elevation="0"
          @click="changerAffichage(value[0])"
        >
          {{ value[1] }}
        </v-btn> /
      </div>
    </v-banner>
    <v-table density="compact">
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
          v-for="(value,_) in arrayDisplay"
          :key="value[0]"
        >
          <td
            v-for="p in properties"
            :key="p"
          >
            <span v-if="value[1].isfolder===true&&p==='nom'">
              <v-icon
                class="v-icn-table"
                @click="changerAffichage(value[0])"
              >
                mdi-folder
              </v-icon>{{ value[1][p] }}</span>
            <span v-else-if="p==='nom'">
              <v-icon class="v-btn-table-file">
                mdi-file-outline
              </v-icon>
              {{ value[1][p] }}
            </span>
            <a
              v-else-if="p==='attachmentPath' && value[1].isfolder===false"
              class="a-attached-file"
              :href="`${dataUrl}/attachments/${value[0]}/${value[1][p]}`"
            >{{ value[1][p] }}</a>
            <span v-else>{{ value[1][p] }}</span>
          </td>
          <td>
            <v-icon
              v-if="value[1].isfolder===false"
              v-tooltip="{
                text: 'Editer le document',
                location: 'right',
                openDelay:'500'
              }"
              class="v-icn-table"
              @click="displayDocument=!displayDocument, ligneId=value[0], displayFolder=false"
            >
              mdi-pencil
            </v-icon>
            <v-icon
              v-else
              v-tooltip="{
                text: 'Editer le dossier',
                location: 'right',
                openDelay:'500'
              }"
              class="v-icn-table"
              @click="displayDocument=!displayDocument, ligneId=value[0], displayFolder=true"
            >
              mdi-pencil
            </v-icon>
            <v-icon
              v-if="value[1].isfolder===true"
              v-tooltip="{
                text: 'Supprimer le dossier',
                location: 'right',
                openDelay:'500'
              }"
              class="v-icn-table v-icn-delete"
              @click="supprDisplay=!supprDisplay"
            >
              mdi-delete
            </v-icon>
            <v-icon
              v-else
              v-tooltip="{
                text: 'Supprimer le fichier',
                location: 'right',
                openDelay:'500'
              }"
              class="v-icn-table v-icn-delete"
              @click="deleteFile(dataUrl,value[0])"
            >
              mdi-delete
            </v-icon>
            <v-icon
              v-if="value[1].isfolder===false"
              v-tooltip="{
                text: 'Voir l\'historique des modifications',
                location: 'right',
                openDelay:'500'
              }"
              class="v-icn-table"
              @click="afficherHistoriqueModif(value[0]),showHistory=!showHistory,ligneId=value[0]"
            >
              mdi-history
            </v-icon>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
  <div id="delete-overlay">
    <v-overlay
      id="supprFolder"
      v-model="supprDisplay"
      class="overlay-center-table"
    >
      <v-card class="overlay-card-table">
        <div class="text-history">
          Supprimer tout le contenu du dossier ?
        </div>
        <v-btn
          class="btn-valid-delete"
          @click="deleteFolder(dataUrl,ligneId), supprDisplay=!supprDisplay"
        >
          Oui
        </v-btn><v-btn
          class="btn-valid-delete"
          @click="supprDisplay=!supprDisplay"
        >
          Non
        </v-btn>
      </v-card>
    </v-overlay>
  </div>
  <div id="histo-overlay">
    <v-overlay
      id="show-modif-history"
      v-model="showHistory"
      class="overlay-center-table"
    >
      <v-card class="overlay-card-table">
        <div class="text-history">
          Historique des modifications :
        </div>
        <div
          v-for="(date,index) in hmDisplay"
          :key="date"
          class="text-date"
        >
          <v-icon v-if="index===0">
            mdi-file-plus-outline
          </v-icon>
          <v-icon v-else>
            mdi-file-document-edit-outline
          </v-icon>
          {{ date }}
        </div>
      </v-card>
    </v-overlay>
  </div>
  <div id="patchOverlay">
    <v-overlay
      id="ligne-edit"
      v-model="displayDocument"
      class="overlay-center-table"
    >
      <v-card class="overlay-card">
        <v-text-field
          v-model="payloadDocument.nom"
          type="text"
          label="nom"
        />
        <v-text-field
          v-model="payloadDocument.description"
          type="text"
          label="description"
        />
        <v-text-field
          v-model="payloadDocument.version"
          type="text"
          label="version"
        />
        <v-file-input
          v-if="!displayFolder"
          v-model="payloadDocument.file"
          label="File input"
        /><v-btn @click="patchDocument(dataUrl,ligneId,payloadDocument,displayFolder), displayDocument=!displayDocument">
          Modifier
        </v-btn>
      </v-card>
    </v-overlay>
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
  padding-left:4px !important

  }

.overlay-center-table{
  justify-content: center;
  align-items: center;
  background-color: rgb(0,0,0,0) !important;
}

.overlay-card-table{
  width:25em !important;
  padding: 20px !important;
  border:solid !important;
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
</style>
