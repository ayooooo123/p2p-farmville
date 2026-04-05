import Protomux from 'protomux'
import b4a from 'b4a'

function setupProtomux (stream, handlers) {
  const mux = Protomux.from(stream)

  // Farm sync channel
  const farmSyncChannel = mux.createChannel({
    protocol: CHANNELS.FARM_SYNC,
    onopen () {},
    onclose () {}
  })
  const farmSyncMsg = farmSyncChannel.addMessage({
    onmessage (buf) { handlers.onFarmSync(buf) }
  })
  farmSyncChannel.open()

  // Chat channel
  const chatChannel = mux.createChannel({
    protocol: CHANNELS.CHAT,
    onopen () {},
    onclose () {}
  })
  const chatMsg = chatChannel.addMessage({
    onmessage (buf) { handlers.onChat(buf) }
  })
  chatChannel.open()

  // Trade channel
  const tradeChannel = mux.createChannel({
    protocol: CHANNELS.TRADE,
    onopen () {},
    onclose () {}
  })
  const tradeMsg = tradeChannel.addMessage({
    onmessage (buf) { handlers.onTrade(buf) }
  })
  tradeChannel.open()

  // Visit channel
  const visitChannel = mux.createChannel({
    protocol: CHANNELS.VISIT,
    onopen () {},
    onclose () {}
  })
  const visitMsg = visitChannel.addMessage({
    onmessage (buf) { handlers.onVisit(buf) }
  })
  visitChannel.open()

  mux.open()

  return {
    farmSync: { send (data) { farmSyncMsg.send(b4a.from(data)) } },
    chat: { send (data) { chatMsg.send(b4a.from(data)) } },
    trade: { send (data) { tradeMsg.send(b4a.from(data)) } },
    visit: { send (data) { visitMsg.send(b4a.from(data)) } }
  }
}
