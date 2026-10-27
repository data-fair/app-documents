<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiDownload } from '@mdi/js'
import { ofetch } from 'ofetch'
import { useFetch } from '@data-fair/lib-vue/fetch.js'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'
import { formatBytes } from '@data-fair/lib-utils/format/bytes.js'
import { attachmentFilename } from '@data-fair/lib-utils/format/attachment.js'
import { useConfig } from '@/composables/config'
import { attachmentUrl, fileIcon, fileVersions, type DocumentLine, type Revision } from '@/assets/documents'
import ActionMenu from './ActionMenu.vue'

const props = defineProps<{ target?: HTMLElement | null, line: DocumentLine }>()
const emit = defineEmits<{ close: [] }>()

const { t, locale } = useI18n()
const { dayjs } = useLocaleDayjs()
const { datasetUrl } = useConfig()

interface RevisionsResponse { total: number, results: Revision[], next?: string }
const first = useFetch<RevisionsResponse>(() => `${datasetUrl.value}/lines/${encodeURIComponent(props.line._id)}/revisions`, { query: { size: 100 } })
const more = ref<Revision[]>([])
const next = ref<string | undefined>()
const revisions = computed(() => [...(first.data.value?.results ?? []), ...more.value])
const nextUrl = computed(() => more.value.length ? next.value : first.data.value?.next)
const versions = computed(() => fileVersions(revisions.value))

// numbers are only reliable once the whole history is loaded
function versionLabel (i: number) {
  if (i === 0) return t('current')
  if (nextUrl.value) return t('previous')
  const n = versions.value.length - 1 - i
  return n === 0 ? t('original') : t('revision', { n })
}

function details (version: Revision) {
  return [dayjs(version._updatedAt).format('lll'), version.taille === undefined ? '' : formatBytes(Number(version.taille), locale.value)].filter(Boolean).join(' · ')
}

const { execute: loadMore, loading: loadingMore } = useAsyncAction(async () => {
  if (!nextUrl.value) return
  const res = await ofetch<RevisionsResponse>(nextUrl.value)
  more.value.push(...res.results)
  next.value = res.next
})
</script>

<template>
  <action-menu
    :target="target"
    :title="t('title', { name: line.nom })"
    @close="emit('close')"
  >
    <v-card-text class="px-2 pb-0 overflow-y-auto">
      <v-progress-linear
        v-if="first.loading.value"
        color="primary"
        indeterminate
      />
      <v-list
        v-else
        class="py-0"
      >
        <v-list-item
          v-for="(version, i) in versions"
          :key="version._i ?? i"
          :prepend-icon="fileIcon(version.type_mime, version.attachmentPath)"
          lines="two"
          slim
        >
          <v-list-item-title class="text-break text-wrap">
            {{ attachmentFilename(version.attachmentPath ?? '') }}
          </v-list-item-title>
          <v-list-item-subtitle>
            <span :class="{ 'text-primary font-weight-medium': i === 0 }">{{ versionLabel(i) }}</span> · {{ details(version) }}
          </v-list-item-subtitle>
          <template #append>
            <v-btn
              :icon="mdiDownload"
              :aria-label="t('download', { name: attachmentFilename(version.attachmentPath ?? '') })"
              :href="version.attachmentPath ? attachmentUrl(datasetUrl ?? '', version.attachmentPath) : undefined"
              :download="attachmentFilename(version.attachmentPath ?? '')"
              variant="text"
              density="comfortable"
              class="flex-shrink-0 ml-2"
            />
          </template>
        </v-list-item>
      </v-list>
      <v-btn
        v-if="nextUrl"
        variant="text"
        :loading="loadingMore"
        @click="loadMore"
      >
        {{ t('more') }}
      </v-btn>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn @click="emit('close')">
        {{ t('close') }}
      </v-btn>
    </v-card-actions>
  </action-menu>
</template>

<i18n lang="yaml">
fr:
  title: Historique de {name}
  current: Version actuelle
  original: Originale
  previous: Précédente
  revision: Révision {n}
  download: Télécharger {name}
  more: Afficher les versions plus anciennes
  close: Fermer
en:
  title: History of {name}
  current: Current version
  original: Original
  previous: Previous
  revision: Revision {n}
  download: Download {name}
  more: Show older versions
  close: Close
</i18n>
