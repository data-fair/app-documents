<script setup>
import { ref } from 'vue'
import { postDocument } from '../assets/request.js'
import useAppInfo from '@/composables/useAppInfo.js'
const { payloadDocument } = useAppInfo()
const menuDoc = ref(false)
const menuFolder = ref(false)
</script>
<template>
  <div
    id="post-document"
    class="menu-document menu-doc"
  >
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
          class="icn-create-doc"
          icon="mdi-file-plus-outline"
          elevation="5"
        />
      </template>
      <v-card
        class="menu-card"
      >
        <div>
          <v-text-field
            v-model="payloadDocument.nom"
            type="text"
            label="Nom"
          />
          <v-file-input
            v-model="payloadDocument.file"
            label="Séléctionnez un fichier"
          /><v-btn @click="postDocument(payloadDocument), menuDoc = false">
            Ajouter fichier
          </v-btn>
        </div>
      </v-card>
    </v-menu>
  </div>
  <div
    id="post-folder"
    class="menu-document"
  >
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
          class="icn-create-doc"
          icon="mdi-folder-plus-outline"
          elevation="5"
        />
      </template>
      <v-card
        class="menu-card"
      >
        <v-text-field
          v-model="payloadDocument.nom"
          type="text"
          label="Nom"
        />
        <v-btn @click="payloadDocument.file=null,postDocument(payloadDocument), menuFolder = false">
          Créer dossier
        </v-btn>
      </v-card>
    </v-menu>
  </div>
</template>
<style>

.overlay-center{
  justify-content: center;
  align-items: center;
  background-color: rgb(0,0,0,0.1);
}

.menu-card{
  width:25em !important;
  padding: 20px !important
}

.icn-create-doc {
  border-radius: 50%;
  background-color: #1e88e5 !important;
  display: inline-flex !important;
  margin: 3px;
  z-index: 1;
  color:white !important
}
.menu-document{
  display: inline !important;
  margin-right: 4px
}
.top-header{
  display: flex;
}
.box1{
  margin-top:2em;
  display: flex;
  flex-direction: column;
  padding-left: 1.5em;
}
.box2{
  flex: 1;
}
.menu-doc{
  margin-right:0.5em;
}
</style>
