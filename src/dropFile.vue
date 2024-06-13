<script setup>
import { ref } from 'vue'
import { postFilesDD } from './request.js'
const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
const dataUrl = config.datasets?.[0].href
const filesInput = ref(null)
function prevDefault (ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault()
}
function onDrop (e) {
  e.preventDefault()
  filesInput.value = e.dataTransfer.files
  postFilesDD(filesInput.value, dataUrl)
}
</script>
<template>
  <div class="main">
    <div
      id="drop-zone"
      class="drop-zone"
      @drop="onDrop"
      @dragover="prevDefault"
    >
      <div>
        Déposer un ou plusieurs fichiers ici
      </div>
    </div>
  </div>
</template>
<style>
.drop-zone{
    margin:2em;
    margin-left:5em;
    padding: 2em;
    background: #f0f9ff;
    border: 5px dotted #1e88e5;
}
</style>
