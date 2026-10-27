<script setup lang="ts">
defineProps<{ target?: HTMLElement | null, title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <!-- the form of an action, anchored on the button that opened it (as in app-contribs) -->
  <v-menu
    :model-value="true"
    :target="target ?? undefined"
    :close-on-content-click="false"
    location="bottom end"
    max-height="80vh"
    retain-focus
    @update:model-value="emit('close')"
  >
    <!-- the width goes on the card: placed below its button, a menu's min-width is capped to the button width -->
    <v-card
      :width="480"
      max-width="100%"
      border
      class="d-flex flex-column"
    >
      <v-card-title class="text-wrap text-break pb-0">
        {{ title }}
      </v-card-title>
      <slot />
    </v-card>
  </v-menu>
</template>
