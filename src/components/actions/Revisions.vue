<script setup lang="ts">
import { ref } from 'vue'
import { ofetch } from 'ofetch'
import download from './Download.vue'
import useAppInfo from '@/composables/useAppInfo'
import { sendUiNotif } from '@/composables/ui-notif'
import type { DocumentLine } from '@/context'

const { dataUrl } = useAppInfo()
const menuHistory = ref(false)
const hmDisplay = ref<DocumentLine[]>([])
defineProps<{
  id: string
}>()
// get all the versions of a file, sorted by modification date
async function getRevisions (ligneId: string) {
  const url = `${dataUrl}/lines/${ligneId}/revisions`
  try {
    const reponse = await ofetch<{ results: DocumentLine[] }>(url)
    hmDisplay.value = reponse.results
  } catch (e) {
    sendUiNotif({ type: 'error', msg: 'Erreur lors de la récupération de l\'historique', error: e })
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
        {{ new Date(o.datemodification ?? '').toLocaleString() }} :
        <download
          v-if="i!==0"
          :file-url="o.attachmentPath ?? ''"
          :name="o.nom"
        />
        <span v-else>Version actuelle</span>
      </div>
    </v-card>
  </v-menu>
</template>
