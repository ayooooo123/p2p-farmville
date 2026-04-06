// ── Gift System - Phase 5 ───────────────────────────────────────────────────
// Send/receive gifts with daily limits, notification inbox

const GiftSystem = {
  giftsSentToday: 0,
  dailyLimit: 5,
  inbox: [],
  panelOpen: false,
  currentTarget: null,

  init () {
    this._hookButtons()
  },

  _hookButtons () {
    const closeBtn = document.getElementById('gift-close-btn')
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeGiftPanel())

    const sendBtn = document.getElementById('gift-send-btn')
    if (sendBtn) sendBtn.addEventListener('click', () => this._sendGift())

    const inboxBtn = document.getElementById('gift-inbox-btn')
    if (inboxBtn) inboxBtn.addEventListener('click', () => this._toggleInbox())
  },

  openGiftPanel (targetKey, targetName) {
    this.currentTarget = { key: targetKey, name: targetName }
    this.panelOpen = true

    const panel = document.getElementById('gift-panel')
    if (!panel) return

    const title = document.getElementById('gift-target-name')
    if (title) title.textContent = 'Send Gift to ' + targetName

    const counter = document.getElementById('gift-daily-counter')
    if (counter) counter.textContent = 'Gifts today: ' + this.giftsSentToday + '/' + this.dailyLimit

    this._populateGiftItems()
    panel.classList.add('visible')
  },

  closeGiftPanel () {
    this.panelOpen = false
    this.currentTarget = null
    const panel = document.getElementById('gift-panel')
    if (panel) panel.classList.remove('visible')
  },

  _populateGiftItems () {
    const container = document.getElementById('gift-item-grid')
    if (!container) return

    container.innerHTML = ''
    const inventory = window._getInventory ? window._getInventory() : []

    if (inventory.length === 0) {
      container.innerHTML = '<div class="gift-empty">No items to gift</div>'
      return
    }

    for (const item of inventory) {
      const el = document.createElement('div')
      el.className = 'gift-item-card'
      el.dataset.itemId = item.id
      el.dataset.qty = '0'

      el.innerHTML = `
        <div class="gift-item-name">${item.meta?.name || item.id}</div>
        <div class="gift-item-have">Have: ${item.qty}</div>
        <div class="gift-item-controls">
          <button class="gift-qty-btn minus">-</button>
          <span class="gift-qty-val">0</span>
          <button class="gift-qty-btn plus">+</button>
        </div>
      `

      const minusBtn = el.querySelector('.minus')
      const plusBtn = el.querySelector('.plus')
      const qtyVal = el.querySelector('.gift-qty-val')

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

  _sendGift () {
    if (!this.currentTarget || !window.IPCBridge) return

    if (this.giftsSentToday >= this.dailyLimit) {
      window._showFeedback && window._showFeedback('Daily gift limit reached!', '#ff4444')
      return
    }

    const cards = document.querySelectorAll('#gift-item-grid .gift-item-card')
    const items = []
    cards.forEach(card => {
      const qty = parseInt(card.dataset.qty)
      if (qty > 0) items.push({ id: card.dataset.itemId, qty: qty })
    })

    if (items.length === 0) {
      window._showFeedback && window._showFeedback('Select items to gift!', '#ff4444')
      return
    }

    const msgInput = document.getElementById('gift-message-input')
    const message = msgInput ? msgInput.value.trim() : ''

    window.IPCBridge.sendGift(this.currentTarget.key, items, message)
    this.giftsSentToday++

    // Remove items from local inventory
    for (const item of items) {
      window._removeItem && window._removeItem(item.id, item.qty)
    }

    window._showFeedback && window._showFeedback('Gift sent to ' + this.currentTarget.name + '!', '#4caf50')

    const counter = document.getElementById('gift-daily-counter')
    if (counter) counter.textContent = 'Gifts today: ' + this.giftsSentToday + '/' + this.dailyLimit

    this.closeGiftPanel()
  },

  handleGiftReceived (data) {
    this.inbox.push({
      from: data.from,
      fromKey: data.fromKey,
      items: data.items,
      message: data.message,
      timestamp: Date.now()
    })

    // Add items to inventory
    if (data.items) {
      for (const item of data.items) {
        window._addItem && window._addItem(item.id, item.qty, { name: item.id.replace(/_/g, ' '), type: 'gift' })
      }
    }

    this._showGiftNotification(data)
    this._updateInboxBadge()
    this._animateGiftReceived()
  },

  handleGiftSent (data) {
    if (data.remaining !== undefined) {
      this.giftsSentToday = this.dailyLimit - data.remaining
    }
  },

  _showGiftNotification (data) {
    const notifArea = document.getElementById('notification-area')
    if (!notifArea) return

    const notif = document.createElement('div')
    notif.className = 'notification gift-notification'
    notif.innerHTML = `
      <div class="notif-icon">&#127873;</div>
      <div class="notif-content">
        <div class="notif-title">Gift from ${data.from}!</div>
        <div class="notif-detail">
          ${(data.items || []).map(i => i.id.replace(/_/g, ' ') + ' x' + i.qty).join(', ')}
          ${data.message ? '<br><em>"' + data.message + '"</em>' : ''}
        </div>
      </div>
    `

    notifArea.appendChild(notif)
    setTimeout(() => { if (notif.parentNode) notif.remove() }, 8000)
  },

  _animateGiftReceived () {
    const giftAnim = document.getElementById('gift-animation')
    if (!giftAnim) return

    giftAnim.style.display = 'flex'
    giftAnim.classList.add('show')

    setTimeout(() => {
      giftAnim.classList.remove('show')
      setTimeout(() => { giftAnim.style.display = 'none' }, 500)
    }, 2500)
  },

  _toggleInbox () {
    const inboxPanel = document.getElementById('gift-inbox')
    if (!inboxPanel) return

    const isVisible = inboxPanel.style.display !== 'none'
    inboxPanel.style.display = isVisible ? 'none' : 'block'

    if (!isVisible) {
      this._renderInbox()
    }
  },

  _renderInbox () {
    const inboxPanel = document.getElementById('gift-inbox')
    if (!inboxPanel) return

    inboxPanel.innerHTML = ''

    if (this.inbox.length === 0) {
      inboxPanel.innerHTML = '<div class="gift-empty">No gifts received</div>'
      return
    }

    // Show most recent first
    const sorted = [...this.inbox].reverse()
    for (const gift of sorted) {
      const el = document.createElement('div')
      el.className = 'gift-inbox-entry'
      const time = new Date(gift.timestamp)
      const timeStr = time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0')
      el.innerHTML = `
        <div class="gift-inbox-from">${gift.from} <span class="gift-inbox-time">${timeStr}</span></div>
        <div class="gift-inbox-items">${(gift.items || []).map(i => i.id.replace(/_/g, ' ') + ' x' + i.qty).join(', ')}</div>
        ${gift.message ? '<div class="gift-inbox-msg">"' + gift.message + '"</div>' : ''}
      `
      inboxPanel.appendChild(el)
    }
  },

  _updateInboxBadge () {
    const badge = document.getElementById('gift-inbox-badge')
    if (badge) {
      badge.textContent = this.inbox.length
      badge.style.display = this.inbox.length > 0 ? 'inline-block' : 'none'
    }
  }
}

window.GiftSystem = GiftSystem
