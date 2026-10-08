<script setup lang="ts">
import { pathArray, searchQuery } from '@/context'
import CreateDoc from './CreateDoc.vue'
const emit = defineEmits<{ (e: 'update-path', value: string): void }>()
</script>
<template>
  <div
    class="px-2"
    :style="{
      borderStyle: 'solid',
      borderColor: '#1e88e5',
      borderRadius: '0.5em'
    }"
  >
    <v-banner
      class="py-1"
      lines="one"
    >
      <v-icon
        class="tbh pa-5"
        @click="emit('update-path','/')"
      >
        mdi-home
      </v-icon>
      <v-banner-text>
        <div
          v-for="(value) in pathArray"
          :key="value"
          :style="{display: 'inline'}"
        >
          <v-btn
            class="px-1 ml-1"
            density="default"
            :ripple="false"
            elevation="0"
            @click="emit('update-path',value)"
          >
            {{ value }}
          </v-btn> /
        </div>
      </v-banner-text>
      <template
        #actions
      >
        <v-text-field
          v-model="searchQuery"
          density="compact"
          variant="solo"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
          placeholder="Rechercher"
          class="mr-2"
          :style="{ maxWidth: '16em' }"
        />
        <CreateDoc />
      </template>
    </v-banner>
  </div>
</template>
