import type { App } from 'vue'
import { getUiNotif, uiNotifKey } from '@data-fair/lib-vue/ui-notif.js'

const uiNotif = getUiNotif()

export const uiNotifPlugin = {
  install (app: App) {
    app.provide(uiNotifKey, uiNotif)
  }
}

export const notification = uiNotif.notification
export const sendUiNotif = uiNotif.sendUiNotif
