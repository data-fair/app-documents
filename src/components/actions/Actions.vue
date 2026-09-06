<script setup lang="ts">
import EditLine from './Edit.vue'
import Revisions from './Revisions.vue'
import Download from './Download.vue'
import Delete from './Delete.vue'
import type { DocumentLine } from '@/context'

defineProps<{
  id: string
  line: DocumentLine
}>()
</script>
<template>
  <edit-line
    :id="id"
    :line="line"
  />
  <delete
    :id="id"
    :line="line"
  />
  <revisions
    v-if="line.attachmentPath!==undefined"
    :id="id"
  />
  <download
    v-if="line.attachmentPath!==undefined"
    :file-url="line.attachmentPath"
    :name="line.nom"
  />
</template>
