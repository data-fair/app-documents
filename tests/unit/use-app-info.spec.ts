import { test, expect } from '@playwright/test'
import useAppInfo from '../../src/composables/useAppInfo'

const g = globalThis as any

test.afterEach(() => { delete g.window })

test.describe('useAppInfo', () => {
  test('retourne les informations du jeu de données configuré', () => {
    g.window = {
      APPLICATION: {
        configuration: { datasets: [{ id: 'd1', href: '/data-fair/api/v1/datasets/d1' }] },
        wsUrl: 'ws://host/ws'
      }
    }
    expect(useAppInfo()).toEqual({ dataUrl: '/data-fair/api/v1/datasets/d1', datasetId: 'd1', wsUrl: 'ws://host/ws' })
  })

  test('refuse une application sans configuration', () => {
    g.window = {}
    expect(() => useAppInfo()).toThrow(/configuration définie/)
  })

  test('refuse une configuration sans jeu de données', () => {
    g.window = { APPLICATION: { configuration: {}, wsUrl: 'ws://host/ws' } }
    expect(() => useAppInfo()).toThrow(/source de données/)
  })
})
