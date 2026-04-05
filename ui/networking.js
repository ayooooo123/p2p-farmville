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

    // Cleanup on app close
    Pear.teardown(() => this.swarm.destroy())

    this._setupConnectionHandler()
  }

  async createFarm () {
    this.topic = crypto.randomBytes(32)
    const discovery = this.swarm.join(this.topic, { client: true, server: true })
    await discovery.flushed()
    return b4a.toString(this.topic, 'hex')
  }

  async joinFarm (topicHex) {
    this.topic = b4a.from(topicHex, 'hex')
    const discovery = this.swarm.join(this.topic, { client: true, server: true })
    await discovery.flushed()
  }

  _setupConnectionHandler () {
    this.swarm.on('connection', (conn) => {
      const peerKey = b4a.toString(conn.remotePublicKey, 'hex')
      console.log('Peer connected:', peerKey.slice(0, 8))

      // Replicate cores
      this.store.replicate(conn)

      // Set up Protomux channels
      const channels = setupProtomux(conn, {
        onFarmSync: (buf) => {
          const msg = JSON.parse(b4a.toString(buf))
          if (this.onFarmState) this.onFarmState(peerKey, msg)
        },
        onChat: (buf) => {
          const msg = JSON.parse(b4a.toString(buf))
          if (this.onChatMessage) this.onChatMessage(peerKey, msg)
        },
        onTrade: (buf) => {
          // Trade handling for future use
        },
        onVisit: (buf) => {
          // Visit handling for future use
        }
      })

      this.peers.set(peerKey, { conn, channels, name: null })

      if (this.onPeerJoin) this.onPeerJoin(peerKey)

      conn.on('close', () => {
        this.peers.delete(peerKey)
        console.log('Peer disconnected:', peerKey.slice(0, 8))
        if (this.onPeerLeave) this.onPeerLeave(peerKey)
      })
    })
  }

  broadcastFarmState (farmState) {
    const data = JSON.stringify({ type: 'full-state', data: farmState.serialize() })
    for (const [, peer] of this.peers) {
      peer.channels.farmSync.send(data)
    }
  }

  sendChatMessage (sender, text) {
    const data = JSON.stringify({ sender, text, timestamp: Date.now() })
    for (const [, peer] of this.peers) {
      peer.channels.chat.send(data)
    }
  }
}
