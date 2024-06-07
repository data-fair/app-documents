<script setup>
import { getDataSet, deleteFile, patchDocument, loading2, arrayDisplay, deleteFolder } from './request.js'
import { computedAsync } from '@vueuse/core'
import { ref, reactive } from 'vue'
import { changerAffichage, pathGED } from './content.js'
const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
const dataUrl = config.datasets?.[0].href
const properties = ['nom', 'taille', 'attachmentPath', 'version']
const display = ref(false)
const supprDisplay = ref(false)
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
  <div id="table-data">
    <v-banner line="one">
      <v-icon @click="changerAffichage('')">
        mdi-home
      </v-icon>
      <div
        v-for="(value,_) in pathGED"
        :key="value[1]"
      >
        <v-btn
          density="compact"
          :ripple="false"
          elevation="1"
          :style="{
            paddingLeft:'0px',
            paddingRight:'0px'
          }"
          @click="changerAffichage(value[0])"
        >
          {{ value[1] }}
        </v-btn> /
      </div>
    </v-banner>
    <v-table>
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
            <v-icon
              v-if="value[1].isfolder===true&&p==='nom'"
              @click="changerAffichage(value[0])"
            >
              mdi-folder
            </v-icon>
            <v-icon v-else-if="p==='nom'">
              mdi-file-outline
            </v-icon>
            <a
              v-else-if="p==='attachmentPath' && value[1].isfolder===false"
              :href="`${dataUrl}/attachments/${value[0]}/${value[1][p]}`"
            >{{ value[1][p] }}</a>
            <span>{{ value[1][p] }}</span>
          </td>
          <td>
            <v-btn @click="display=!display, ligneId=value[0]">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              v-if="value[1].isfolder===true"
              @click="supprDisplay=!supprDisplay"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
            <v-btn
              v-else
              @click="deleteFile(dataUrl,value[0])"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
            <v-btn>
              <v-icon>mdi-history</v-icon>
            </v-btn>
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
