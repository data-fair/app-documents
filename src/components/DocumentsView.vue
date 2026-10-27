<script setup lang="ts">
import type { Field } from '@data-fair/lib-common-types/application/index.js'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import {
  mdiDelete, mdiDotsVertical, mdiDownload, mdiFilePlusOutline, mdiFolder, mdiFolderPlusOutline, mdiHistory, mdiHome, mdiMagnify, mdiPencil,
  mdiTrayArrowDown
} from '@mdi/js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'
import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { formatBytes } from '@data-fair/lib-utils/format/bytes.js'
import { formatFieldValue } from '@data-fair/lib-utils/format/field.js'
import { attachmentFilename } from '@data-fair/lib-utils/format/attachment.js'
import { useConfig } from '@/composables/config'
import { provideDocuments, FOLDER_SIZE, SEARCH_SIZE } from '@/composables/documents'
import type { GedDatasetInfo } from '@/composables/useGedDataset'
import { attachmentUrl, childPath, fileIcon, pathAt, pathSegments, type DocumentLine, type FolderRow, type Row } from '@/assets/documents'
import FolderMenu from './FolderMenu.vue'
import UploadMenu from './UploadMenu.vue'
import EditMenu from './EditMenu.vue'
import DeleteMenu from './DeleteMenu.vue'
import HistoryMenu from './HistoryMenu.vue'

const props = defineProps<{ datasetInfo: GedDatasetInfo }>()

const { t, locale } = useI18n()
const { dayjs } = useLocaleDayjs()
const { sendUiNotif } = useUiNotif()
const { xs } = useDisplay()
const { datasetUrl, metadata } = useConfig()

// columns are sorted by data-fair, the sort is kept in the url with its syntax (`-taille`)
const sortFields: Record<string, string> = { name: 'nom', size: 'taille', revisions: 'nbrevisions', updated: '_updatedAt' }
const columnOf = (field: string) => Object.keys(sortFields).find(key => sortFields[key] === field) ?? `meta_${field}`
const sortBy = computed({
  get: () => {
    const value = reactiveSearchParams.sort
    if (!value) return []
    const descending = value.startsWith('-')
    return [{ key: columnOf(descending ? value.slice(1) : value), order: descending ? 'desc' as const : 'asc' as const }]
  },
  set: (value: { key: string, order?: boolean | 'asc' | 'desc' }[]) => {
    const first = value[0]
    if (!first) delete reactiveSearchParams.sort
    else reactiveSearchParams.sort = (first.order === 'desc' ? '-' : '') + (sortFields[first.key] ?? first.key.replace(/^meta_/, ''))
  }
})
const documents = provideDocuments(() => props.datasetInfo, () => reactiveSearchParams.sort)
const { path, search, isSearching, rows, total, loading, uploads, uploadProgress, pending } = documents

// a thumbnail shows the content, not the editing controls
const thumbnail = reactiveSearchParams.thumbnail === 'true'
const history = computed(() => !!props.datasetInfo.rest?.history)

const segments = computed(() => pathSegments(path.value))

const schemaFields = computed(() => Object.fromEntries((props.datasetInfo.schema ?? []).map(field => [field.key, field])))
const tableMetadata = computed(() => xs.value ? [] : metadata.value.filter(field => field.showInTable !== false && schemaFields.value[field.key]))

function metadataValue (row: Row, key: string) {
  const value = row.kind === 'file' ? row.line[key] : undefined
  if (value === undefined || value === null || value === '') return ''
  return formatFieldValue(schemaFields.value[key] as Field, value, { locale: locale.value })
}

const headers = computed(() => [
  // max-width 0 lets the name column take the remaining width and truncate instead of widening the table
  { key: 'name', title: t('name'), cellProps: { class: 'w-100', style: 'max-width: 0' } },
  ...(isSearching.value ? [{ key: 'folder', title: t('folder'), sortable: false }] : []),
  ...(xs.value
    ? []
    : [
        { key: 'size', title: t('size'), align: 'end' as const },
        { key: 'revisions', title: t('revisions'), align: 'end' as const },
        { key: 'updated', title: t('updated') }
      ]),
  ...tableMetadata.value.map(field => ({ key: `meta_${field.key}`, title: field.title, value: (item: Item) => metadataValue(item.row, field.key) })),
  ...(thumbnail ? [] : [{ key: 'actions', title: t('actions'), align: 'end' as const, sortable: false }])
])
// the rows come sorted by data-fair (folders first): the table must not sort them again
const keepServerOrder = computed(() => Object.fromEntries(headers.value.map(header => [header.key, () => 0])))

