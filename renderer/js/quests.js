// Daily quest system — 3 quests per day drawn from a pool
// Progress persists in localStorage, resets daily

const QUEST_SAVE_KEY = 'p2p-farmville-quests'

const QUEST_POOL = [
  { id: 'water_10',     type: 'water',   target: 10,  desc: 'Water 10 crops',           reward: { coins: 50,  xp: 10 }, difficulty: 'easy' },
  { id: 'harvest_5',   type: 'harvest', target: 5,   desc: 'Harvest 5 crops',           reward: { coins: 80,  xp: 15 }, difficulty: 'easy' },
  { id: 'plant_8',     type: 'plant',   target: 8,   desc: 'Plant 8 seeds',             reward: { coins: 60,  xp: 12 }, difficulty: 'easy' },
  { id: 'harvest_wheat_3', type: 'harvest_type', cropType: 'wheat', target: 3, desc: 'Harvest 3 Wheat', reward: { coins: 70, xp: 12 }, difficulty: 'easy' },
  { id: 'earn_500',    type: 'earn',    target: 500, desc: 'Earn 500 coins from sales', reward: { coins: 150, xp: 30 }, difficulty: 'medium' },
  { id: 'harvest_15',  type: 'harvest', target: 15,  desc: 'Harvest 15 crops',          reward: { coins: 200, xp: 40 }, difficulty: 'medium' },
  { id: 'water_25',    type: 'water',   target: 25,  desc: 'Water 25 crops',            reward: { coins: 180, xp: 35 }, difficulty: 'medium' },
  { id: 'plant_20',    type: 'plant',   target: 20,  desc: 'Plant 20 seeds',            reward: { coins: 160, xp: 32 }, difficulty: 'medium' },
  { id: 'earn_2000',   type: 'earn',    target: 2000, desc: 'Earn 2000 coins',          reward: { coins: 500, xp: 75 }, difficulty: 'hard' },
  { id: 'harvest_30',  type: 'harvest', target: 30,  desc: 'Harvest 30 crops',          reward: { coins: 450, xp: 70 }, difficulty: 'hard' },
  { id: 'harvest_corn_5', type: 'harvest_type', cropType: 'corn', target: 5, desc: 'Harvest 5 Corn', reward: { coins: 300, xp: 50 }, difficulty: 'medium' },
  { id: 'harvest_tomato_3', type: 'harvest_type', cropType: 'tomato', target: 3, desc: 'Harvest 3 Tomatoes', reward: { coins: 250, xp: 45 }, difficulty: 'medium' },
  { id: 'plow_10',     type: 'plow',    target: 10,  desc: 'Plow 10 plots',             reward: { coins: 40,  xp: 8  }, difficulty: 'easy' },
  { id: 'sell_items_5', type: 'sell',   target: 5,   desc: 'Sell 5 items',              reward: { coins: 100, xp: 20 }, difficulty: 'easy' },
  { id: 'harvest_50',  type: 'harvest', target: 50,  desc: 'Harvest 50 crops (big day!)', reward: { coins: 800, xp: 120 }, difficulty: 'hard' }
]

const STREAK_MULTIPLIERS = [1, 1, 1.25, 1.25, 1.5, 1.5, 2] // days 1-7+

