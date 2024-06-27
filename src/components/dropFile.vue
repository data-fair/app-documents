<script setup>
import { postFilesDragDrop } from '../assets/util.js'
function prevDefault (ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault()
}
function onDrop (e) {
  e.preventDefault()
  postFilesDragDrop(e.dataTransfer.files)
}
function sendFiles (e) {
  postFilesDragDrop(e.target.files)
}
</script>
<template>
  <div
    class="text-center border-dotted mt-3 mb-3 d-flex flex-column align-center justify-center"
    :style="{borderColor: '#1e88e5',
             width : '85%',
             height:'85%',
             boxSizing : 'border-box'
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
