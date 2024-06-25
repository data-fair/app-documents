<script setup>
import { postFilesDD } from '../assets/util.js'
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
    class="text-center border-dotted mt-3 mb-3"
    :style="{borderColor: '#1e88e5',
             width : '85%',
             height:'85%',
             display: 'flex',
             boxSizing : 'border-box',
             flexDirection: 'column',
             justifyContent : 'center',
             alignItems : 'center',
    }"
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
