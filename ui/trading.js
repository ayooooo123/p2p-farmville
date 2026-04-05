// P2P item trading system
class TradeManager {
  constructor (network, farmState) {
    this.network = network
    this.farmState = farmState
    this.pendingTrades = new Map()
    this.tradeCounter = 0
    this._bindUI()
  }

  _bindUI () {
    const tradeBtn = document.getElementById('trade-btn')
    if (tradeBtn) tradeBtn.addEventListener('click', () => this.openTradeUI())

    const offerForm = document.getElementById('trade-offer-form')
    if (offerForm) {
      offerForm.addEventListener('submit', (e) => {
        e.preventDefault()
        const item = document.getElementById('trade-offer-item').value
        const qty = parseInt(document.getElementById('trade-offer-qty').value) || 1
        const want = document.getElementById('trade-want-item').value
        const wantQty = parseInt(document.getElementById('trade-want-qty').value) || 1
        this.sendOffer(item, qty, want, wantQty)
      })
    }

    const cancelBtn = document.getElementById('trade-offer-cancel')
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeTradeUI())

    const acceptBtn = document.getElementById('trade-accept-btn')
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        const tradeId = acceptBtn.dataset.tradeId
        if (tradeId) this.acceptTrade(tradeId)
      })
    }

    const rejectBtn = document.getElementById('trade-reject-btn')
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        const tradeId = rejectBtn.dataset.tradeId
        if (tradeId) this.rejectTrade(tradeId)
      })
    }
  }

  _generateTradeId () {
    return Date.now() + '-' + (this.tradeCounter++)
  }

  openTradeUI () {
    const modal = document.getElementById('trade-offer-modal')
    if (!modal) return

    const offerSelect = document.getElementById('trade-offer-item')
    offerSelect.innerHTML = ''
    const inv = this.farmState.inventory
    let hasItems = false
    for (const [item, count] of Object.entries(inv)) {
      if (count > 0) {
        const crop = CROPS[item]
        const opt = document.createElement('option')
        opt.value = item
        opt.textContent = (crop ? crop.name : item) + ' (' + count + ')'
        offerSelect.appendChild(opt)
        hasItems = true
      }
    }

    if (!hasItems) {
      this.showNotification('No items to trade. Harvest some crops first!')
      return
    }

    const wantSelect = document.getElementById('trade-want-item')
    wantSelect.innerHTML = ''
    for (const [key, crop] of Object.entries(CROPS)) {
      const opt = document.createElement('option')
      opt.value = key
      opt.textContent = crop.name
      wantSelect.appendChild(opt)
    }

    document.getElementById('trade-offer-qty').value = 1
    document.getElementById('trade-want-qty').value = 1

    modal.style.display = 'flex'
  }

  closeTradeUI () {
    const modal = document.getElementById('trade-offer-modal')
    if (modal) modal.style.display = 'none'
  }

  sendOffer (item, qty, want, wantQty) {
    const have = this.farmState.inventory[item] || 0
    if (have < qty) {
      const name = CROPS[item] ? CROPS[item].name : item
      this.showNotification('Not enough ' + name + ' to offer')
      return
    }

    const tradeId = this._generateTradeId()
    const offer = {
      type: 'offer',
      from: this.farmState.playerName,
      item,
      qty,
      want,
      wantQty,
      tradeId
    }

    this.pendingTrades.set(tradeId, offer)

    const data = JSON.stringify(offer)
    for (const [, peer] of this.network.peers) {
      peer.channels.trade.send(data)
    }

    this.closeTradeUI()
    const itemName = CROPS[item] ? CROPS[item].name : item
    const wantName = CROPS[want] ? CROPS[want].name : want
    this.showNotification('Offered ' + qty + ' ' + itemName + ' for ' + wantQty + ' ' + wantName)
  }

  handleMessage (peerKey, msg) {
    switch (msg.type) {
      case 'offer':
        this.handleOffer(peerKey, msg)
        break
      case 'accept':
        this.handleAccept(msg)
        break
      case 'reject':
        this.handleReject(msg)
        break
    }
  }

  handleOffer (peerKey, offer) {
    this.pendingTrades.set(offer.tradeId, { ...offer, peerKey })
    this.showIncomingTrade(offer)
  }

  showIncomingTrade (offer) {
    const modal = document.getElementById('trade-incoming-modal')
    if (!modal) return

    const offerName = CROPS[offer.item] ? CROPS[offer.item].name : offer.item
    const wantName = CROPS[offer.want] ? CROPS[offer.want].name : offer.want

    document.getElementById('trade-incoming-text').textContent =
      offer.from + ' offers ' + offer.qty + ' ' + offerName +
      ' for ' + offer.wantQty + ' ' + wantName

    document.getElementById('trade-accept-btn').dataset.tradeId = offer.tradeId
    document.getElementById('trade-reject-btn').dataset.tradeId = offer.tradeId

    modal.style.display = 'flex'
  }

  closeIncomingTrade () {
    const modal = document.getElementById('trade-incoming-modal')
    if (modal) modal.style.display = 'none'
  }

  acceptTrade (tradeId) {
    const trade = this.pendingTrades.get(tradeId)
    if (!trade) return

    const have = this.farmState.inventory[trade.want] || 0
    if (have < trade.wantQty) {
      const wantName = CROPS[trade.want] ? CROPS[trade.want].name : trade.want
      this.showNotification('Not enough ' + wantName + ' to complete trade')
      return
    }

    // Give what they want, receive what they offer
    this.farmState.inventory[trade.want] -= trade.wantQty
    if (this.farmState.inventory[trade.want] <= 0) delete this.farmState.inventory[trade.want]
    this.farmState.inventory[trade.item] = (this.farmState.inventory[trade.item] || 0) + trade.qty

    const peer = this.network.peers.get(trade.peerKey)
    if (peer) {
      peer.channels.trade.send(JSON.stringify({ type: 'accept', tradeId }))
    }

    this.pendingTrades.delete(tradeId)
    this.closeIncomingTrade()

    const itemName = CROPS[trade.item] ? CROPS[trade.item].name : trade.item
    this.showNotification('Trade accepted! Received ' + trade.qty + ' ' + itemName)
  }

  rejectTrade (tradeId) {
    const trade = this.pendingTrades.get(tradeId)
    if (!trade) return

    const peer = this.network.peers.get(trade.peerKey)
    if (peer) {
      peer.channels.trade.send(JSON.stringify({ type: 'reject', tradeId }))
    }

    this.pendingTrades.delete(tradeId)
    this.closeIncomingTrade()
    this.showNotification('Trade rejected')
  }

  handleAccept (msg) {
    const trade = this.pendingTrades.get(msg.tradeId)
    if (!trade) return

    // Give what we offered, receive what we wanted
    this.farmState.inventory[trade.item] -= trade.qty
    if (this.farmState.inventory[trade.item] <= 0) delete this.farmState.inventory[trade.item]
    this.farmState.inventory[trade.want] = (this.farmState.inventory[trade.want] || 0) + trade.wantQty

    this.pendingTrades.delete(msg.tradeId)

    const wantName = CROPS[trade.want] ? CROPS[trade.want].name : trade.want
    this.showNotification('Trade completed! Received ' + trade.wantQty + ' ' + wantName)
  }

  handleReject (msg) {
    this.pendingTrades.delete(msg.tradeId)
    this.showNotification('Your trade offer was rejected')
  }

  showNotification (text) {
    const el = document.getElementById('trade-notification')
    if (!el) {
      console.log('[Trade]', text)
      return
    }
    el.textContent = text
    el.style.display = 'block'
    setTimeout(() => { el.style.display = 'none' }, 3000)
  }
}
