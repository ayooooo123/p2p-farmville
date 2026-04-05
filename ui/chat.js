class FarmChat {
  constructor (network) {
    this.network = network
    this.messages = []
    this.panel = document.getElementById('chat-messages')
    this.form = document.getElementById('chat-form')
    this.input = document.getElementById('chat-input')

    this.form.addEventListener('submit', (e) => {
      e.preventDefault()
      const text = this.input.value.trim()
      if (!text) return
      this.send(text)
      this.input.value = ''
    })

    this.network.onChatMessage = (peerKey, msg) => {
      this.addMessage(msg.sender, msg.text)
    }
  }

  send (text) {
    this.network.sendChatMessage(window.playerName, text)
    this.addMessage(window.playerName, text)
  }

  addMessage (sender, text) {
    const div = document.createElement('div')
    div.textContent = '[' + sender + '] ' + text
    this.panel.appendChild(div)
    this.panel.scrollTop = this.panel.scrollHeight
  }
}
