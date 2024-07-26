<script setup>
import { saveAs } from 'file-saver'
import useAppInfo from '@/composables/useAppInfo'
import { displayError, errorMessage } from '@/assets/util.js'
const { dataUrl } = useAppInfo()
defineProps({
  fileUrl: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: false,
    default: ''
  }
})
// method : download the old file by using the saveAs method from the file-saver npm package
// pathD (string) : _id/hash/name of the file to download -> attachmentPath field
async function downloadFile (fileUrl, name) {
  const url = `${dataUrl}/attachments/${fileUrl}`
  try {
    const request = await fetch(url)
    if (request.status === 200) {
      const reponse = await request.blob()
      saveAs(reponse, name)
    }
  } catch (e) {
    errorMessage.value = e.response.status + ' : ' + e.response.data
    displayError.value = true
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
