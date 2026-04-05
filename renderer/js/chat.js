// ── Chat System - Phase 5 ───────────────────────────────────────────────────
// Enhanced chat with tabs (Global, Private, System), emotes, private messaging

const EMOTES = [
  { label: 'Wave', text: 'waves hello!' },
  { label: 'Cheer', text: 'cheers!' },
  { label: 'Dance', text: 'does a happy dance!' },
  { label: 'Laugh', text: 'laughs out loud!' },
  { label: 'Clap', text: 'claps!' },
  { label: 'Thumbs Up', text: 'gives a thumbs up!' },
  { label: 'Cry', text: 'is crying...' },
  { label: 'Flex', text: 'flexes their muscles!' }
]

const ChatSystem = {
  messages: { global: [], private: [], system: [] },
  activeTab: 'global',
  privateTarget: null, // { key, name }
  maxMessages: 100,

  init () {
    this._buildTabs()
    this._buildEmoteButton()
    this._hookForm()
  },

  _buildTabs () {
    const panel = document.getElementById('chat-panel')
    if (!panel) return

    // Insert tab bar before messages
    const messagesEl = document.getElementById('chat-messages')
    if (!messagesEl) return

    const tabBar = document.createElement('div')
    tabBar.id = 'chat-tabs'
    tabBar.innerHTML = `
      <button class="chat-tab active" data-tab="global">Global</button>
      <button class="chat-tab" data-tab="private">Private</button>
      <button class="chat-tab" data-tab="system">System</button>
    `
    panel.insertBefore(tabBar, messagesEl)

    tabBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.chat-tab')
      if (!btn) return
      this.switchTab(btn.dataset.tab)
    })
  },

  _buildEmoteButton () {
    const form = document.getElementById('chat-form')
    if (!form) return

    const emoteBtn = document.createElement('button')
    emoteBtn.type = 'button'
    emoteBtn.id = 'emote-btn'
    emoteBtn.textContent = ':)'
    emoteBtn.title = 'Emotes'
    form.insertBefore(emoteBtn, form.querySelector('button[type="submit"]'))

    // Emote dropdown
    const dropdown = document.createElement('div')
    dropdown.id = 'emote-dropdown'
    dropdown.style.display = 'none'

    for (const emote of EMOTES) {
      const item = document.createElement('button')
      item.className = 'emote-item'
      item.textContent = emote.label
      item.addEventListener('click', () => {
        if (window.IPCBridge && window.IPCBridge.available) {
          window.IPCBridge.sendEmote(emote.text)
        }
        dropdown.style.display = 'none'
      })
      dropdown.appendChild(item)
    }

    form.style.position = 'relative'
    form.appendChild(dropdown)

    emoteBtn.addEventListener('click', () => {
      dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none'
    })

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#emote-btn') && !e.target.closest('#emote-dropdown')) {
        dropdown.style.display = 'none'
      }
    })
  },

  _hookForm () {
    const form = document.getElementById('chat-form')
    if (!form) return

    // Replace submit handler
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      e.stopImmediatePropagation()
      const input = document.getElementById('chat-input')
      const msg = input.value.trim()
      if (!msg) return

      this._processInput(msg)
      input.value = ''
    }, true)
  },

  _processInput (text) {
    // Handle commands
    if (text.startsWith('/w ') || text.startsWith('/whisper ')) {
      const parts = text.replace(/^\/(w|whisper)\s+/, '').split(' ')
      const targetName = parts.shift()
      const message = parts.join(' ')
      if (!message) return

      // Find neighbor by name
      const neighbors = window._p2pState?.neighbors || []
      const target = neighbors.find(n => n.name.toLowerCase() === targetName.toLowerCase())
      if (target && window.IPCBridge) {
        window.IPCBridge.sendPrivateMessage(target.key, message)
      } else {
        this.addMessage('system', 'System', 'system', 'Player "' + targetName + '" not found')
      }
      return
    }

    if (text.startsWith('/trade ')) {
      const targetName = text.replace('/trade ', '').trim()
      const neighbors = window._p2pState?.neighbors || []
      const target = neighbors.find(n => n.name.toLowerCase() === targetName.toLowerCase())
      if (target && window.TradeSystem) {
        window.TradeSystem.openTradePanel(target.key, target.name)
      } else {
        this.addMessage('system', 'System', 'system', 'Player "' + targetName + '" not found')
      }
      return
    }

    // Regular chat or private message
    if (this.activeTab === 'private' && this.privateTarget) {
      if (window.IPCBridge) {
        window.IPCBridge.sendPrivateMessage(this.privateTarget.key, text)
      }
    } else {
      if (window.IPCBridge && window.IPCBridge.available) {
        window.IPCBridge.sendChatMessage(text)
      }
    }
  },

  switchTab (tab) {
    this.activeTab = tab
    document.querySelectorAll('.chat-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab)
    })

    // Show unread indicator
    const tabBtn = document.querySelector(`.chat-tab[data-tab="${tab}"]`)
    if (tabBtn) tabBtn.classList.remove('has-unread')

    this._renderMessages()
  },

  setPrivateTarget (key, name) {
    this.privateTarget = { key, name }
    this.switchTab('private')
    const input = document.getElementById('chat-input')
    if (input) {
      input.placeholder = 'Message to ' + name + '...'
      input.focus()
    }
  },

  addMessage (channel, from, fromKey, text, timestamp) {
    const msg = {
      from: from,
      fromKey: fromKey,
      message: text,
      timestamp: timestamp || Date.now()
    }

    const ch = this.messages[channel] || this.messages.global
    ch.push(msg)
    if (ch.length > this.maxMessages) ch.shift()

    // If not on this tab, show unread indicator
    if (this.activeTab !== channel) {
      const tabBtn = document.querySelector(`.chat-tab[data-tab="${channel}"]`)
      if (tabBtn) tabBtn.classList.add('has-unread')
    }

    if (this.activeTab === channel) {
      this._renderMessages()
    }
  },

  handleIncomingMessage (data) {
    const channel = data.channel || 'global'
    this.addMessage(channel, data.from, data.fromKey, data.message, data.timestamp)
  },

  _renderMessages () {
    const messagesEl = document.getElementById('chat-messages')
    if (!messagesEl) return

    const msgs = this.messages[this.activeTab] || []
    messagesEl.innerHTML = ''

    for (const msg of msgs) {
      const div = document.createElement('div')
      div.className = 'msg'

      const time = new Date(msg.timestamp)
      const timeStr = time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0')

      const timeSpan = document.createElement('span')
      timeSpan.className = 'msg-time'
      timeSpan.textContent = timeStr + ' '
      div.appendChild(timeSpan)

      const nameSpan = document.createElement('span')
      nameSpan.className = 'msg-name'
      if (msg.from === 'System') {
        nameSpan.style.color = '#aaa'
        nameSpan.style.fontStyle = 'italic'
      } else {
        const isMe = msg.fromKey === window._p2pState?.playerKey
        nameSpan.style.color = isMe ? '#7df9ff' : '#4caf50'
        nameSpan.style.cursor = 'pointer'
        nameSpan.addEventListener('click', () => {
          if (!isMe && msg.fromKey) {
            this.setPrivateTarget(msg.fromKey, msg.from)
          }
        })
      }
      nameSpan.style.fontWeight = 'bold'
      nameSpan.textContent = msg.from + ': '
      div.appendChild(nameSpan)

      div.appendChild(document.createTextNode(msg.message))
      messagesEl.appendChild(div)
    }

    messagesEl.scrollTop = messagesEl.scrollHeight
  }
}

window.ChatSystem = ChatSystem
