import type { Application } from '@data-fair/lib-common-types/application/index.js'
import type { FullSiteInfo } from '@data-fair/lib-vue/session.js'

declare global {
  interface Window {
    APPLICATION?: Application & { apiUrl?: string }
    __PUBLIC_SITE_INFO?: FullSiteInfo
    triggerCapture?: (animationSupported?: boolean) => Promise<boolean> | boolean
    animateCaptureFrame?: () => boolean
    vIframeOptions?: Record<string, unknown>
  }
}
