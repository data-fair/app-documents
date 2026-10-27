<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiAlertCircleOutline, mdiFolderSearchOutline } from '@mdi/js'
import DfUiNotif from '@data-fair/lib-vuetify/ui-notif.vue'
import DocumentsView from './components/DocumentsView.vue'
import { useConfig } from './composables/config'
import { useGedDataset } from './composables/useGedDataset'

const { t } = useI18n()
const { dataset } = useConfig()
const { provisionError, datasetInfo, ready, ensureDataset } = useGedDataset()

// embedded, the app lets its host paint the background
const embedded = window.self !== window.top

const error = computed(() => {
  if (provisionError.value) return t('provisionError', { error: provisionError.value })
  if (!ready.value) return null
  if (!datasetInfo.value) return t('unreadable')
  const keys = new Set((datasetInfo.value.schema ?? []).map(f => f.key))
  if (!keys.has('path') || !keys.has('nom')) return t('notGed')
  return null
})

onMounted(ensureDataset)
watch(() => (dataset.value as { href?: string } | undefined)?.href, (href, previous) => {
  if (href !== previous) ensureDataset()
})
watch(error, (value) => { if (value) window.triggerCapture?.(false) })
</script>

<template>
  <v-app :class="{ 'bg-transparent': embedded }">
    <v-main class="h-screen overflow-hidden">
      <documents-view
        v-if="ready && !error && datasetInfo"
        :key="(dataset as { href?: string } | undefined)?.href"
        :dataset-info="datasetInfo"
      />
      <v-empty-state
        v-else
        :icon="error ? mdiAlertCircleOutline : mdiFolderSearchOutline"
        :title="error ? t('errorTitle') : t('preparing')"
        :text="error ?? t('preparingText')"
      >
        <template #actions>
          <v-btn
            v-if="error"
            color="primary"
            @click="ensureDataset"
          >
            {{ t('retry') }}
          </v-btn>
        </template>
      </v-empty-state>
    </v-main>
    <df-ui-notif />
  </v-app>
</template>

<i18n lang="yaml">
fr:
  preparing: Préparation de la GED…
  preparingText: Création du jeu de données de l'application.
  errorTitle: Impossible d'ouvrir la GED
  provisionError: "Le jeu de données n'a pas pu être préparé : {error}"
  unreadable: Le jeu de données de la GED n'est pas accessible.
  notGed: Le jeu de données choisi n'a pas les colonnes de la GED (path et nom). Laissez la sélection vide pour que l'application crée le sien.
  retry: Réessayer
en:
  preparing: Preparing the document library…
  preparingText: Creating the application's dataset.
  errorTitle: The document library cannot open
  provisionError: "The dataset could not be prepared: {error}"
  unreadable: The document library's dataset cannot be read.
  notGed: The selected dataset lacks the document library columns (path and nom). Leave the selection empty so that the application creates its own.
  retry: Retry
</i18n>
