// ── Co-op Farming System - Phase 5 ──────────────────────────────────────────
// Joint missions where multiple farmers contribute crops for shared rewards

const CoopSystem = {
  missions: [],
  panelOpen: false,

  init () {
    this._hookButtons()
  },

  _hookButtons () {
    const closeBtn = document.getElementById('coop-close-btn')
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeCoopPanel())

    const createBtn = document.getElementById('coop-create-btn')
    if (createBtn) createBtn.addEventListener('click', () => this._showCreateForm())

    const submitBtn = document.getElementById('coop-submit-create')
    if (submitBtn) submitBtn.addEventListener('click', () => this._createMission())

    const cancelCreateBtn = document.getElementById('coop-cancel-create')
    if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', () => this._hideCreateForm())
  },

  openCoopPanel () {
    this.panelOpen = true
    const panel = document.getElementById('coop-panel')
    if (panel) panel.classList.add('visible')
    this._renderMissions()
  },

  closeCoopPanel () {
    this.panelOpen = false
    const panel = document.getElementById('coop-panel')
    if (panel) panel.classList.remove('visible')
  },

  handleCoopUpdate (missions) {
    this.missions = missions || []
    if (this.panelOpen) this._renderMissions()

    // Check for completed missions
    for (const m of this.missions) {
      if (m.status === 'completed' && !m._celebrated) {
        m._celebrated = true
        this._celebrateCompletion(m)
      }
    }
  },

  _renderMissions () {
    const list = document.getElementById('coop-mission-list')
    if (!list) return

    list.innerHTML = ''
    const active = this.missions.filter(m => m.status === 'active')
    const completed = this.missions.filter(m => m.status === 'completed')

    if (active.length === 0 && completed.length === 0) {
      list.innerHTML = '<div class="coop-empty">No active missions. Create one!</div>'
      return
    }

    // Active missions
    for (const mission of active) {
      list.appendChild(this._createMissionCard(mission, false))
    }

    // Completed missions
    for (const mission of completed) {
      list.appendChild(this._createMissionCard(mission, true))
    }
  },

  _createMissionCard (mission, isCompleted) {
    const card = document.createElement('div')
    card.className = 'coop-mission-card' + (isCompleted ? ' completed' : '')

    const progress = Math.min(1, (mission.currentQty || 0) / mission.targetQty)
    const pct = Math.round(progress * 100)
    const cropName = (mission.cropType || 'unknown').replace(/_/g, ' ')

    card.innerHTML = `
      <div class="coop-mission-header">
        <div class="coop-mission-title">${isCompleted ? 'COMPLETED: ' : ''}${cropName} Drive</div>
        <div class="coop-mission-creator">by ${mission.creatorName || 'Unknown'}</div>
      </div>
      <div class="coop-mission-progress">
        <div class="coop-progress-bar">
          <div class="coop-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="coop-progress-text">${mission.currentQty || 0} / ${mission.targetQty} ${cropName}</div>
      </div>
      <div class="coop-mission-reward">Reward: ${mission.reward || 0} coins per contributor</div>
      <div class="coop-mission-contributors">
        <strong>Contributors (${(mission.contributors || []).length}):</strong>
        ${(mission.contributors || []).map(c => '<span class="coop-contributor">' + c.name + ' (' + c.amount + ')</span>').join(', ') || ' None yet'}
      </div>
      ${!isCompleted ? '<div class="coop-mission-actions"><button class="coop-contribute-btn" data-mission-id="' + mission.missionId + '">Contribute</button></div>' : ''}
    `

    if (!isCompleted) {
      const contributeBtn = card.querySelector('.coop-contribute-btn')
      if (contributeBtn) {
        contributeBtn.addEventListener('click', () => {
          this._showContributeDialog(mission)
        })
      }
    }

    return card
  },

  _showCreateForm () {
    const form = document.getElementById('coop-create-form')
    if (form) form.style.display = 'flex'
  },

  _hideCreateForm () {
    const form = document.getElementById('coop-create-form')
    if (form) form.style.display = 'none'
  },

  _createMission () {
    const cropInput = document.getElementById('coop-crop-type')
    const qtyInput = document.getElementById('coop-target-qty')
    const rewardInput = document.getElementById('coop-reward')

    const cropType = cropInput ? cropInput.value.trim().toLowerCase().replace(/\s+/g, '_') : ''
    const targetQty = qtyInput ? parseInt(qtyInput.value) : 0
    const reward = rewardInput ? parseInt(rewardInput.value) : 0

    if (!cropType || targetQty <= 0) {
      window._showFeedback && window._showFeedback('Fill in crop type and quantity!', '#ff4444')
      return
    }

    if (window.IPCBridge) {
      window.IPCBridge.createCoopMission(cropType, targetQty, reward)
    }

    this._hideCreateForm()
    window._showFeedback && window._showFeedback('Co-op mission created!', '#4caf50')

    // Clear inputs
    if (cropInput) cropInput.value = ''
    if (qtyInput) qtyInput.value = ''
    if (rewardInput) rewardInput.value = ''
  },

  _showContributeDialog (mission) {
    const cropName = (mission.cropType || 'unknown').replace(/_/g, ' ')
    const remaining = mission.targetQty - (mission.currentQty || 0)

    // Check inventory for this crop
    const available = window._getItemQty ? window._getItemQty(mission.cropType) : 0

    if (available <= 0) {
      window._showFeedback && window._showFeedback('You don\'t have any ' + cropName + '!', '#ff4444')
      return
    }

    const amount = Math.min(available, remaining)

    // Remove from inventory and contribute
    if (window._removeItem) {
      window._removeItem(mission.cropType, amount)
    }

    if (window.IPCBridge) {
      window.IPCBridge.contributeToCoopMission(mission.missionId, amount)
    }

    window._showFeedback && window._showFeedback('Contributed ' + amount + ' ' + cropName + '!', '#4caf50')
  },

  _celebrateCompletion (mission) {
    const cropName = (mission.cropType || 'unknown').replace(/_/g, ' ')
    window._showFeedback && window._showFeedback('Co-op mission complete! ' + cropName + ' drive finished!', '#ffd700')

    // Show celebration notification
    const notifArea = document.getElementById('notification-area')
    if (!notifArea) return

    const notif = document.createElement('div')
    notif.className = 'notification coop-notification'
    notif.innerHTML = `
      <div class="notif-icon">&#127942;</div>
      <div class="notif-content">
        <div class="notif-title">Mission Complete!</div>
        <div class="notif-detail">${cropName} drive completed by ${(mission.contributors || []).length} farmers!</div>
      </div>
    `

    notifArea.appendChild(notif)
    setTimeout(() => { if (notif.parentNode) notif.remove() }, 8000)
  }
}

window.CoopSystem = CoopSystem
