<script setup>
import { ref } from 'vue'
import download from './Download.vue'
import useAppInfo from '@/composables/useAppInfo'
import { displayError, errorMessage } from '@/assets/util.js'
const { dataUrl } = useAppInfo()
const menuHistory = ref(false)
const hmDisplay = ref([])
defineProps({
  id: {
    type: String,
    required: true
  }
})
// method : download the old file by using the saveAs method from the file-saver npm package
// pathD (string) : _id/hash/name of the file to download -> attachmentPath field
// method : get all the versions of a file, sorted by modification date
async function getRevisions (ligneId) {
  const url = `${dataUrl}/lines/${ligneId}/revisions`
  try {
    const request = await fetch(url)
    if (request.status === 200) {
      hmDisplay.value = []
      const reponse = await request.json()
      const lines = reponse.results
      lines.forEach((value) => {
        hmDisplay.value.push(value)
      })
    }
  } catch (e) {
    errorMessage.value = e.response.status + ' : ' + e.response.data
    displayError.value = true
  }
}
</script>
<template>
  <v-menu
    v-model="menuHistory"
    class="d-inline"
    :close-on-content-click="false"
    location="start"
    overflow="auto"
  >
    <template #activator="{ props }">
      <v-icon

        v-tooltip="{
          text: 'Voir l\'historique des modifications',
          location: 'right',
          openDelay:'500'
        }"
        v-bind="props"
        class="tbh pa-5"
        @click="getRevisions(id)"
      >
        mdi-history
      </v-icon>
    </template>
    <v-card
      class="pa-3"
      :style="{width: '22em'}"
    >
      <div class="text-h6 mb-3">
        Historique des modifications :
      </div>
      <div
        v-for="(o,i) in hmDisplay"
        :key="i"
        class="mb-2"
      >
        <v-icon v-if="i===hmDisplay.length-1">
          mdi-file-plus-outline
        </v-icon>
        <v-icon v-else>
          mdi-file-document-edit-outline
        </v-icon>
        {{ new Date(o.datemodification).toLocaleString() }} :
        <download
          v-if="i!==0"
          :file-url="o.attachmentPath"
          :name="o.nom"
        />
        <span v-else>Version actuelle</span>
      </div>
    </v-card>
  </v-menu>
</template>
