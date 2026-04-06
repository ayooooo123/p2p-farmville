// ── Neighbor Management Panel - Phase 5 ────────────────────────────────────
// Full neighbor list with actions: Visit, Chat, Trade, Send Gift

const NeighborPanel = {
  panelOpen: false,
  neighbors: [],
  sortBy: 'name', // 'name', 'level', 'online'

  init () {
    this._hookButtons()
  },

  _hookButtons () {
    const closeBtn = document.getElementById('nbr-panel-close-btn')
    if (closeBtn) closeBtn.addEventListener('click', () => this.closePanel())

    const sortBtns = document.querySelectorAll('.nbr-sort-btn')
    sortBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.sortBy = btn.dataset.sort
        sortBtns.forEach(b => b.classList.toggle('active', b === btn))
        this._renderList()
      })
    })
  },

  openPanel () {
    this.panelOpen = true
    const panel = document.getElementById('nbr-full-panel')
    if (panel) panel.classList.add('visible')
    this._renderList()
  },

  closePanel () {
    this.panelOpen = false
    const panel = document.getElementById('nbr-full-panel')
    if (panel) panel.classList.remove('visible')
  },

  updateNeighbors (neighborList) {
    this.neighbors = neighborList || []
    if (this.panelOpen) this._renderList()

    // Also update the mini neighbor panel in the HUD
    this._updateMiniPanel()
  },

  _getSortedNeighbors () {
    const sorted = [...this.neighbors]
    switch (this.sortBy) {
      case 'name':
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        break
      case 'level':
        sorted.sort((a, b) => (b.farmState?.level || 1) - (a.farmState?.level || 1))
        break
      case 'online':
        sorted.sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0))
        break
    }
    return sorted
  },

  _renderList () {
    const list = document.getElementById('nbr-full-list')
    if (!list) return

    list.innerHTML = ''
    const sorted = this._getSortedNeighbors()

    if (sorted.length === 0) {
      list.innerHTML = '<div class="nbr-empty">No neighbors discovered yet. Keep playing and peers will join!</div>'
      return
    }

    for (const neighbor of sorted) {
      const card = document.createElement('div')
      card.className = 'nbr-card'

      const level = neighbor.farmState?.level || 1
      const isOnline = neighbor.online !== false

      card.innerHTML = `
        <div class="nbr-card-header">
          <div class="nbr-status ${isOnline ? 'online' : 'offline'}"></div>
          <div class="nbr-card-name">${neighbor.name || 'Unknown'}</div>
          <div class="nbr-card-level">Lv. ${level}</div>
        </div>
        <div class="nbr-card-actions">
          <button class="nbr-action-btn nbr-visit" title="Visit farm">Visit</button>
          <button class="nbr-action-btn nbr-chat" title="Private message">Chat</button>
          <button class="nbr-action-btn nbr-trade" title="Trade items">Trade</button>
          <button class="nbr-action-btn nbr-gift" title="Send gift">Gift</button>
        </div>
      `

      card.querySelector('.nbr-visit').addEventListener('click', () => {
        this._visitNeighbor(neighbor)
      })

      card.querySelector('.nbr-chat').addEventListener('click', () => {
        if (window.ChatSystem) {
          window.ChatSystem.setPrivateTarget(neighbor.key, neighbor.name)
        }
        this.closePanel()
      })

      card.querySelector('.nbr-trade').addEventListener('click', () => {
        if (window.TradeSystem) {
          window.TradeSystem.openTradePanel(neighbor.key, neighbor.name)
        }
        this.closePanel()
      })

      card.querySelector('.nbr-gift').addEventListener('click', () => {
        if (window.GiftSystem) {
          window.GiftSystem.openGiftPanel(neighbor.key, neighbor.name)
        }
        this.closePanel()
      })

      list.appendChild(card)
    }
  },

  _visitNeighbor (neighbor) {
    if (window.PlayerController) {
      window.PlayerController.setVisitingNeighbor(neighbor.key, neighbor.name)
    }
    this.closePanel()
  },

  _updateMiniPanel () {
    const neighborList = document.getElementById('neighbor-list')
    const neighborCountEl = document.getElementById('neighbor-count')
    const neighborPanel = document.getElementById('neighbor-panel')

    if (!neighborPanel || !neighborList || !neighborCountEl) return

    const neighbors = this.neighbors
    neighborCountEl.textContent = neighbors.length

    if (neighbors.length === 0) {
      neighborPanel.style.display = 'none'
      return
    }

    neighborPanel.style.display = 'flex'
    neighborList.innerHTML = ''

    for (const neighbor of neighbors) {
      const entry = document.createElement('div')
      entry.className = 'neighbor-entry'

      const isOnline = neighbor.online !== false

      const statusDot = document.createElement('span')
      statusDot.className = 'nbr-mini-status ' + (isOnline ? 'online' : 'offline')
      entry.appendChild(statusDot)

      const nameEl = document.createElement('span')
      nameEl.className = 'neighbor-name'
      nameEl.textContent = neighbor.name || 'Unknown'
      entry.appendChild(nameEl)

      const visitBtn = document.createElement('button')
      visitBtn.className = 'neighbor-visit-btn'
      visitBtn.textContent = 'Visit'
      visitBtn.addEventListener('click', () => this._visitNeighbor(neighbor))
      entry.appendChild(visitBtn)

      neighborList.appendChild(entry)
    }
  }
}

window.NeighborPanel = NeighborPanel
