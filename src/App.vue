<script setup>
import tableDataset from './tableDataset.vue'
import DropFile from './dropFile.vue'
import { displayError, errorMessage } from './request'
</script>
<template>
  <div class="container">
    <div
      class="drop-file"
    >
      <DropFile />
    </div>
    <div
      class="table-data-path"
    >
      <tableDataset />
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
<style>
.container{
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow : hidden;
}
.drop-file {
    flex: 0 0 15%;
    width: 100%;
    box-sizing: border-box;
}
.table-data-path{
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}
.v-snackbar--variant-elevated{
  background: rgb(255, 74, 74) !important;
}
</style>