interface Item {
  key: string
  row: Row
}
const items = computed<Item[]>(() => (rows.value ?? []).map(row => ({
  key: row.kind === 'folder' ? `folder:${row.path}${row.name}` : row.line._id,
  row
})))
const truncated = computed(() => rows.value !== null && total.value > (isSearching.value ? SEARCH_SIZE : FOLDER_SIZE))

function fileUrl (line: DocumentLine) {
  return line._attachment_url ?? (line.attachmentPath && datasetUrl.value ? attachmentUrl(datasetUrl.value, line.attachmentPath) : undefined)
}

function formatDate (value?: string) {
  return value ? dayjs(value).format('lll') : ''
}

// folders are links to their own url (a new tab with the middle button), opened in place on a plain click
function folderHref (target: string) {
  const url = new URL(window.location.href)
  if (target === '/') url.searchParams.delete('path')
  else url.searchParams.set('path', target)
  url.searchParams.delete('q')
  return url.href
}
function openFolderLink (event: MouseEvent | KeyboardEvent, target: string) {
  if (event.ctrlKey || event.metaKey || event.shiftKey || ('button' in event && event.button !== 0)) return
  event.preventDefault()
  documents.openFolder(target)
}
const breadcrumbs = computed(() => segments.value.map((segment, i) => {
  const target = pathAt(path.value, i)
  return i === segments.value.length - 1
    ? { title: segment, active: true, disabled: false }
    : { title: segment, href: folderHref(target), onClick: (e: MouseEvent) => openFolderLink(e, target) }
}))

// one menu at a time, shared by every row and anchored on the button that opened it, which gets the focus back
type Dialog = { type: 'folder' | 'upload' | 'edit' | 'delete' | 'history', row?: Row }
const dialog = ref<Dialog | null>(null)
const opener = ref<HTMLElement | null>(null)
const dialogKey = ref(0)
// on a phone the actions of a row sit behind one button, which anchors the menu they open
const moreButton = ref<HTMLElement | null>(null)
function openDialog (value: Dialog, source: Event | HTMLElement | null) {
  opener.value = source instanceof Event ? source.currentTarget as HTMLElement : source
  dialogKey.value++
  dialog.value = value
}
async function closeDialog () {
  const key = dialogKey.value
  dialog.value = null
  await nextTick()
  if (key === dialogKey.value && opener.value?.isConnected) opener.value.focus()
}
const siblingFolders = computed(() => (rows.value ?? []).filter(r => r.kind === 'folder').map(r => (r as FolderRow).name))

let captured = false
watch(rows, async (value) => {
  if (value === null || captured) return
  captured = true
  await nextTick()
  window.triggerCapture?.(false)
})

const dragDepth = ref(0)
const dragging = computed(() => dragDepth.value > 0)
function hasFiles (e: DragEvent) {
  return !thumbnail && !!e.dataTransfer?.types.includes('Files')
}
function onDragEnter (e: DragEvent) {
  if (hasFiles(e)) dragDepth.value++
}
function onDragLeave (e: DragEvent) {
  if (hasFiles(e)) dragDepth.value = Math.max(0, dragDepth.value - 1)
}
const { execute: upload } = useAsyncAction(async (files: File[]) => {
  await documents.uploadFiles(files)
}, { error: t('uploadError') })
function onDrop (e: DragEvent) {
  dragDepth.value = 0
  const transfer = e.dataTransfer
  if (!transfer?.files.length) return
  // a dropped folder comes as an empty file: refuse it rather than storing a broken document
  const files = [...transfer.items].map(item => item.webkitGetAsEntry?.()).some(entry => entry?.isDirectory)
    ? null
    : [...transfer.files]
  if (files) upload(files)
  else sendUiNotif({ type: 'error', msg: t('noFolderDrop') })
}
</script>

