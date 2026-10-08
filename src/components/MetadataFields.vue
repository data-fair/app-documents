<script setup lang="ts">
import { useConfig } from '@/composables/config'

const props = defineProps<{ modelValue?: Record<string, unknown> }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: Record<string, unknown>): void }>()

const { metadata } = useConfig()

function get (key: string): unknown {
  return props.modelValue?.[key]
}

function set (key: string, value: unknown) {
  emit('update:modelValue', { ...(props.modelValue ?? {}), [key]: value })
}
</script>
<template>
  <div v-if="metadata.length">
    <template
      v-for="field in metadata"
      :key="field.key"
    >
      <v-checkbox
        v-if="field.type === 'boolean'"
        :model-value="!!get(field.key)"
        :label="field.title"
        density="compact"
        hide-details
        class="mb-1"
        @update:model-value="set(field.key, $event)"
      />
      <v-text-field
        v-else
        :model-value="get(field.key)"
        :label="field.title"
        :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
        density="compact"
        variant="outlined"
        hide-details
        class="mb-2"
        @update:model-value="set(field.key, $event)"
      />
    </template>
  </div>
</template>
