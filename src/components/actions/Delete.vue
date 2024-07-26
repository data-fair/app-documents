<script setup>
import useAppInfo from '@/composables/useAppInfo'
import { displayError, errorMessage, websock, bufferEvent } from '@/assets/util.js'
import { data } from '@/context.js'
import { ref } from 'vue'
const { dataUrl, datasetId } = useAppInfo()
const menuFile = ref(false)
const menuFolder = ref(false)
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
// method : delete file, API says to use _bulk_lines to delete all of the versions of the file
async function deleteFile (ligneId) {
  const url = `${dataUrl}/_bulk_lines`
  const doc = [{
    _action: 'delete',
    _id: ligneId
  }]
  const params = {
    method: 'POST',
    body: JSON.stringify(doc),
    headers: {
      'Content-type': 'application/json'
    }
  }
  bufferEvent.value++
  try {
    const request = await fetch(url, params)
    if (request.ok) {
      const line = data.value.get(ligneId)
      if (line !== undefined) { // check if file is displayed then activate circular v-progress
        line.load = true
        line.color = 'red'
      }
      await websock.waitForJournal(datasetId)
    }
  } catch (e) {
    errorMessage.value = e.message
    displayError.value = true
  }
  bufferEvent.value--
}
// method : delete folder and all of its dependencies (all files/folders contained in it)
async function deleteFolder (pathFolder, nameFolder, ligneId) {
  if (ligneId === nameFolder) { // it means that we delete a non empty folder
    const str = pathFolder + nameFolder + '/'
    const p = str.replace(/\//g, '\\/').replace(/ /g, '\\ ') // could fail if regexp dont work and provoque error 400
    const url = `${dataUrl}/lines?q_mode=complete&qs=(path:${p}*)`
    const params = {
      method: 'GET',
      headers: {
        'Content-type': 'application/json'
      }
    }
    try {
      const request = await fetch(url, params)
      if (request.ok) {
        const line = data.value.get(ligneId)
        line.load = true
        line.color = 'red'
        const reponse = await request.json()
        reponse.results.forEach((value) => {
          deleteFile(value._id)
        })
      }
    } catch (e) {
      errorMessage.value = e.response.status + ' : ' + e.response.data
      displayError.value = true
    }
  } else { // we delete an empty folder with classic deleteFile method
    deleteFile(ligneId)
  }
}
</script>
<template>
  <v-menu
    v-if="line.attachmentPath!==undefined"
    v-model="menuFile"
    :close-on-content-click="false"
    class="d-inline"
    location="start"
  >
    <template #activator="{ props }">
      <v-icon
        v-tooltip="{
          text: 'Supprimer le fichier',
          location: 'right',
          openDelay:'500'
        }"
        v-bind="props"
        class="tbh pa-5"
        color="red"
      >
        mdi-delete
      </v-icon>
    </template>
    <v-card
      class="pa-3"
      :style="{width: '20em'}"
    >
      <div class="mb-3 text-h6">
        Supprimer le fichier ?
      </div>
      <v-alert
        type="error"
        text="Voulez vous vraiment supprimer le fichier ?"
      />
      <v-card-actions>
        <v-btn
          color="red"
          @click="deleteFile(id),menuFile=false"
        >
          Supprimer
        </v-btn>
        <v-spacer />
        <v-btn
          @click="menuFile=false"
        >
          Annuler
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
  <v-menu
    v-else
    v-model="menuFolder"
    :close-on-content-click="false"
    class="d-inline"
    location="start"
  >
    <template #activator="{ props }">
      <v-icon
        v-tooltip="{
          text: 'Supprimer le dossier',
          location: 'right',
          openDelay:'500'
        }"
        v-bind="props"
        class="tbh pa-5 my-1"
        color="red"
      >
        mdi-delete
      </v-icon>
    </template>
    <v-card
      class="pa-3"
      :style="{width: '20em'}"
    >
      <div class="mb-3 text-h6">
        Supprimer le dossier ?
      </div>
      <v-alert
        type="error"
        text="Tout le contenu du dossier sera aussi supprimé"
      />
      <v-card-actions>
        <v-btn
          color="red"
          @click="deleteFolder(line.path,line.name, id),menuFolder=false"
        >
          Supprimer
        </v-btn><v-spacer /><v-btn
          @click="menuFolder=false"
        >
          Annuler
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
