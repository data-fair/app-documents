import ReconnectingWebSocket from 'reconnecting-websocket'

export interface WsEvent {
  type?: string
  channel?: string
  data?: { type?: string }
  [key: string]: unknown
}

type EventFilter = (event: WsEvent) => boolean

// séquence de journal attendue pour considérer une indexation terminée (lue de la fin vers le début)
export const JOURNAL_SEQUENCE = ['finalize-end', 'finalize-start', 'index-end', 'index-start']

export interface JournalState {
  buffer: string[]
  matched: boolean
  error: boolean
}

// état suivant de l'attente de journal : on dépile un événement attendu, on signale un match ou une erreur
export function nextJournalBuffer (buffer: string[], event: WsEvent): JournalState {
  if (event.data === undefined) return { buffer, matched: false, error: event.type === 'error' }
  const expected = buffer[buffer.length - 1]
  if (buffer.length === 1) return { buffer, matched: event.data.type === expected, error: false }
  if (event.data.type === expected) return { buffer: buffer.slice(0, -1), matched: false, error: false }
  return { buffer, matched: false, error: false }
}

class WSClient {
  private channels: string[] = []
  private ws: ReconnectingWebSocket | null = null

  constructor (url: string) {
    if (typeof window === 'undefined' || !window.WebSocket) return
    const ws = new ReconnectingWebSocket(url.replace('http:', 'ws:').replace('https:', 'wss:'))
    this.ws = ws
    ws.addEventListener('open', () => {
      this.channels.forEach((channel) => {
        ws.send(JSON.stringify({ type: 'subscribe', channel }))
      })
    })
  }

  async waitFor (channel: string, filter: EventFilter, timeout = 30000): Promise<WsEvent> {
    return await new Promise((resolve, reject) => {
      const _timeout = setTimeout(() => reject(new Error('timeout')), timeout)
      const onMessage = (event: MessageEvent) => {
        const body = JSON.parse(event.data as string) as WsEvent
        if (body.channel === channel && filter(body)) {
          clearTimeout(_timeout)
          this.ws?.removeEventListener('message', onMessage)
          resolve(body)
        }
      }
      this.ws?.addEventListener('message', onMessage)
    })
  }

  async subscribe (channel: string) {
    if (this.channels.includes(channel)) return
    this.ws?.send(JSON.stringify({ type: 'subscribe', channel }))
    const event = await this.waitFor(channel, (e) => e.type === 'subscribe-confirm' || e.type === 'error')
    if (event.type === 'error') throw new Error('Erreur subscribe')
    if (event.type === 'subscribe-confirm') this.channels.push(channel)
  }

  async waitForJournal (datasetId: string) {
    const channel = `datasets/${datasetId}/journal`
    await this.subscribe(channel)
    // force journal to wait this sequence, we cant just wait the eventType finalize-end
    // because sometimes, new indexation is started just before receiving a finalize-end from a previous request
    // it cause an early stop of waitJournal and the new indexation is not considered
    let buffer = [...JOURNAL_SEQUENCE]
    const event = await this.waitFor(channel, (e) => {
      const state = nextJournalBuffer(buffer, e)
      buffer = state.buffer
      return state.error || state.matched
    })
    if (event.type === 'error') throw new Error('Erreur indexation')
  }
}

export default function useWSClient (wsUrl: string) {
  return new WSClient(wsUrl)
}
