<script setup>
import { getMetaData, getValueField } from './request.js'
import tableDataset from './tableDataset.vue'
import createDoc from './createDoc.vue'

import { computedAsync } from '@vueuse/core'
const application = /** @type {import('@data-fair/lib/shared/application.js').Application} */ (window.APPLICATION)
const config = /** @type {import('../config/.type/types.js').Config} */ (application.configuration)
const dataUrl = config.datasets?.[0].href
const field = computedAsync(() => getValueField('nom', dataUrl), {})
const metaData = computedAsync(() => getMetaData(dataUrl), {})
</script>
<template>
  <div>
    <h2>Add Document : <createDoc /></h2>
  </div>
  <div>
    <tableDataset />
  </div>
  <div>-----------------</div>
  <v-card
    class="mx-auto"
    max-width="800"
  >
    <v-list-item
      v-for="(value,key) in metaData"
      :key="key"
      :title="'Champ ' + key + ' : ' + value.key + ', description : '+ value.description"
    />
  </v-card>
  <div>-----------------</div>
</template>
