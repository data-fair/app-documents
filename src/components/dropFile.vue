<script setup>
import useAppInfo from '@/composables/useAppInfo.js'
import { postFilesDD, loading, percentage } from '../assets/request.js'

const { dataUrl } = useAppInfo()
function prevDefault (ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault()
}
function onDrop (e) {
  e.preventDefault()
  postFilesDD(e.dataTransfer.files, dataUrl)
}
function sendFiles (e) {
  postFilesDD(e.target.files, dataUrl)
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
      <div class="text-dd">
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
    <div class="wrapper-bar">
      <v-progress-linear
        v-show="loading"
        v-model="percentage"
        height="10"
        class="progress-bar"
        color="success"
      />
    </div>
  </div>
</template>
<style>
.progress-bar{
  opacity:0.7;
  right:20px;
}
.wrapper-bar{
  height:20px;
  margin-right:20px
}
.drop-zone{
    margin-top:2em;
    margin-bottom:1em;
    margin-left:5em;
    margin-right:5em;
    text-align: center;
    padding: 2em;
    background: #f0f9ff;
    border: 4px dotted #1e88e5;
}
.text-dd{
  font-size: 1.2em;
}
</style>
