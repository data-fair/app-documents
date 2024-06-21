import ReconnectingWebSocket from 'reconnecting-websocket'
export class WSClient {
  _channel
  _ws
  constructor (channel) {
    this._channel = channel
  }

  configureWS () {
    let wsUrl = 'http://localhost:5888/data-fair'
    wsUrl = (wsUrl).replace('http:', 'ws:').replace('https:', 'wss:')
    console.log('Configure WS', wsUrl)
    if (window.WebSocket) {
      const ws = new ReconnectingWebSocket(wsUrl, [], {
        reconnectInterval: 3000,
        maxReconnectInterval: 30000,
        reconnectDecay: 1.5,
        timeoutInterval: 2000
      })
      this._ws = ws
      ws.addEventListener('open', () => {
        console.log('co opened')
        const channel = this._channel
        const subscribeMessage = { type: 'subscribe', channel }
        ws.send(JSON.stringify(subscribeMessage))
      })

      ws.addEventListener('close', (event) => {
        console.log(event)
        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`)
      })
      ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error)
      })
      ws.onmessage = event => {
        console.log('recep')
        const body = JSON.parse(event.data)
        if (body.type === 'subscribe-confirm') {
          console.log('sub ok')
        }
        if (body.type === 'message') {
          console.log(body)
        }
      }
    }
  }

  async waitFor () {
    return await new Promise((resolve, reject) => {
      const _timeout = setTimeout(() => { reject(new Error('timeout')) }, 300000)
      this._ws.onmessage = event => {
        const body = JSON.parse(event.data)
        if (body.type === 'finalize-end') {
          clearTimeout(_timeout)
          resolve(body)
        }
      }
    })
  }
}
