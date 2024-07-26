<script setup>
import { patchDocument } from '@/assets/util.js'
import { ref, reactive } from 'vue'
const editFolder = ref(false)
const editFile = ref(false)
defineProps({
  id: {
    type: String,
    required: true
  },
  line: {
    type: Object,
    required: true
  }
})
const payloadDocument = reactive({
  nom: '',
  file: ''
})
// method : patch a data
// if folder, update the path and patch all its dependencies by patching them one by one
// if file : if we just change name we do a simple patch else we do a post with more parameters in the dataform (_action, _id and attachmentPath)
// API will understand and automatically update the file and store the old version in revisions (see more on DataFair API)

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
        label="File input"
      />
      <v-card-actions>
        <v-btn
          color="orange"
          @click="patchDocument(id,payloadDocument,false), editFile=false"
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
          @click="patchDocument(id,payloadDocument,true,line.path),editFolder=false"
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
