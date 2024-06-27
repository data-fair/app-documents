<script setup>
import { watch } from 'vue'
import tableDataset from './components/tableDataset.vue'
import dropFile from './components/dropFile.vue'
import { displayError, errorMessage } from './assets/util.js'
import useAppInfo from './composables/useAppInfo'
const { screenSize, dataset } = useAppInfo()
watch(dataset, () => {
  window.location.reload()
})
</script>
<template>
  <v-container
    fluid
    class="pa-0"
    :style="{
      height : `${screenSize}px`
    }"
  >
    <v-row class="ma-0 pa-0">
      <v-col class="ma-0 pa-0">
        <div
          :style="{display: 'flex',
                   flexDirection : 'column',
                   height : `${Math.max(screenSize*0.80,screenSize-120)}px`
          }"
        >
          <table-dataset />
        </div>
      </v-col>
    </v-row>
    <v-row class="ma-0 pa-0">
      <v-col class="ma-0 pa-0">
        <div
          :style="{display: 'flex',
                   justifyContent : 'center',
                   alignItems : 'center',
                   height : `${Math.min(screenSize*0.20,120)}px`
          }"
        >
          <drop-file />
        </div>
      </v-col>
    </v-row>
  </v-container>
  <v-snackbar
    v-model="displayError"
    :timeout="'5000'"
    color="red"
  >
    <div>
      {{ errorMessage }}
    </div>
  </v-snackbar>
</template>
