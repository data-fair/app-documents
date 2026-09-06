import { createApp } from 'vue'
import '@data-fair/lib-vuetify/style/global.scss'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { createI18n } from 'vue-i18n'
import { createSession } from '@data-fair/lib-vue/session.js'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { createConfig } from './composables/config'
import App from './App.vue'

window.vIframeOptions = { reactiveParams: reactiveSearchParams }

async function init () {
  const session = await createSession({
    directoryUrl: '/simple-directory',
    siteInfo: !window.__PUBLIC_SITE_INFO
  })

  const i18n = createI18n({
    legacy: false,
    locale: session.lang.value,
    fallbackLocale: 'en'
  })

  const vuetify = createVuetify({
    ...vuetifySessionOptions(session),
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } }
  })

  const app = createApp(App)
  app.use(vuetify)
    .use(session)
    .use(i18n)
    .use(createLocaleDayjs(session.lang.value))
    .use(createUiNotif())
    .use(createConfig())
  app.mount('#app')
}

init()