export const QuestSystem = {
  dailyQuests: [],   // today's 3 active quests
  streak: 0,
  lastCompletedDay: null,
  completedToday: 0,

  init () {
    this._load()
    this._checkReset()
    if (this.dailyQuests.length === 0) this._rollNewDay()
    this._renderPanel()
  },

  _todayKey () {
    return new Date().toDateString()
  },

  _load () {
    try {
      const raw = localStorage.getItem(QUEST_SAVE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      this.dailyQuests = data.dailyQuests || []
      this.streak = data.streak || 0
      this.lastCompletedDay = data.lastCompletedDay || null
      this.completedToday = data.completedToday || 0
    } catch (e) { /* ignore */ }
  },

  _save () {
    localStorage.setItem(QUEST_SAVE_KEY, JSON.stringify({
      dailyQuests: this.dailyQuests,
      streak: this.streak,
      lastCompletedDay: this.lastCompletedDay,
      completedToday: this.completedToday,
      rolledDay: this._todayKey()
    }))
  },

  _checkReset () {
    try {
      const raw = localStorage.getItem(QUEST_SAVE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (data.rolledDay !== this._todayKey()) {
        // New day — reset quests, update streak
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
        if (data.lastCompletedDay === yesterday.toDateString()) {
          this.streak = (data.streak || 0) + 1
        } else if (data.lastCompletedDay !== this._todayKey()) {
          this.streak = 0 // broke the streak
        }
        this.dailyQuests = []
        this.completedToday = 0
      }
    } catch (e) { /* ignore */ }
  },

  _rollNewDay () {
    // Pick 1 easy + 1 medium + 1 hard (or fallback random 3)
    const easy   = QUEST_POOL.filter(q => q.difficulty === 'easy')
    const medium = QUEST_POOL.filter(q => q.difficulty === 'medium')
    const hard   = QUEST_POOL.filter(q => q.difficulty === 'hard')
    const pick = arr => arr[Math.floor(Math.random() * arr.length)]
    this.dailyQuests = [
      { ...pick(easy),   progress: 0, completed: false, rewarded: false },
      { ...pick(medium), progress: 0, completed: false, rewarded: false },
      { ...pick(hard),   progress: 0, completed: false, rewarded: false }
    ]
    this._save()
  },

  // Call this from game events
  recordAction (type, amount = 1, meta = {}) {
    let changed = false
    for (const quest of this.dailyQuests) {
      if (quest.completed) continue
      if (quest.type === type || (quest.type === 'harvest_type' && type === 'harvest' && meta.cropType === quest.cropType)) {
        quest.progress = Math.min(quest.progress + amount, quest.target)
        if (quest.progress >= quest.target) {
          quest.completed = true
          changed = true
          this._onQuestComplete(quest)
        }
        changed = true
      }
    }
    if (changed) { this._save(); this._renderPanel() }
  },

  _onQuestComplete (quest) {
    this.completedToday++
    if (this.completedToday === 3 && this.lastCompletedDay !== this._todayKey()) {
      this.lastCompletedDay = this._todayKey()
    }

    const mult = STREAK_MULTIPLIERS[Math.min(this.streak, STREAK_MULTIPLIERS.length - 1)]
    const coins = Math.floor(quest.reward.coins * mult)
    const xp = Math.floor(quest.reward.xp * mult)

    // Fire reward event
    window.dispatchEvent(new CustomEvent('quest-complete', { detail: { quest, coins, xp, streak: this.streak } }))
    this._save()
  },

  getStreakMultiplier () {
    return STREAK_MULTIPLIERS[Math.min(this.streak, STREAK_MULTIPLIERS.length - 1)]
  },

  _renderPanel () {
    const list = document.getElementById('quest-list')
    if (!list) return
    list.innerHTML = ''

    const mult = this.getStreakMultiplier()
    const streakEl = document.getElementById('quest-streak')
    if (streakEl) streakEl.textContent = this.streak > 0 ? `🔥 ${this.streak} day streak · ${mult}x rewards` : 'Complete all 3 for streak bonus!'

    for (const quest of this.dailyQuests) {
      const pct = Math.min(100, (quest.progress / quest.target) * 100)
      const div = document.createElement('div')
      div.className = 'quest-card' + (quest.completed ? ' completed' : '')
      div.innerHTML = `
        <div class="quest-header">
          <span class="quest-desc">${quest.desc}</span>
          <span class="quest-diff quest-diff-${quest.difficulty}">${quest.difficulty}</span>
        </div>
        <div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
        <div class="quest-footer">
          <span class="quest-prog-text">${quest.progress}/${quest.target}</span>
          <span class="quest-reward">🪙${quest.reward.coins} · ⭐${quest.reward.xp} XP${mult > 1 ? ' ×' + mult : ''}</span>
        </div>
      `
      list.appendChild(div)
    }
  },

  openPanel () { document.getElementById('quest-panel')?.classList.add('visible') },
  closePanel () { document.getElementById('quest-panel')?.classList.remove('visible') }
}

window.QuestSystem = QuestSystem
