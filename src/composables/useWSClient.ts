import ReconnectingWebSocket from 'reconnecting-websocket'

export interface WsEvent {
  type?: string
  channel?: string
  data?: { type?: string }
  [key: string]: unknown
}

type EventFilter = (event: WsEvent) => boolean

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
    const bufferEvent = ['finalize-end', 'finalize-start', 'index-end', 'index-start']
    // force journal to wait this sequence, we cant just wait the eventType finalize-end
    // because sometimes, new indexation is started just before receiving a finalize-end from a previous request
    // it cause an early stop of waitJournal and the new indexation is not considered
    const event = await this.waitFor(channel, (e) => {
      const n = bufferEvent.length - 1
      const eventType = bufferEvent[bufferEvent.length - 1]
      if (e.data !== undefined) {
        if (e.data.type === eventType && n > 0) {
          bufferEvent.pop()
          return false
        } else if (n === 0) {
          return e.data.type === eventType
        }
        return false
      }
      return e.type === 'error'
    })
    if (event.type === 'error') throw new Error('Erreur indexation')
  }
}

export default function useWSClient (wsUrl: string) {
  return new WSClient(wsUrl)
}
