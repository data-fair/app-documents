<script setup>
import { reactive, ref } from 'vue'
import { postDocument, postFolder } from './request.js'

const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
const dataUrl = config.datasets?.[0].href
const overlay = ref(false)
const payloadDocument = reactive({
  nom: '',
  description: '',
  version: '',
  file: '',
  isfolder: false
})
</script>
<template>
  <v-btn
    density="comfortable"
    class="icn-create-doc"
    icon="mdi-plus"
    elevation="5"
    @click="overlay=!overlay"
  />

  <v-overlay
    v-model="overlay"
    class="overlay-center"
  >
    <v-card
      class="overlay-card"
    >
      <v-checkbox
        v-model="payloadDocument.isfolder"
        label="Dossier ?"
        @click="payloadDocument.isfolder=true"
      />
      <div v-if="!payloadDocument.isfolder">
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
        /><v-btn @click="overlay = !overlay,postDocument(dataUrl, payloadDocument)">
          Create Doc
        </v-btn>
      </div>
      <div v-if="payloadDocument.isfolder">
        <v-text-field
          v-model="payloadDocument.nom"
          type="text"
          label="folder_name"
        />
        <v-text-field
          v-model="payloadDocument.description"
          type="text"
          label="folder_description"
        />
        <v-btn @click="overlay = !overlay,postFolder(dataUrl, payloadDocument)">
          Create Folder
        </v-btn>
      </div>
    </v-card>
  </v-overlay>
</template>
<style>
.overlay-center{
  justify-content: center;
  align-items: center;
  background-color: rgb(0,0,0,0.1);
}

.overlay-card{
  width:25em;
  padding: 20px
}

.icn-create-doc {
  border-radius: 50%;
  background-color: #1e88e5 !important;
  display: inline-flex !important;
  margin: 3px;
  z-index: 1;
  color:white
}
</style>
