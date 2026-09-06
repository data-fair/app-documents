import { createApp } from 'vue'
import '@data-fair/lib-vuetify/style/global.scss'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import { createI18n } from 'vue-i18n'
import { createSession } from '@data-fair/lib-vue/session.js'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { createConfig } from './composables/config'
import { uiNotifPlugin } from './composables/ui-notif'
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
    icons: { defaultSet: 'mdi' }
  })

  const app = createApp(App)
  app.use(vuetify)
    .use(session)
    .use(i18n)
    .use(createLocaleDayjs(session.lang.value))
    .use(uiNotifPlugin)
    .use(createConfig())
  app.mount('#app')
}

init()
