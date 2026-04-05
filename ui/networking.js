import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'

class FarmNetwork {
  constructor (farmCore, store, chatCore) {
    this.swarm = new Hyperswarm()
    this.farmCore = farmCore
    this.store = store
    this.chatCore = chatCore
    this.peers = new Map() // publicKey hex -> { conn, channels, name }
    this.topic = null

    // Event callbacks
    this.onPeerJoin = null
    this.onPeerLeave = null
    this.onFarmState = null
    this.onChatMessage = null
    this.onTradeMessage = null

    // Cleanup on app close
    Pear.teardown(() => this.destroy())

    this._setupConnectionHandler()
  }

  async destroy () {
    try {
      await this.swarm.destroy()
    } catch (err) {
      // Swarm already closed
    }
  }

  async createFarm () {
    this.topic = crypto.randomBytes(32)
    try {
      const discovery = this.swarm.join(this.topic, { client: true, server: true })
      await discovery.flushed()
    } catch (err) {
      throw new Error('Failed to create farm network: ' + err.message)
    }
    return b4a.toString(this.topic, 'hex')
  }

  async joinFarm (topicHex) {
    this.topic = b4a.from(topicHex, 'hex')
    try {
      const discovery = this.swarm.join(this.topic, { client: true, server: true })
      await discovery.flushed()
    } catch (err) {
      throw new Error('Failed to join farm network: ' + err.message)
    }
  }

  _setupConnectionHandler () {
    this.swarm.on('connection', (conn) => {
      const peerKey = b4a.toString(conn.remotePublicKey, 'hex')

      // Replicate cores
      try {
        this.store.replicate(conn)
      } catch (err) {
        // Replication setup failed
      }

      // Set up Protomux channels
      let channels
      try {
        channels = setupProtomux(conn, {
          onFarmSync: (buf) => {
            try {
              const msg = JSON.parse(b4a.toString(buf))
              if (this.onFarmState) this.onFarmState(peerKey, msg)
            } catch (err) {
              // Malformed farm sync message
            }
          },
          onChat: (buf) => {
            try {
              const msg = JSON.parse(b4a.toString(buf))
              if (this.onChatMessage) this.onChatMessage(peerKey, msg)
            } catch (err) {
              // Malformed chat message
            }
          },
          onTrade: (buf) => {
            try {
              const msg = JSON.parse(b4a.toString(buf))
              if (this.onTradeMessage) this.onTradeMessage(peerKey, msg)
            } catch (err) {
              // Malformed trade message
            }
          },
          onVisit: (buf) => {
            // Visit handling for future use
          }
        })
      } catch (err) {
        return
      }

      this.peers.set(peerKey, { conn, channels, name: null })

      if (this.onPeerJoin) this.onPeerJoin(peerKey)

      conn.on('close', () => {
        this.peers.delete(peerKey)
        if (this.onPeerLeave) this.onPeerLeave(peerKey)
      })

      conn.on('error', () => {
        this.peers.delete(peerKey)
      })
    })
  }

  broadcastFarmState (farmState) {
    const data = JSON.stringify({ type: 'full-state', data: farmState.serialize() })
    for (const [key, peer] of this.peers) {
      try {
        peer.channels.farmSync.send(data)
      } catch (err) {
        // Peer may have disconnected
      }
    }
  }

  sendFarmStateToPeer (peerKey, farmState) {
    const peer = this.peers.get(peerKey)
    if (!peer) return
    try {
      const data = JSON.stringify({ type: 'full-state', data: farmState.serialize() })
      peer.channels.farmSync.send(data)
    } catch (err) {
      // Peer may have disconnected
    }
  }

  sendFarmAction (action, row, col) {
    const data = JSON.stringify({ type: 'action', action, row, col })
    for (const [, peer] of this.peers) {
      try {
        peer.channels.farmSync.send(data)
      } catch (err) {
        // Peer may have disconnected
      }
    }
  }

  sendChatMessage (sender, text) {
    const data = JSON.stringify({ sender, text, timestamp: Date.now() })
    for (const [, peer] of this.peers) {
      try {
        peer.channels.chat.send(data)
      } catch (err) {
        // Peer may have disconnected
      }
    }
  }
}
