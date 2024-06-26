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
          this._channels.push(channel)
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
    this._channels.push(channel)
  }

  async waitForJournal (datasetId) {
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
        } else return false
      }
      return e.type === 'error'
    })
    console.log('fin journ')
    if (event.type === 'error') throw new Error('Erreur indexation')
  }
}
export default function useWSClient (wsUrl) {
  const websock = new WSClient(wsUrl)
  return websock
}
