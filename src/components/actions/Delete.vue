<script setup lang="ts">
import { ref } from 'vue'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import { sendUiNotif } from '@/composables/ui-notif'
import { websock, bufferEvent } from '@/assets/util'
import { data, type DocumentLine } from '@/context'

const { dataUrl, datasetId } = useAppInfo()
const menuFile = ref(false)
const menuFolder = ref(false)
defineProps<{
  id: string
  line: DocumentLine
}>()
// method : delete file, API says to use _bulk_lines to delete all of the versions of the file
async function deleteFile (ligneId: string) {
  const url = `${dataUrl}/_bulk_lines`
  const doc = [{
    _action: 'delete',
    _id: ligneId
  }]
  bufferEvent.value++
  try {
    await ofetch(url, { method: 'POST', body: doc })
    const line = data.value.get(ligneId)
    if (line !== undefined) { // check if file is displayed then activate circular v-progress
      line.load = true
      line.color = 'red'
    }
    await websock.waitForJournal(datasetId)
  } catch (e) {
    sendUiNotif({ type: 'error', msg: 'Erreur lors de la suppression', error: e })
  }
  bufferEvent.value--
}
// method : delete folder and all of its dependencies (all files/folders contained in it)
async function deleteFolder (pathFolder: string, nameFolder: string, ligneId: string) {
  if (ligneId === nameFolder) { // it means that we delete a non empty folder
    const str = pathFolder + nameFolder + '/'
    const p = str.replace(/\//g, '\\/').replace(/ /g, '\\ ') // could fail if regexp dont work and provoque error 400
    try {
      const reponse = await ofetch<{ results: DocumentLine[] }>(`${dataUrl}/lines`, {
        query: { q_mode: 'complete', qs: `(path:${p}*)`, _r: Date.now() }
      })
      const line = data.value.get(ligneId)
      if (line !== undefined) {
        line.load = true
        line.color = 'red'
      }
      reponse.results.forEach((value) => {
        deleteFile(value._id)
      })
    } catch (e) {
      sendUiNotif({ type: 'error', msg: 'Erreur lors de la suppression du dossier', error: e })
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
          @click="menuFile = false, deleteFile(id)"
        >
          Supprimer
        </v-btn>
        <v-spacer />
        <v-btn @click="menuFile=false">
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
          @click="menuFolder = false, deleteFolder(line.path ?? '/', line.nom, id)"
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
