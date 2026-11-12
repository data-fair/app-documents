import { test, expect } from '@playwright/test'
import { resolveConfigMessage, setByPath } from '../../src/composables/config'

test.describe('setByPath', () => {
  test('writes a value at a nested path', () => {
    const obj: Record<string, unknown> = {}
    setByPath(obj, 'a.b.c', 42)
    expect(obj).toEqual({ a: { b: { c: 42 } } })
  })

  test('does not mutate the source object', () => {
    const source = { a: { b: { c: 1 } } }
    const copy = JSON.parse(JSON.stringify(source)) as Record<string, unknown>
    setByPath(copy, 'a.b.c', 2)
    expect(source.a.b.c).toBe(1)
    expect(copy).toEqual({ a: { b: { c: 2 } } })
  })
})

test.describe('resolveConfigMessage', () => {
  test('returns the full configuration provided', () => {
    expect(resolveConfigMessage({ a: 1 }, { configuration: { b: 2 } })).toEqual({ b: 2 })
  })

  test('merges a datasets patch', () => {
    expect(resolveConfigMessage({ a: 1 }, { datasets: [{ id: 'x' }] })).toEqual({ a: 1, datasets: [{ id: 'x' }] })
  })

  test('applies a per-field patch', () => {
    expect(resolveConfigMessage({ a: 1 }, { field: 'x.y', value: 3 })).toEqual({ a: 1, x: { y: 3 } })
  })

  test('ignores an empty or unknown message', () => {
    expect(resolveConfigMessage({ a: 1 }, null)).toBeNull()
    expect(resolveConfigMessage({ a: 1 }, { foo: 'bar' })).toBeNull()
  })
})

test('merges a metadata-only patch', () => {
  expect(resolveConfigMessage({ datasets: [] }, { metadata: [{ key: 'auteur' }] })).toEqual({ datasets: [], metadata: [{ key: 'auteur' }] })
})
