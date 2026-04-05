// P2P chat - stub for M4
class FarmChat {
  constructor (network) {
    this.network = network
    this.messages = []
  }

  send (text) {
    console.log('Chat send - not yet implemented')
  }

  addMessage (sender, text) {
    const panel = document.getElementById('chat-messages')
    if (!panel) return
    const div = document.createElement('div')
    div.textContent = '[' + sender + '] ' + text
    panel.appendChild(div)
    panel.scrollTop = panel.scrollHeight
  }
}
