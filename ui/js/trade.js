// ── Trade System - Phase 5 ──────────────────────────────────────────────────
// P2P item trading with offer/accept/reject/cancel flow

const TradeSystem = {
  pendingTrades: new Map(), // tradeId -> trade object
  tradeHistory: [],
  panelOpen: false,
  currentTarget: null, // { key, name }

  init () {
    this._hookButtons()
  },

  _hookButtons () {
    const closeBtn = document.getElementById('trade-close-btn')
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeTradePanel())

    const sendBtn = document.getElementById('trade-send-btn')
    if (sendBtn) sendBtn.addEventListener('click', () => this._sendOffer())

    const cancelBtn = document.getElementById('trade-cancel-btn')
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeTradePanel())
  },

  openTradePanel (targetKey, targetName) {
    this.currentTarget = { key: targetKey, name: targetName }
    this.panelOpen = true

    const panel = document.getElementById('trade-panel')
    if (!panel) return

    const title = document.getElementById('trade-target-name')
    if (title) title.textContent = 'Trade with ' + targetName

    // Clear item lists
    this._clearSelections()
    this._populateInventorySelector('trade-offer-items', 'offer')
    this._populateWantSelector()

    panel.classList.add('visible')

    // Also show pending trades
    this._renderPendingTrades()
  },

  closeTradePanel () {
    this.panelOpen = false
    this.currentTarget = null
    const panel = document.getElementById('trade-panel')
    if (panel) panel.classList.remove('visible')
  },

  _clearSelections () {
    const offerGrid = document.getElementById('trade-offer-items')
    if (offerGrid) offerGrid.innerHTML = ''
    const wantGrid = document.getElementById('trade-want-items')
    if (wantGrid) wantGrid.innerHTML = ''
  },

  _populateInventorySelector (containerId, mode) {
    const container = document.getElementById(containerId)
    if (!container) return

    container.innerHTML = ''
    const inventory = window._getInventory ? window._getInventory() : []

    if (inventory.length === 0) {
      container.innerHTML = '<div class="trade-empty">No items in inventory</div>'
      return
    }

    for (const item of inventory) {
      const el = document.createElement('div')
      el.className = 'trade-item-card'
      el.dataset.itemId = item.id
      el.dataset.selected = '0'
      el.dataset.qty = '0'

      el.innerHTML = `
        <div class="trade-item-name">${item.meta?.name || item.id}</div>
        <div class="trade-item-qty">Have: ${item.qty}</div>
        <div class="trade-item-controls">
          <button class="trade-qty-btn minus">-</button>
          <span class="trade-qty-val">0</span>
          <button class="trade-qty-btn plus">+</button>
        </div>
      `

      const minusBtn = el.querySelector('.minus')
      const plusBtn = el.querySelector('.plus')
      const qtyVal = el.querySelector('.trade-qty-val')

      plusBtn.addEventListener('click', () => {
        let q = parseInt(el.dataset.qty)
        if (q < item.qty) {
          q++
          el.dataset.qty = q
          qtyVal.textContent = q
          el.classList.toggle('selected', q > 0)
        }
      })

      minusBtn.addEventListener('click', () => {
        let q = parseInt(el.dataset.qty)
        if (q > 0) {
          q--
          el.dataset.qty = q
          qtyVal.textContent = q
          el.classList.toggle('selected', q > 0)
        }
      })

      container.appendChild(el)
    }
  },

  _populateWantSelector () {
    const container = document.getElementById('trade-want-items')
    if (!container) return

    container.innerHTML = ''

    // Add a text input for specifying wanted items
    const addRow = document.createElement('div')
    addRow.className = 'trade-want-add'
    addRow.innerHTML = `
      <input type="text" id="trade-want-input" placeholder="Item name..." class="trade-want-field">
      <input type="number" id="trade-want-qty-input" value="1" min="1" max="99" class="trade-want-qty-field">
      <button id="trade-want-add-btn" class="trade-want-add-btn">Add</button>
    `
    container.appendChild(addRow)

    const wantList = document.createElement('div')
    wantList.id = 'trade-want-list'
    container.appendChild(wantList)

    const addBtn = addRow.querySelector('#trade-want-add-btn')
    addBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('trade-want-input')
      const qtyInput = document.getElementById('trade-want-qty-input')
      const name = nameInput.value.trim()
      const qty = parseInt(qtyInput.value) || 1
      if (!name) return

      const item = document.createElement('div')
      item.className = 'trade-want-entry'
      item.dataset.itemId = name.toLowerCase().replace(/\s+/g, '_')
      item.dataset.qty = qty
      item.innerHTML = `
        <span>${name} x${qty}</span>
        <button class="trade-want-remove">X</button>
      `
      item.querySelector('.trade-want-remove').addEventListener('click', () => item.remove())
      wantList.appendChild(item)

      nameInput.value = ''
      qtyInput.value = '1'
    })
  },

  _sendOffer () {
    if (!this.currentTarget || !window.IPCBridge) return

    // Collect offered items
    const offerCards = document.querySelectorAll('#trade-offer-items .trade-item-card')
    const items = []
    offerCards.forEach(card => {
      const qty = parseInt(card.dataset.qty)
      if (qty > 0) {
        items.push({ id: card.dataset.itemId, qty: qty })
      }
    })

    // Collect wanted items
    const wantEntries = document.querySelectorAll('#trade-want-list .trade-want-entry')
    const wants = []
    wantEntries.forEach(entry => {
      wants.push({ id: entry.dataset.itemId, qty: parseInt(entry.dataset.qty) })
    })

    if (items.length === 0 && wants.length === 0) {
      window._showFeedback && window._showFeedback('Add items to trade!', '#ff4444')
      return
    }

    window.IPCBridge.sendTradeOffer(this.currentTarget.key, items, wants)
    window._showFeedback && window._showFeedback('Trade offer sent to ' + this.currentTarget.name, '#4caf50')
    this.closeTradePanel()
  },

  // Called when we receive a trade offer
  handleTradeOffer (trade) {
    this.pendingTrades.set(trade.id, trade)
    this._renderPendingTrades()
    this._showTradeNotification(trade)
  },

  // Called when a trade result comes in
  handleTradeResult (data) {
    const trade = this.pendingTrades.get(data.tradeId)
    if (trade) {
      trade.status = data.accepted ? 'accepted' : 'rejected'
      this.tradeHistory.push(trade)
      this.pendingTrades.delete(data.tradeId)

      if (data.accepted) {
        window._showFeedback && window._showFeedback('Trade accepted!', '#4caf50')
        // Items are handled by the worker/inventory sync
      } else {
        window._showFeedback && window._showFeedback('Trade rejected', '#ff4444')
      }
    }
    this._renderPendingTrades()
  },

  handleTradeCancelled (data) {
    this.pendingTrades.delete(data.tradeId)
    this._renderPendingTrades()
    window._showFeedback && window._showFeedback('Trade cancelled', '#ffa500')
  },

  _showTradeNotification (trade) {
    const notifArea = document.getElementById('notification-area')
    if (!notifArea) return

    const notif = document.createElement('div')
    notif.className = 'notification trade-notification'
    notif.innerHTML = `
      <div class="notif-icon">&#9878;</div>
      <div class="notif-content">
        <div class="notif-title">Trade Offer from ${trade.from}</div>
        <div class="notif-detail">
          Offering: ${(trade.items || []).map(i => i.id + ' x' + i.qty).join(', ') || 'nothing'}<br>
          Wants: ${(trade.wants || []).map(i => i.id + ' x' + i.qty).join(', ') || 'nothing'}
        </div>
        <div class="notif-actions">
          <button class="notif-accept">Accept</button>
          <button class="notif-reject">Reject</button>
        </div>
      </div>
    `

    notif.querySelector('.notif-accept').addEventListener('click', () => {
      window.IPCBridge.respondToTrade(trade.id, true)
      notif.remove()
    })

    notif.querySelector('.notif-reject').addEventListener('click', () => {
      window.IPCBridge.respondToTrade(trade.id, false)
      notif.remove()
    })

    notifArea.appendChild(notif)

    // Auto-remove after 30s
    setTimeout(() => { if (notif.parentNode) notif.remove() }, 30000)
  },

  _renderPendingTrades () {
    const container = document.getElementById('trade-pending-list')
    if (!container) return

    container.innerHTML = ''
    if (this.pendingTrades.size === 0) {
      container.innerHTML = '<div class="trade-empty">No pending trades</div>'
      return
    }

    for (const [id, trade] of this.pendingTrades) {
      const el = document.createElement('div')
      el.className = 'trade-pending-entry'
      const isIncoming = trade.toKey === window._p2pState?.playerKey
      el.innerHTML = `
        <div class="trade-pending-info">
          <strong>${isIncoming ? 'From' : 'To'}: ${isIncoming ? trade.from : trade.to}</strong>
          <div>Offer: ${(trade.items || []).map(i => i.id + ' x' + i.qty).join(', ') || 'nothing'}</div>
          <div>Want: ${(trade.wants || []).map(i => i.id + ' x' + i.qty).join(', ') || 'nothing'}</div>
        </div>
        <div class="trade-pending-actions">
          ${isIncoming ? '<button class="trade-accept-btn">Accept</button><button class="trade-reject-btn">Reject</button>' : '<button class="trade-cancel-pending-btn">Cancel</button>'}
        </div>
      `

      if (isIncoming) {
        el.querySelector('.trade-accept-btn').addEventListener('click', () => {
          window.IPCBridge.respondToTrade(id, true)
        })
        el.querySelector('.trade-reject-btn').addEventListener('click', () => {
          window.IPCBridge.respondToTrade(id, false)
        })
      } else {
        el.querySelector('.trade-cancel-pending-btn').addEventListener('click', () => {
          window.IPCBridge.cancelTrade(id)
        })
      }

      container.appendChild(el)
    }
  }
}

window.TradeSystem = TradeSystem
