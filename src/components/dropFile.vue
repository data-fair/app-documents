<script setup>
import { postFilesDD } from '../assets/request.js'
function prevDefault (ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault()
}
function onDrop (e) {
  e.preventDefault()
  postFilesDD(e.dataTransfer.files)
}
function sendFiles (e) {
  postFilesDD(e.target.files)
}
</script>
<template>
  <div
    class="mb-4 ml-9 mr-9 text-center border-dotted pt-5 pb-5"
    :style="{borderColor: '#1e88e5'}"
    @drop="onDrop"
    @dragover="prevDefault"
  >
    <div class="text-h6">
      Déposer un ou plusieurs fichiers ici
    </div>
    <label
      for="file"
    >ou cliquer <u>ici</u></label>
    <input
      id="file"
      type="file"
      name="file"
      multiple
      hidden
      @change="sendFiles"
    >
  </div>
</template>
