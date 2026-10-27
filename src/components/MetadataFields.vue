<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useConfig } from '@/composables/config'

const props = defineProps<{ modelValue?: Record<string, unknown> }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: Record<string, unknown>): void }>()

const { t } = useI18n()
const { metadata } = useConfig()

function get (key: string): unknown {
  return props.modelValue?.[key]
}

function set (key: string, value: unknown) {
  emit('update:modelValue', { ...(props.modelValue ?? {}), [key]: value })
}

// a date column stores a date-time, the date input only needs its day
function dateValue (value: unknown) {
  return typeof value === 'string' ? value.slice(0, 10) : value
}

// the number input emits strings, the column stores numbers
function numberValue (value: unknown) {
  return value === '' || value === null || value === undefined ? null : Number(value)
}

const required = (v: unknown) => (v !== undefined && v !== null && v !== '') || t('required')
</script>

<template>
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
      class="mb-2"
      @update:model-value="set(field.key, $event)"
    />
    <v-text-field
      v-else
      :model-value="field.type === 'date' ? dateValue(get(field.key)) : get(field.key)"
      :label="field.title"
      :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
      :rules="field.required ? [required] : []"
      variant="outlined"
      density="compact"
      hide-details="auto"
      class="mb-2"
      @update:model-value="set(field.key, field.type === 'number' ? numberValue($event) : $event)"
    />
  </template>
</template>

<i18n lang="yaml">
fr:
  required: Ce champ est obligatoire.
en:
  required: This field is required.
</i18n>
