<script setup lang="ts">
import { ref, reactive } from 'vue'
import { postDocument, type DocumentPayload } from '@/assets/util'
const menuDoc = ref(false)
const menuFolder = ref(false)
const payloadDocument = reactive<DocumentPayload>({
  nom: '',
  file: null
})
</script>
<template>
  <v-menu
    v-model="menuDoc"
    :close-on-content-click="false"
    location="end"
  >
    <template #activator="{ props }">
      <v-btn
        v-tooltip="{
          text: 'Importer un fichier',
          location: 'right',
          openDelay:'500'
        }"
        v-bind="props"
        density="comfortable"
        class="elevation-1 bg-blue-darken-1 my-1"
        color="white"
        icon="mdi-file-plus-outline"
      />
    </template>
    <v-card
      class="pa-3"
      :style="{width: '20em'}"
    >
      <v-text-field
        v-model="payloadDocument.nom"
        type="text"
        label="Nom"
      />
      <v-file-input
        v-model="payloadDocument.file"
        label="Sélectionnez un fichier"
      /><v-btn @click="menuDoc = false, postDocument(payloadDocument)">
        Ajouter fichier
      </v-btn>
    </v-card>
  </v-menu>
  <v-menu
    v-model="menuFolder"
    :close-on-content-click="false"
    location="end"
  >
    <template #activator="{ props }">
      <v-btn
        v-tooltip="{
          text: 'Créer un dossier',
          location: 'right',
          openDelay:'500'
        }"
        v-bind="props"
        density="comfortable"
        class="elevation-1 bg-blue-darken-1 my-1 ml-2 mr-1"
        color="white"
        icon="mdi-folder-plus-outline"
      />
    </template>
    <v-card
      class="pa-3"
      :style="{width: '20em'}"
    >
      <v-text-field
        v-model="payloadDocument.nom"
        type="text"
        label="Nom"
      />
      <v-btn @click="menuFolder = false, payloadDocument.file = null, postDocument(payloadDocument)">
        Créer dossier
      </v-btn>
    </v-card>
  </v-menu>
</template>
