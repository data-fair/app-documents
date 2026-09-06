<script setup lang="ts">
import { ref, reactive } from 'vue'
import { patchDocument, type DocumentPayload } from '@/assets/util'
import type { DocumentLine } from '@/context'

const editFolder = ref(false)
const editFile = ref(false)
defineProps<{
  id: string
  line: DocumentLine
}>()
const payloadDocument = reactive<DocumentPayload>({
  nom: '',
  file: null
})
</script>
<template>
  <v-menu
    v-if="line.attachmentPath!==undefined"
    v-model="editFile"
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
        label="Nouveau fichier (facultatif)"
      />
      <v-card-actions>
        <v-btn
          color="orange"
          @click="editFile = false, patchDocument(id, payloadDocument, false)"
        >
          Modifier
        </v-btn>
        <v-spacer />
        <v-btn @click="editFile=false">
          Annuler
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
  <v-menu
    v-else
    v-model="editFolder"
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
      <v-card-actions>
        <v-btn
          color="orange"
          @click="editFolder = false, patchDocument(id, payloadDocument, true, line.path)"
        >
          Modifier
        </v-btn>
        <v-spacer />
        <v-btn @click="editFolder=false">
          Annuler
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
