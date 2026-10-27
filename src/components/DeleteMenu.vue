<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'
import { useDocuments } from '@/composables/documents'
import type { Row } from '@/assets/documents'
import ActionMenu from './ActionMenu.vue'

const props = defineProps<{ target?: HTMLElement | null, row: Row }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const documents = useDocuments()

const { execute: confirm, loading } = useAsyncAction(async () => {
  if (props.row.kind === 'folder') await documents.deleteFolder(props.row)
  else await documents.deleteFile(props.row.line)
  emit('close')
}, { error: t('error') })
</script>

<template>
  <action-menu
    :target="target"
    :title="row.kind === 'folder' ? t('folderTitle', { name: row.name }) : t('fileTitle', { name: row.line.nom })"
    @close="emit('close')"
  >
    <v-card-text>
      {{ row.kind === 'folder' ? t('folderText') : t('fileText') }}
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn
        variant="text"
        @click="emit('close')"
      >
        {{ t('cancel') }}
      </v-btn>
      <v-btn
        color="error"
        variant="flat"
        :loading="loading"
        @click="confirm"
      >
        {{ t('delete') }}
      </v-btn>
    </v-card-actions>
  </action-menu>
</template>

<i18n lang="yaml">
fr:
  fileTitle: Supprimer {name} ?
  folderTitle: Supprimer le dossier {name} ?
  fileText: Le document et son historique ne seront plus accessibles.
  folderText: Tout le contenu du dossier sera aussi supprimé.
  cancel: Annuler
  delete: Supprimer
  error: Erreur lors de la suppression
en:
  fileTitle: Delete {name}?
  folderTitle: Delete folder {name}?
  fileText: The document and its history will no longer be accessible.
  folderText: Everything in the folder will be deleted too.
  cancel: Cancel
  delete: Delete
  error: Error while deleting
</i18n>
