<script setup>
import EditLine from './Edit.vue'
import Revisions from './Revisions.vue'
import Download from './Download.vue'
import Delete from './Delete.vue'
defineProps({
  id: {
    type: String,
    required: true
  },
  line: {
    type: Object,
    required: true
  }
})
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
