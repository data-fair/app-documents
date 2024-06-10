<script setup>
import { getDataSet, deleteFile, patchDocument, loading2, arrayDisplay, deleteFolder, hmDisplay } from './request.js'
import { computedAsync } from '@vueuse/core'
import { ref, reactive } from 'vue'
import { afficherHistoriqueModif, changerAffichage, pathGED } from './content.js'
const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
const dataUrl = config.datasets?.[0].href
const properties = ['nom', 'taille', 'attachmentPath', 'version']
const display = ref(false)
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
            v-for="p in properties"
            :key="p"
          >
            {{ p }}
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
              class="v-icn-table"
              @click="display=!display, ligneId=value[0]"
            >
              mdi-pencil
            </v-icon>
            <v-icon
              v-if="value[1].isfolder===true"
              class="v-icn-table v-icn-delete"
              @click="supprDisplay=!supprDisplay"
            >
              mdi-delete
            </v-icon>
            <v-icon
              v-else
              class="v-icn-table v-icn-delete"
              @click="deleteFile(dataUrl,value[0])"
            >
              mdi-delete
            </v-icon>
            <v-icon
              v-if="value[1].isfolder===false"
              class="v-icn-table"
              @click="afficherHistoriqueModif(value[0]),showHistory=!showHistory"
            >
              mdi-history
            </v-icon>
            <v-overlay
              id="show-modif-history"
              v-model="showHistory"
            >
              <v-card>
                <div
                  v-for="date in hmDisplay"
                  :key="date"
                >
                  {{ date }}
                </div>
              </v-card>
            </v-overlay>
            <v-overlay
              id="supprFolder"
              v-model="supprDisplay"
              :style="{ display: 'flex', justifyContent: 'center', alignItems: 'center'}"
            >
              <v-card>
                Supprimer tout le contenu du dossier ?<br>
                <v-btn @click="deleteFolder(dataUrl,value[0]), supprDisplay=!supprDisplay">
                  Oui
                </v-btn><v-btn @click="supprDisplay=!supprDisplay">
                  Non
                </v-btn>
              </v-card>
            </v-overlay>
            <v-text-field
              v-if="loading2"
              color="success"
              loading
              disabled
            />
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
  <div id="patchOverlay">
    <v-overlay
      id="ligne-edit"
      v-model="display"
      :style="{ display: 'flex', justifyContent: 'center', alignItems: 'center'}"
    >
      <v-card
        :style="{marginRight: '50px', paddingLeft:'50px',paddingRight:'50px'}"
        width="200%"
      >
        <v-card>
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
            v-model="payloadDocument.file"
            label="File input"
          /><v-btn @click="patchDocument(dataUrl,ligneId,payloadDocument), display=!display">
            Modifier
          </v-btn>
        </v-card>
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
</style>
