<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiPaperclip } from '@mdi/js'
import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'
import { DuplicateError, useDocuments } from '@/composables/documents'
import ActionMenu from './ActionMenu.vue'
import MetadataFields from './MetadataFields.vue'

defineProps<{ target?: HTMLElement | null }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const documents = useDocuments()
const files = ref<File[]>([])
const name = ref('')
const metadata = ref<Record<string, unknown>>({})
const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const duplicates = ref<string[]>([])

const { execute: submit, loading } = useAsyncAction(async () => {
  if (!(await form.value?.validate())?.valid) return
  duplicates.value = []
  const selected = files.value
  const results = await Promise.allSettled(selected.map(file => documents.uploadFile(file, { name: selected.length === 1 ? name.value : undefined, metadata: metadata.value })))
  const failed = results.flatMap((result, i) => result.status === 'rejected' ? [{ file: selected[i], reason: result.reason }] : [])
  // imported files leave the selection, so that a second click does not send them again
  files.value = failed.map(f => f.file)
  const error = failed.find(f => !(f.reason instanceof DuplicateError))
  if (error) throw error.reason
  if (failed.length) duplicates.value = failed.map(f => (f.reason as DuplicateError).fileName)
  else emit('close')
}, { error: t('error') })
</script>

<template>
  <action-menu
    :target="target"
    :title="t('title')"
    @close="emit('close')"
  >
    <v-form
      ref="form"
      @submit.prevent="submit"
    >
      <v-card-text class="pb-0">
        <v-file-input
          v-model="files"
          :label="t('files')"
          :rules="[(v: File[]) => !!v?.length || t('required')]"
          :prepend-inner-icon="mdiPaperclip"
          prepend-icon=""
          variant="outlined"
          density="compact"
          hide-details="auto"
          class="mb-2"
          multiple
          autofocus
        />
        <v-text-field
          v-if="files.length <= 1"
          v-model="name"
          :label="t('name')"
          :placeholder="files[0]?.name"
          :persistent-placeholder="!!files[0]"
          variant="outlined"
          density="compact"
          hide-details="auto"
          class="mb-2"
        />
        <metadata-fields v-model="metadata" />
        <v-alert
          v-if="duplicates.length"
          type="warning"
          variant="flat"
          density="compact"
          :text="t('duplicate', { names: duplicates.join(', ') }, duplicates.length)"
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
          :loading="loading"
        >
          {{ t('import') }}
        </v-btn>
      </v-card-actions>
    </v-form>
  </action-menu>
</template>

<i18n lang="yaml">
fr:
  title: Importer des fichiers
  files: Fichiers
  required: Choisissez au moins un fichier.
  name: Nom affiché
  duplicate: "« {names} » existe déjà dans ce dossier, utilisez Modifier sur ce document pour en déposer une nouvelle version. | « {names} » existent déjà dans ce dossier, utilisez Modifier sur ces documents pour en déposer une nouvelle version ; les autres fichiers sont importés."
  cancel: Annuler
  import: Importer
  error: Erreur lors de l'import du fichier
en:
  title: Import files
  files: Files
  required: Choose at least one file.
  name: Displayed name
  duplicate: "\"{names}\" already exists in this folder, use Edit on that document to upload a new version. | \"{names}\" already exist in this folder, use Edit on these documents to upload a new version; the other files are imported."
  cancel: Cancel
  import: Import
  error: Error while importing the file
</i18n>
