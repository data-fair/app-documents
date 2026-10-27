<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiPaperclip } from '@mdi/js'
import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'
import { useConfig } from '@/composables/config'
import { useDocuments } from '@/composables/documents'
import { nameAfterReplace, type DocumentLine } from '@/assets/documents'
import ActionMenu from './ActionMenu.vue'
import MetadataFields from './MetadataFields.vue'

const props = defineProps<{ target?: HTMLElement | null, line: DocumentLine }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const { metadata: metadataConfig } = useConfig()
const documents = useDocuments()

const name = ref(props.line.nom)
const file = ref<File | null>(null)
const metadata = ref<Record<string, unknown>>(Object.fromEntries(metadataConfig.value.map(f => [f.key, props.line[f.key] ?? null])))
const form = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const nameError = ref<string | null>(null)

const { execute: submit, loading } = useAsyncAction(async () => {
  if (!(await form.value?.validate())?.valid) return
  const typedName = name.value.trim() !== props.line.nom ? name.value : undefined
  const finalName = file.value ? nameAfterReplace(props.line, file.value.name, typedName) : name.value.trim()
  if (finalName !== props.line.nom && await documents.nameTaken(props.line.path, finalName, props.line._id)) {
    nameError.value = t('nameTaken', { name: finalName })
    return
  }
  if (file.value) await documents.replaceFile(props.line, file.value, { name: typedName, metadata: metadata.value })
  else await documents.patchLine(props.line, { nom: name.value.trim(), ...metadata.value })
  emit('close')
}, { error: t('error') })
</script>

<template>
  <action-menu
    :target="target"
    :title="t('title', { name: line.nom })"
    @close="emit('close')"
  >
    <v-form
      ref="form"
      @submit.prevent="submit"
    >
      <v-card-text class="pb-0">
        <v-file-input
          v-model="file"
          :label="t('file')"
          :prepend-inner-icon="mdiPaperclip"
          prepend-icon=""
          variant="outlined"
          density="compact"
          hide-details="auto"
          class="mb-2"
          @update:model-value="nameError = null"
        />
        <v-text-field
          v-model="name"
          :label="t('name')"
          :rules="[(v: string) => !!v?.trim() || t('required')]"
          :error-messages="nameError ?? undefined"
          variant="outlined"
          density="compact"
          hide-details="auto"
          class="mb-2"
          @update:model-value="nameError = null"
        />
        <metadata-fields v-model="metadata" />
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
          {{ t('save') }}
        </v-btn>
      </v-card-actions>
    </v-form>
  </action-menu>
</template>

<i18n lang="yaml">
fr:
  title: Modifier {name}
  name: Nom affiché
  required: Le nom est obligatoire.
  nameTaken: "« {name} » existe déjà dans ce dossier, choisissez un autre nom."
  file: Nouvelle version du fichier (facultatif)
  cancel: Annuler
  save: Enregistrer
  error: Erreur lors de la modification du document
en:
  title: Edit {name}
  name: Displayed name
  required: The name is required.
  nameTaken: "\"{name}\" already exists in this folder, choose another name."
  file: New version of the file (optional)
  cancel: Cancel
  save: Save
  error: Error while editing the document
</i18n>
