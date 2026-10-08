import { test, expect } from '@playwright/test'
import { JOURNAL_SEQUENCE, nextJournalBuffer, type WsEvent } from '../../src/composables/useWSClient'

function run (buffer: string[], events: WsEvent[]) {
  let state = { buffer, matched: false, error: false }
  for (const event of events) state = nextJournalBuffer(state.buffer, event)
  return state
}

test.describe('nextJournalBuffer', () => {
  test('reconnait la séquence complète dindexation', () => {
    const state = run(
      [...JOURNAL_SEQUENCE],
      ['index-start', 'index-end', 'finalize-start', 'finalize-end'].map(type => ({ data: { type } }))
    )
    expect(state.matched).toBe(true)
    expect(state.error).toBe(false)
    expect(state.buffer).toEqual(['finalize-end'])
  })

  test('ignore un événement hors ordre', () => {
    const state = run([...JOURNAL_SEQUENCE], [{ data: { type: 'finalize-end' } }])
    expect(state.matched).toBe(false)
    expect(state.buffer).toEqual(JOURNAL_SEQUENCE)
  })

  test('signale une erreur de journal', () => {
    const state = run([...JOURNAL_SEQUENCE], [{ type: 'error' }])
    expect(state.error).toBe(true)
  })
})
