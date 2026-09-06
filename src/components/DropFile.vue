<script setup lang="ts">
import { postFilesDragDrop } from '@/assets/util'
function prevDefault (ev: DragEvent) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault()
}
function onDrop (e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) postFilesDragDrop(e.dataTransfer.files)
}
function sendFiles (e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) postFilesDragDrop(target.files)
}
</script>
<template>
  <div
    class="text-center border-dotted mt-3 mb-3 d-flex flex-column align-center justify-center"
    :style="{borderColor: '#1e88e5',
             width : '85%',
             height:'85%',
             boxSizing : 'border-box',
             backgroundColor: '#f6fcff'
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
