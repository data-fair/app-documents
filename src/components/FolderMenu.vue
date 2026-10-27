<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'
import { useDocuments } from '@/composables/documents'
import { folderNameError, type FolderRow } from '@/assets/documents'
import ActionMenu from './ActionMenu.vue'

const props = defineProps<{ target?: HTMLElement | null, folder?: FolderRow, siblings: string[] }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const documents = useDocuments()
const name = ref(props.folder?.name ?? '')
const exists = ref(false)

const nameError = computed(() => {
  if (exists.value) return t('errors.exists')
  const error = folderNameError(name.value, props.siblings.filter(s => s !== props.folder?.name))
  return error && name.value.trim() !== props.folder?.name ? t(`errors.${error}`) : null
})

const { execute: submit, loading } = useAsyncAction(async () => {
  if (nameError.value) return
  // the listed siblings may be stale or incomplete, the server has the last word
  if (name.value.trim() !== props.folder?.name && await documents.folderExists(props.folder?.path ?? documents.path.value, name.value)) {
    exists.value = true
    return
  }
  if (props.folder) {
    if (name.value.trim() !== props.folder.name) await documents.renameFolder(props.folder, name.value)
  } else {
    await documents.createFolder(name.value)
  }
  emit('close')
}, { error: props.folder ? t('renameError') : t('createError') })
</script>

<template>
  <action-menu
    :target="target"
    :title="folder ? t('renameTitle', { name: folder.name }) : t('createTitle')"
    @close="emit('close')"
  >
    <v-form @submit.prevent="submit">
      <v-card-text class="pb-0">
        <v-text-field
          v-model="name"
          :label="t('name')"
          :error-messages="name ? nameError ?? undefined : undefined"
          variant="outlined"
          density="compact"
          hide-details="auto"
          class="mb-2"
          autofocus
          @update:model-value="exists = false"
        />
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
          type="submit"
          color="primary"
          variant="flat"
          :disabled="!!nameError"
          :loading="loading"
        >
          {{ folder ? t('rename') : t('create') }}
        </v-btn>
      </v-card-actions>
    </v-form>
  </action-menu>
</template>

<i18n lang="yaml">
fr:
  createTitle: Nouveau dossier
  renameTitle: Renommer le dossier {name}
  name: Nom du dossier
  cancel: Annuler
  create: Créer
  rename: Renommer
  createError: Erreur lors de la création du dossier
  renameError: Erreur lors du renommage du dossier
  errors:
    empty: Le nom est obligatoire.
    slash: Le nom ne peut pas contenir de « / ».
    exists: Un dossier porte déjà ce nom ici.
en:
  createTitle: New folder
  renameTitle: Rename folder {name}
  name: Folder name
  cancel: Cancel
  create: Create
  rename: Rename
  createError: Error while creating the folder
  renameError: Error while renaming the folder
  errors:
    empty: The name is required.
    slash: The name cannot contain "/".
    exists: A folder with this name already exists here.
</i18n>
