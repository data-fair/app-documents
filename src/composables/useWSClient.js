import ReconnectingWebSocket from 'reconnecting-websocket'

class WSClient {
  _channels
  _ws
  _url
  constructor (url) {
    this._channels = []
    this._url = url.replace('http:', 'ws:').replace('https:', 'wss:')
    console.log('Configure WS', this._url)
    if (window.WebSocket) {
      const ws = new ReconnectingWebSocket(this._url, [], {
        reconnectInterval: 3000,
        maxReconnectInterval: 30000,
        reconnectDecay: 1.5,
        timeoutInterval: 2000
      })
      this._ws = ws
      ws.addEventListener('open', () => {
        console.log('co opened')
        this._channels.forEach((channel) => {
          const subscribeMessage = { type: 'subscribe', channel }
          this._ws.send(JSON.stringify(subscribeMessage))
        })
      })
      ws.addEventListener('close', (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`)
      })
    }
  }

  async waitFor (channel, filter, timeout = 30000) {
    return await new Promise((resolve, reject) => {
      const _timeout = setTimeout(() => {
        reject(new Error('timeout'))
      }, timeout)
      const onMessage = (event) => {
        const body = JSON.parse(event.data)
        if (body.channel === channel && filter(body)) {
          clearTimeout(_timeout)
          this._ws.removeEventListener('message', onMessage)
          resolve(body)
        }
      }
      this._ws.addEventListener('message', onMessage)
    })
  }

  async subscribe (channel) {
    if (this._channels.includes(channel)) return
    const subscribeMessage = { type: 'subscribe', channel }
    this._ws.send(JSON.stringify(subscribeMessage))
    const event = await this.waitFor(channel, (e) => {
      return e.type === 'subscribe-confirm' || e.type === 'error'
    })
    if (event.type === 'error') throw new Error('Erreur subscribe')
  }

  async waitForJournal (datasetId, eventType, timeout = 30000) {
    const channel = `datasets/${datasetId}/journal`
    await this.subscribe(channel)
    const event = await this.waitFor(channel, (e) => {
      return e.type === 'error' || e.data.type === eventType
    })
    if (event.type === 'error') throw new Error('Erreur indexation')
  }
}
export default function useWSClient (wsUrl) {
  const websock = new WSClient(wsUrl)
  return websock
}
