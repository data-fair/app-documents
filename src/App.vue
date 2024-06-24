<script setup>
import tableDataset from './components/tableDataset.vue'
import dropFile from './components/dropFile.vue'
import { displayError, errorMessage } from './assets/request.js'

</script>
<template>
  <div
    class="d-flex flex-column w-100"
    :style="{
      height:'100vh',
    }"
  >
    <div
      :style="{
        flex:'1'
      }"
    >
      <table-dataset />
    </div>
    <div
      :style="{
        flex: '0 0 15%'
      }"
    >
      <drop-file />
    </div>
  </div>
  <div>
    <v-snackbar
      v-model="displayError"
      :timeout="'5000'"
    >
      <div>
        {{ errorMessage }}
      </div>
    </v-snackbar>
  </div>
</template>
