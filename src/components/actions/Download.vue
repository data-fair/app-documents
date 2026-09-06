<script setup lang="ts">
import { saveAs } from 'file-saver'
import useAppInfo from '@/composables/useAppInfo'
import { sendUiNotif } from '@/composables/ui-notif'

const { dataUrl } = useAppInfo()
defineProps<{
  fileUrl: string
  name?: string
}>()
// download the old file by using the saveAs method from the file-saver npm package
// fileUrl (string) : _id/hash/name of the file to download -> attachmentPath field
async function downloadFile (fileUrl: string, name?: string) {
  const url = `${dataUrl}/attachments/${fileUrl}`
  try {
    const response = await fetch(url)
    if (response.status === 200) {
      const blob = await response.blob()
      saveAs(blob, name)
    }
  } catch (e) {
    sendUiNotif({ type: 'error', msg: 'Erreur lors du téléchargement', error: e })
  }
}
</script>
<template>
  <v-icon
    v-tooltip="{
      text: 'Télécharger le fichier',
      location: 'right',
      openDelay:'500'
    }"
    class="tbh pa-5 my-1"
    @click="downloadFile(fileUrl, name)"
  >
    mdi-download
  </v-icon>
</template>
