<script setup>
import TableDataset from './components/TableDataset.vue'
import dropFile from './components/DropFile.vue'
import { displayError, errorMessage } from './assets/util.js'
import { useDisplay } from 'vuetify'
const { height } = useDisplay()
</script>
<template>
  <v-container
    fluid
    class="pa-0"
    :style="{
      height : `${height}px`
    }"
  >
    <v-row class="ma-0 pa-0">
      <v-col class="ma-0 pa-0">
        <div
          :style="{display: 'flex',
                   flexDirection : 'column',
                   height : `${Math.max(height*0.80,height-120)}px`
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
                   height : `${Math.min(height*0.20,120)}px`
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