<template>
  <div
    class="d-flex flex-column h-100 position-relative"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="d-flex flex-wrap align-center ga-2 px-2 py-2 border-b">
      <nav
        :aria-label="t('breadcrumb')"
        class="d-flex flex-wrap align-center flex-grow-1 ga-1"
        style="min-width: 0"
      >
        <v-breadcrumbs
          :items="breadcrumbs"
          active-color="primary"
          divider="/"
          class="pa-0"
        >
          <template #prepend>
            <v-btn
              :icon="mdiHome"
              :aria-label="t('root')"
              :aria-current="segments.length === 0 ? 'page' : undefined"
              :href="folderHref('/')"
              variant="text"
              density="comfortable"
              @click="openFolderLink($event, '/')"
            />
            <span
              v-if="segments.length"
              aria-hidden="true"
              class="px-2"
            >/</span>
          </template>
        </v-breadcrumbs>
      </nav>
      <v-text-field
        v-model="search"
        :label="t('search')"
        :prepend-inner-icon="mdiMagnify"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        class="flex-grow-1"
        style="min-width: 12rem; max-width: 22rem"
      />
      <template v-if="!thumbnail">
        <v-btn
          v-if="xs"
          v-tooltip:bottom="t('import')"
          :icon="mdiFilePlusOutline"
          :aria-label="t('import')"
          color="primary"
          variant="flat"
          density="comfortable"
          @click="openDialog({ type: 'upload' }, $event)"
        />
        <v-btn
          v-else
          :prepend-icon="mdiFilePlusOutline"
          height="40"
          color="primary"
          variant="flat"
          @click="openDialog({ type: 'upload' }, $event)"
        >
          {{ t('import') }}
        </v-btn>
        <v-btn
          v-if="xs"
          v-tooltip:bottom="t('newFolder')"
          :icon="mdiFolderPlusOutline"
          :aria-label="t('newFolder')"
          color="primary"
          variant="outlined"
          density="comfortable"
          @click="openDialog({ type: 'folder' }, $event)"
        />
        <v-btn
          v-else
          :prepend-icon="mdiFolderPlusOutline"
          height="40"
          color="primary"
          variant="outlined"
          @click="openDialog({ type: 'folder' }, $event)"
        >
          {{ t('newFolder') }}
        </v-btn>
      </template>
    </div>

    <v-progress-linear
      v-if="pending && !uploads.size"
      :aria-label="t('processing')"
      color="primary"
      height="4"
      indeterminate
    />
    <v-progress-linear
      v-if="uploads.size"
      :model-value="uploadProgress"
      :aria-label="t('uploading', { count: uploads.size })"
      color="primary"
      height="4"
    />

    <v-data-table-virtual
      v-model:sort-by="sortBy"
      :headers="headers"
      :custom-key-sort="keepServerOrder"
      :items="items"
      item-value="key"
      :loading="loading"
      :no-data-text="isSearching ? t('noResult') : t('emptyFolder')"
      :loading-text="t('loading')"
      fixed-header
      density="comfortable"
      height="100%"
      class="flex-grow-1 bg-transparent"
      style="min-height: 0"
    >
      <template #[`item.name`]="{ item }">
        <div
          class="d-flex align-center ga-3"
          :title="item.row.kind === 'folder' ? item.row.name : item.row.line.nom"
        >
          <v-icon
            :icon="item.row.kind === 'folder' ? mdiFolder : fileIcon(item.row.line.type_mime, item.row.line.attachmentPath ?? item.row.line.nom)"
            class="flex-shrink-0"
          />
          <a
            v-if="item.row.kind === 'folder'"
            :href="folderHref(childPath(item.row.path, item.row.name))"
            class="name-link text-truncate font-weight-medium"
            @click="openFolderLink($event, childPath(item.row.path, item.row.name))"
          >{{ item.row.name }}</a>
          <a
            v-else
            :href="fileUrl(item.row.line)"
            target="_blank"
            rel="noopener"
            class="name-link text-truncate"
          >{{ item.row.line.nom }}</a>
        </div>
      </template>
      <template #[`item.folder`]="{ item }">
        <v-btn
          variant="text"
          density="compact"
          class="text-none"
          @click="documents.openFolder(item.row.kind === 'folder' ? item.row.path : item.row.line.path)"
        >
          {{ item.row.kind === 'folder' ? item.row.path : item.row.line.path }}
        </v-btn>
      </template>
      <template #[`item.size`]="{ item }">
        <span
          v-if="item.row.kind === 'file'"
          class="text-no-wrap"
        >{{ item.row.line.taille === undefined ? '' : formatBytes(Number(item.row.line.taille), locale) }}</span>
      </template>
      <template #[`item.revisions`]="{ item }">
        <span v-if="item.row.kind === 'file'">{{ item.row.line.nbrevisions ?? 0 }}</span>
      </template>
      <template #[`item.updated`]="{ item }">
        <span class="text-no-wrap">{{ formatDate(item.row.line?._updatedAt) }}</span>
      </template>
      <template #[`item.actions`]="{ item }">
        <v-menu
          v-if="xs"
          location="bottom end"
        >
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              :icon="mdiDotsVertical"
              :aria-label="t('actionsNamed', { name: item.row.kind === 'folder' ? item.row.name : item.row.line.nom })"
              variant="text"
              density="comfortable"
              @click="moreButton = $event.currentTarget"
            />
          </template>
          <v-list density="compact">
            <template v-if="item.row.kind === 'file'">
              <v-list-item
                :prepend-icon="mdiPencil"
                :title="t('edit')"
                base-color="primary"
                @click="openDialog({ type: 'edit', row: item.row }, moreButton)"
              />
              <v-list-item
                v-if="history"
                :prepend-icon="mdiHistory"
                :title="t('history')"
                @click="openDialog({ type: 'history', row: item.row }, moreButton)"
              />
              <v-list-item
                :prepend-icon="mdiDownload"
                :title="t('download')"
                :href="fileUrl(item.row.line)"
                :download="attachmentFilename(item.row.line.attachmentPath ?? '')"
              />
            </template>
            <v-list-item
              v-else
              :prepend-icon="mdiPencil"
              :title="t('rename')"
              base-color="primary"
              @click="openDialog({ type: 'folder', row: item.row }, moreButton)"
            />
            <v-list-item
              :prepend-icon="mdiDelete"
              :title="t('delete')"
              base-color="error"
              @click="openDialog({ type: 'delete', row: item.row }, moreButton)"
            />
          </v-list>
        </v-menu>
        <div
          v-else
          class="d-flex justify-end ga-1"
        >
          <template v-if="item.row.kind === 'file'">
            <v-btn
              v-tooltip:top="t('edit')"
              :icon="mdiPencil"
              :aria-label="t('editNamed', { name: item.row.line.nom })"
              color="primary"
              variant="text"
              density="comfortable"
              @click="openDialog({ type: 'edit', row: item.row }, $event)"
            />
            <v-btn
              v-if="history"
              v-tooltip:top="t('history')"
              :icon="mdiHistory"
              :aria-label="t('historyNamed', { name: item.row.line.nom })"
              variant="text"
              density="comfortable"
              @click="openDialog({ type: 'history', row: item.row }, $event)"
            />
            <v-btn
              v-tooltip:top="t('download')"
              :icon="mdiDownload"
              :aria-label="t('downloadNamed', { name: item.row.line.nom })"
              :href="fileUrl(item.row.line)"
              :download="attachmentFilename(item.row.line.attachmentPath ?? '')"
              variant="text"
              density="comfortable"
            />
          </template>
          <v-btn
            v-else
            v-tooltip:top="t('rename')"
            :icon="mdiPencil"
            :aria-label="t('renameNamed', { name: item.row.name })"
            color="primary"
            variant="text"
            density="comfortable"
            @click="openDialog({ type: 'folder', row: item.row }, $event)"
          />
          <v-btn
            v-tooltip:top="t('delete')"
            :icon="mdiDelete"
            :aria-label="t('deleteNamed', { name: item.row.kind === 'folder' ? item.row.name : item.row.line.nom })"
            color="error"
            variant="text"
            density="comfortable"
            @click="openDialog({ type: 'delete', row: item.row }, $event)"
          />
        </div>
      </template>
      <template
        v-if="truncated"
        #bottom
      >
        <div class="text-body-small text-medium-emphasis pa-2 border-t">
          {{ t('truncated', { count: isSearching ? SEARCH_SIZE : FOLDER_SIZE }) }}
        </div>
      </template>
    </v-data-table-virtual>

    <div
      v-if="dragging"
      class="position-absolute d-flex align-center justify-center pa-4"
      style="inset: 0; z-index: 10; pointer-events: none"
    >
      <v-sheet
        color="surface"
        border="primary md dashed"
        rounded="lg"
        class="d-flex flex-column align-center ga-2 pa-8 text-center"
        elevation="4"
      >
        <v-icon
          :icon="mdiTrayArrowDown"
          color="primary"
          size="x-large"
        />
        <div class="text-title-large">
          {{ t('dropHere', { folder: path }) }}
        </div>
      </v-sheet>
    </div>

    <folder-menu
      v-if="dialog?.type === 'folder'"
      :key="dialogKey"
      :folder="dialog.row?.kind === 'folder' ? dialog.row : undefined"
      :siblings="siblingFolders"
      :target="opener"
      @close="closeDialog"
    />
    <upload-menu
      v-if="dialog?.type === 'upload'"
      :key="dialogKey"
      :target="opener"
      @close="closeDialog"
    />
    <edit-menu
      v-if="dialog?.type === 'edit' && dialog.row?.kind === 'file'"
      :key="dialogKey"
      :line="dialog.row.line"
      :target="opener"
      @close="closeDialog"
    />
    <delete-menu
      v-if="dialog?.type === 'delete' && dialog.row"
      :key="dialogKey"
      :row="dialog.row"
      :target="opener"
      @close="closeDialog"
    />
    <history-menu
      v-if="dialog?.type === 'history' && dialog.row?.kind === 'file'"
      :key="dialogKey"
      :line="dialog.row.line"
      :target="opener"
      @close="closeDialog"
    />
  </div>
