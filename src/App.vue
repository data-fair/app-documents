<script setup lang="ts">
import DfUiNotif from '@data-fair/lib-vuetify/ui-notif.vue'
import TableDataset from './components/TableDataset.vue'
import DropFile from './components/DropFile.vue'
</script>

<template>
  <v-main class="fill-height">
    <div
      class="d-flex flex-column"
      style="height: 100%"
    >
      <div
        class="flex-grow-1"
        style="min-height: 0; overflow: auto"
      >
        <table-dataset />
      </div>
      <div
        class="d-flex align-center justify-center"
        style="height: 120px"
      >
        <drop-file />
      </div>
    </div>
  </v-main>
  <df-ui-notif />
</template>
