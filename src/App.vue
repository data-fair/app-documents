<script setup lang="ts">
import { onMounted } from 'vue'
import DfUiNotif from '@data-fair/lib-vuetify/ui-notif.vue'
import TableDataset from './components/TableDataset.vue'
import DropFile from './components/DropFile.vue'
import { useConfig } from './composables/config'
import { useGedDataset } from './composables/useGedDataset'

const { dataset } = useConfig()
const { provisionError, ensureDataset } = useGedDataset()

onMounted(ensureDataset)

function retry () {
  provisionError.value = null
  ensureDataset()
}
</script>

<template>
  <v-app>
    <v-main class="fill-height">
      <div
        v-if="dataset"
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
      <v-empty-state
        v-else
        :icon="provisionError ? 'mdi-alert-circle-outline' : 'mdi-folder-search-outline'"
        :title="provisionError ? 'Impossible de préparer le jeu de données' : 'Préparation de la GED…'"
        :text="provisionError ?? 'Création du jeu de données de l\'application.'"
      >
        <template #actions>
          <v-btn
            v-if="provisionError"
            color="primary"
            @click="retry"
          >
            Réessayer
          </v-btn>
        </template>
      </v-empty-state>
    </v-main>
    <df-ui-notif />
  </v-app>
</template>