</template>

<i18n lang="yaml">
fr:
  breadcrumb: Fil d'Ariane
  root: Racine
  search: Rechercher
  import: Importer
  newFolder: Nouveau dossier
  name: Nom
  folder: Dossier
  size: Taille
  revisions: Révisions
  updated: Modifié le
  actions: Actions
  edit: Modifier
  editNamed: Modifier {name}
  history: Historique
  historyNamed: Historique de {name}
  download: Télécharger
  downloadNamed: Télécharger {name}
  rename: Renommer
  renameNamed: Renommer le dossier {name}
  delete: Supprimer
  deleteNamed: Supprimer {name}
  actionsNamed: Actions sur {name}
  noResult: Aucun document trouvé.
  emptyFolder: Ce dossier est vide. Déposez des fichiers ici ou utilisez Importer.
  loading: Chargement…
  truncated: Seuls les {count} premiers éléments sont affichés.
  uploading: Envoi de {count} fichier(s)
  processing: Traitement en cours
  uploadError: Erreur lors de l'envoi des fichiers
  dropHere: Déposer les fichiers dans {folder}
  noFolderDrop: Le dépôt de dossiers n'est pas pris en charge, déposez les fichiers qu'ils contiennent.
en:
  breadcrumb: Breadcrumb
  root: Root
  search: Search
  import: Import
  newFolder: New folder
  name: Name
  folder: Folder
  size: Size
  revisions: Revisions
  updated: Modified
  actions: Actions
  edit: Edit
  editNamed: Edit {name}
  history: History
  historyNamed: History of {name}
  download: Download
  downloadNamed: Download {name}
  rename: Rename
  renameNamed: Rename folder {name}
  delete: Delete
  deleteNamed: Delete {name}
  actionsNamed: Actions on {name}
  noResult: No document found.
  emptyFolder: This folder is empty. Drop files here or use Import.
  loading: Loading…
  truncated: Only the first {count} items are shown.
  uploading: Uploading {count} file(s)
  processing: Processing
  uploadError: Error while uploading the files
  dropHere: Drop the files into {folder}
  noFolderDrop: Dropping folders is not supported, drop the files they contain.
</i18n>

<style scoped>
/* names read as plain text, the link shows on hover and keyboard focus */
.name-link {
  color: inherit;
  text-decoration: none;
}
.name-link:hover, .name-link:focus-visible {
  text-decoration: underline;
}
</style>
