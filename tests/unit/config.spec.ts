import { test, expect } from '@playwright/test'
import { resolveConfigMessage, setByPath } from '../../src/composables/config'

test.describe('setByPath', () => {
  test('écrit une valeur dans un chemin imbriqué', () => {
    const obj: Record<string, unknown> = {}
    setByPath(obj, 'a.b.c', 42)
    expect(obj).toEqual({ a: { b: { c: 42 } } })
  })

  test('ne mute pas lobjet source', () => {
    const source = { a: { b: { c: 1 } } }
    const copy = JSON.parse(JSON.stringify(source)) as Record<string, unknown>
    setByPath(copy, 'a.b.c', 2)
    expect(source.a.b.c).toBe(1)
    expect(copy).toEqual({ a: { b: { c: 2 } } })
  })
})

test.describe('resolveConfigMessage', () => {
  test('retourne la configuration complète fournie', () => {
    expect(resolveConfigMessage({ a: 1 }, { configuration: { b: 2 } })).toEqual({ b: 2 })
  })

  test('fusionne un correctif de datasets', () => {
    expect(resolveConfigMessage({ a: 1 }, { datasets: [{ id: 'x' }] })).toEqual({ a: 1, datasets: [{ id: 'x' }] })
  })

  test('applique un correctif par champ', () => {
    expect(resolveConfigMessage({ a: 1 }, { field: 'x.y', value: 3 })).toEqual({ a: 1, x: { y: 3 } })
  })

  test('ignore un message vide ou inconnu', () => {
    expect(resolveConfigMessage({ a: 1 }, null)).toBeNull()
    expect(resolveConfigMessage({ a: 1 }, { foo: 'bar' })).toBeNull()
  })
})
