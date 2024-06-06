<script setup>
import { getDataSet, array, deleteFile, patchDocument, loading2 } from './content.js'
import { computedAsync } from '@vueuse/core'
import { ref, reactive } from 'vue'

const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
const dataUrl = config.datasets?.[0].href
const properties = ['nom', 'taille', 'attachmentPath', 'version']
const display = ref(false)
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
          v-for="(value,_) in array"
          :key="value[0]"
        >
          <td
            v-for="p in properties"
            :key="p"
          >
            {{ value[1][p] }}
          </td>
          <td>
            <v-btn @click="display=!display, ligneId=value[0]">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn @click="deleteFile(dataUrl,value[0])">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
            <v-btn>
              <v-icon>mdi-history</v-icon>
            </v-btn>
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
  <div>
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
