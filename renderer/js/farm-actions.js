// renderer/js/farm-actions.js
// Safe farm action protocol — handles both sides (host and visitor)

const VISITOR_REWARDS = {
  water:   { xp: 2,  coins: 0  },
  harvest: { xp: 5,  coins: 10 },
  feed:    { xp: 3,  coins: 0  }
}

const ONLINE_MODE_KEY = 'p2p-farmville-online-mode'

export const FarmActions = {
  // Online mode: which actions visitors are allowed to perform on YOUR farm
  onlineMode: JSON.parse(localStorage.getItem(ONLINE_MODE_KEY) || '{"water":true,"harvest":false,"feed":true}'),

  saveOnlineMode () {
    localStorage.setItem(ONLINE_MODE_KEY, JSON.stringify(this.onlineMode))
  },

  setPermission (action, allowed) {
    this.onlineMode[action] = allowed
    this.saveOnlineMode()
  },

  isPermitted (action) {
    return !!this.onlineMode[action]
  },

  // Called by renderer when a visitor-farm-action arrives from worker
  // farmState = { plots, animals }, gameState = { coins, xp, ... }
  handleVisitorAction (msg, farmState, gameState, onSuccess) {
    const { action, targetId, visitorKey, visitorName } = msg

    // Check online mode permission
    if (!this.isPermitted(action)) {
      window.IPCBridge?.sendToWorker({
        type: 'visitor-action-result',
        visitorKey,
        action,
        targetId,
        success: false,
        reason: 'action_not_permitted'
      })
      return
    }

    let success = false
    let reason = null

    if (action === 'water') {
      const plot = farmState.plots?.[targetId]
      if (!plot?.crop) { reason = 'no_crop' }
      else if (plot.crop.watered) { reason = 'already_watered' }
      else if (plot.crop.withered) { reason = 'withered' }
      else if (plot.crop.stage >= (plot.crop.maxStage || 3)) { reason = 'mature' }
      else {
        plot.crop.watered = true
        success = true
      }
    } else if (action === 'harvest') {
      const plot = farmState.plots?.[targetId]
      if (!plot?.crop) { reason = 'no_crop' }
      else if (plot.crop.withered) { reason = 'withered' }
      else {
        const maxStage = plot.crop.maxStage || 3
        if (plot.crop.stage < maxStage) { reason = 'not_ready' }
        else {
          // Remove crop from plot, host gets the produce
          plot.crop = null
          success = true
        }
      }
    } else if (action === 'feed') {
      const animal = farmState.animals?.find(a => a.id === targetId)
      if (!animal) { reason = 'no_animal' }
      else if (animal.fed) { reason = 'already_fed' }
      else {
        animal.fed = true
        animal.lastFed = Date.now()
        success = true
      }
    } else {
      reason = 'unknown_action'
    }

    const reward = success ? VISITOR_REWARDS[action] : null

    window.IPCBridge?.sendToWorker({
      type: 'visitor-action-result',
      visitorKey,
      action,
      targetId,
      success,
      reason,
      reward
    })

    if (success) {
      onSuccess?.({ action, targetId, visitorName, reward })
    }
  },

  // Called when we receive a farm-action-result (we were the visitor)
  handleActionResult (msg, onResult) {
    onResult?.(msg)
  },

  // Send an action to a neighbor's farm (we are visiting)
  sendAction (targetKey, action, targetId) {
    window.IPCBridge?.sendToWorker({
      type: 'send-farm-action',
      targetKey,
      action,
      targetId
    })
  },

  // Render the online mode settings panel content (returns HTML string)
  renderSettingsHTML () {
    return `
      <div class="online-mode-settings">
        <h3>Online Mode \u2014 Allow Visitors To:</h3>
        <label><input type="checkbox" id="om-water" ${this.onlineMode.water ? 'checked' : ''}> Water your crops</label>
        <label><input type="checkbox" id="om-harvest" ${this.onlineMode.harvest ? 'checked' : ''}> Harvest mature crops (you keep produce)</label>
        <label><input type="checkbox" id="om-feed" ${this.onlineMode.feed ? 'checked' : ''}> Feed your animals</label>
      </div>
    `
  },

  bindSettingsPanel () {
    document.getElementById('om-water')?.addEventListener('change', e => this.setPermission('water', e.target.checked))
    document.getElementById('om-harvest')?.addEventListener('change', e => this.setPermission('harvest', e.target.checked))
    document.getElementById('om-feed')?.addEventListener('change', e => this.setPermission('feed', e.target.checked))
  }
}

export default FarmActions
