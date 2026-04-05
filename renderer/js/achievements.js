// ── Achievement / Badge / Ribbon System ─────────────────────────────────────

export const ACHIEVEMENT_CATEGORIES = {
  farming: { name: 'Farming', icon: '\ud83c\udf3e', color: '#4caf50' },
  social: { name: 'Social', icon: '\ud83e\udd1d', color: '#2196f3' },
  building: { name: 'Building', icon: '\ud83c\udfe0', color: '#ff9800' },
  economy: { name: 'Economy', icon: '\ud83d\udcb0', color: '#ffd700' },
  animals: { name: 'Animals', icon: '\ud83d\udc04', color: '#8b4513' },
  special: { name: 'Special', icon: '\u2b50', color: '#e040fb' }
}

export const ACHIEVEMENT_DEFINITIONS = {
  // ── Farming ──
  first_harvest: {
    id: 'first_harvest', name: 'First Harvest', description: 'Harvest your first crop',
    category: 'farming', points: 10, reward: { coins: 100, xp: 50 },
    check: (s) => s.totalHarvests >= 1
  },
  harvest_50: {
    id: 'harvest_50', name: 'Green Thumb', description: 'Harvest 50 crops',
    category: 'farming', points: 25, reward: { coins: 500, xp: 200 },
    check: (s) => s.totalHarvests >= 50
  },
  harvest_100: {
    id: 'harvest_100', name: 'Harvest Century', description: 'Harvest 100 crops',
    category: 'farming', points: 50, reward: { coins: 1000, xp: 500 },
    check: (s) => s.totalHarvests >= 100
  },
  harvest_500: {
    id: 'harvest_500', name: 'Crop Commander', description: 'Harvest 500 crops',
    category: 'farming', points: 100, reward: { coins: 5000, xp: 2000 },
    check: (s) => s.totalHarvests >= 500
  },
  harvest_1000: {
    id: 'harvest_1000', name: 'Harvest Legend', description: 'Harvest 1,000 crops',
    category: 'farming', points: 200, reward: { coins: 10000, xp: 5000 },
    check: (s) => s.totalHarvests >= 1000
  },
  plant_100: {
    id: 'plant_100', name: 'Seed Sower', description: 'Plant 100 seeds',
    category: 'farming', points: 25, reward: { coins: 300, xp: 150 },
    check: (s) => s.totalPlanted >= 100
  },
  plant_500: {
    id: 'plant_500', name: 'Field of Dreams', description: 'Plant 500 seeds',
    category: 'farming', points: 75, reward: { coins: 2000, xp: 1000 },
    check: (s) => s.totalPlanted >= 500
  },
  plow_100: {
    id: 'plow_100', name: 'Earth Mover', description: 'Plow 100 plots',
    category: 'farming', points: 25, reward: { coins: 400, xp: 200 },
    check: (s) => s.totalPlowed >= 100
  },
  water_100: {
    id: 'water_100', name: 'Rain Maker', description: 'Water 100 crops',
    category: 'farming', points: 25, reward: { coins: 300, xp: 150 },
    check: (s) => s.totalWatered >= 100
  },
  master_1: {
    id: 'master_1', name: 'First Mastery', description: 'Earn Bronze mastery on any crop',
    category: 'farming', points: 50, reward: { coins: 1000, xp: 500 },
    check: (s) => s.masteredCrops >= 1
  },
  master_5: {
    id: 'master_5', name: 'Master Farmer', description: 'Earn Bronze mastery on 5 crops',
    category: 'farming', points: 100, reward: { coins: 5000, xp: 2500 },
    check: (s) => s.masteredCrops >= 5
  },
  master_10: {
    id: 'master_10', name: 'Crop Sage', description: 'Earn Bronze mastery on 10 crops',
    category: 'farming', points: 200, reward: { coins: 15000, xp: 7500 },
    check: (s) => s.masteredCrops >= 10
  },
  all_bronze: {
    id: 'all_bronze', name: 'All Bronze', description: 'Earn Bronze mastery on every crop you\'ve planted',
    category: 'farming', points: 300, reward: { coins: 25000, xp: 10000 },
    check: (s) => s.allBronze
  },
  gold_mastery: {
    id: 'gold_mastery', name: 'Gold Standard', description: 'Earn Gold mastery on any crop',
    category: 'farming', points: 150, reward: { coins: 10000, xp: 5000 },
    check: (s) => s.goldMastery >= 1
  },

  // ── Social ──
  first_neighbor: {
    id: 'first_neighbor', name: 'Hello Neighbor', description: 'Discover your first neighbor',
    category: 'social', points: 10, reward: { coins: 200, xp: 100 },
    check: (s) => s.neighborsFound >= 1
  },
  neighbors_5: {
    id: 'neighbors_5', name: 'Social Farmer', description: 'Discover 5 neighbors',
    category: 'social', points: 25, reward: { coins: 500, xp: 250 },
    check: (s) => s.neighborsFound >= 5
  },
  visit_10: {
    id: 'visit_10', name: 'World Traveler', description: 'Visit 10 farms',
    category: 'social', points: 50, reward: { coins: 1000, xp: 500 },
    check: (s) => s.farmsVisited >= 10
  },
  send_gift_1: {
    id: 'send_gift_1', name: 'Generous Farmer', description: 'Send your first gift',
    category: 'social', points: 10, reward: { coins: 100, xp: 50 },
    check: (s) => s.giftsSent >= 1
  },
  send_gift_50: {
    id: 'send_gift_50', name: 'Gift Giver', description: 'Send 50 gifts',
    category: 'social', points: 75, reward: { coins: 3000, xp: 1500 },
    check: (s) => s.giftsSent >= 50
  },
  trade_1: {
    id: 'trade_1', name: 'First Trade', description: 'Complete your first trade',
    category: 'social', points: 10, reward: { coins: 200, xp: 100 },
    check: (s) => s.tradesCompleted >= 1
  },
  trade_5: {
    id: 'trade_5', name: 'Market Trader', description: 'Complete 5 trades',
    category: 'social', points: 50, reward: { coins: 2000, xp: 1000 },
    check: (s) => s.tradesCompleted >= 5
  },
  chat_100: {
    id: 'chat_100', name: 'Chatterbox', description: 'Send 100 chat messages',
    category: 'social', points: 25, reward: { coins: 500, xp: 250 },
    check: (s) => s.chatMessages >= 100
  },
  coop_1: {
    id: 'coop_1', name: 'Team Player', description: 'Complete a co-op mission',
    category: 'social', points: 25, reward: { coins: 500, xp: 250 },
    check: (s) => s.coopCompleted >= 1
  },
  coop_10: {
    id: 'coop_10', name: 'Co-op Champion', description: 'Complete 10 co-op missions',
    category: 'social', points: 100, reward: { coins: 5000, xp: 2500 },
    check: (s) => s.coopCompleted >= 10
  },

  // ── Building ──
  first_building: {
    id: 'first_building', name: 'Builder', description: 'Place your first building',
    category: 'building', points: 10, reward: { coins: 200, xp: 100 },
    check: (s) => s.buildingsPlaced >= 1
  },
  buildings_5: {
    id: 'buildings_5', name: 'Architect', description: 'Place 5 buildings',
    category: 'building', points: 50, reward: { coins: 2000, xp: 1000 },
    check: (s) => s.buildingsPlaced >= 5
  },
  buildings_10: {
    id: 'buildings_10', name: 'Master Builder', description: 'Place 10 buildings',
    category: 'building', points: 100, reward: { coins: 5000, xp: 2500 },
    check: (s) => s.buildingsPlaced >= 10
  },
  first_tree: {
    id: 'first_tree', name: 'Tree Planter', description: 'Plant your first tree',
    category: 'building', points: 10, reward: { coins: 150, xp: 75 },
    check: (s) => s.treesPlanted >= 1
  },
  trees_10: {
    id: 'trees_10', name: 'Orchard Owner', description: 'Plant 10 trees',
    category: 'building', points: 50, reward: { coins: 2000, xp: 1000 },
    check: (s) => s.treesPlanted >= 10
  },
  decorations_10: {
    id: 'decorations_10', name: 'Decorator', description: 'Place 10 decorations',
    category: 'building', points: 25, reward: { coins: 500, xp: 250 },
    check: (s) => s.decorationsPlaced >= 10
  },
  first_expansion: {
    id: 'first_expansion', name: 'Expanding Horizons', description: 'Expand your farm for the first time',
    category: 'building', points: 50, reward: { coins: 1000, xp: 500 },
    check: (s) => s.expansionTier >= 1
  },
  expansion_5: {
    id: 'expansion_5', name: 'Land Baron', description: 'Expand your farm 5 times',
    category: 'building', points: 150, reward: { coins: 10000, xp: 5000 },
    check: (s) => s.expansionTier >= 5
  },

  // ── Economy ──
  earn_1k: {
    id: 'earn_1k', name: 'First Thousand', description: 'Earn 1,000 total coins',
    category: 'economy', points: 10, reward: { coins: 100, xp: 50 },
    check: (s) => s.totalCoinsEarned >= 1000
  },
  earn_10k: {
    id: 'earn_10k', name: 'Prosperous', description: 'Earn 10,000 total coins',
    category: 'economy', points: 50, reward: { coins: 1000, xp: 500 },
    check: (s) => s.totalCoinsEarned >= 10000
  },
  earn_100k: {
    id: 'earn_100k', name: 'Wealthy Farmer', description: 'Earn 100,000 total coins',
    category: 'economy', points: 150, reward: { coins: 10000, xp: 5000 },
    check: (s) => s.totalCoinsEarned >= 100000
  },
  earn_1m: {
    id: 'earn_1m', name: 'Millionaire', description: 'Earn 1,000,000 total coins',
    category: 'economy', points: 300, reward: { coins: 50000, xp: 25000 },
    check: (s) => s.totalCoinsEarned >= 1000000
  },
  sell_100: {
    id: 'sell_100', name: 'Merchant', description: 'Sell 100 items',
    category: 'economy', points: 25, reward: { coins: 500, xp: 250 },
    check: (s) => s.itemsSold >= 100
  },
  sell_500: {
    id: 'sell_500', name: 'Tycoon', description: 'Sell 500 items',
    category: 'economy', points: 75, reward: { coins: 3000, xp: 1500 },
    check: (s) => s.itemsSold >= 500
  },
  craft_10: {
    id: 'craft_10', name: 'Artisan', description: 'Craft 10 items',
    category: 'economy', points: 25, reward: { coins: 500, xp: 250 },
    check: (s) => s.itemsCrafted >= 10
  },
  craft_50: {
    id: 'craft_50', name: 'Master Artisan', description: 'Craft 50 items',
    category: 'economy', points: 75, reward: { coins: 3000, xp: 1500 },
    check: (s) => s.itemsCrafted >= 50
  },

  // ── Animals ──
  first_animal: {
    id: 'first_animal', name: 'Animal Lover', description: 'Buy your first animal',
    category: 'animals', points: 10, reward: { coins: 200, xp: 100 },
    check: (s) => s.animalsBought >= 1
  },
  animals_5: {
    id: 'animals_5', name: 'Rancher', description: 'Own 5 animals',
    category: 'animals', points: 25, reward: { coins: 1000, xp: 500 },
    check: (s) => s.animalsBought >= 5
  },
  animals_20: {
    id: 'animals_20', name: 'Animal Kingdom', description: 'Own 20 animals',
    category: 'animals', points: 100, reward: { coins: 5000, xp: 2500 },
    check: (s) => s.animalsBought >= 20
  },
  collect_products_50: {
    id: 'collect_products_50', name: 'Product Collector', description: 'Collect 50 animal products',
    category: 'animals', points: 50, reward: { coins: 2000, xp: 1000 },
    check: (s) => s.animalProductsCollected >= 50
  },
  collect_products_100: {
    id: 'collect_products_100', name: 'Farm Producer', description: 'Collect 100 animal products',
    category: 'animals', points: 100, reward: { coins: 5000, xp: 2500 },
    check: (s) => s.animalProductsCollected >= 100
  },
  feed_100: {
    id: 'feed_100', name: 'Animal Feeder', description: 'Feed animals 100 times',
    category: 'animals', points: 25, reward: { coins: 500, xp: 250 },
    check: (s) => s.animalsFed >= 100
  },

  // ── Special ──
  level_5: {
    id: 'level_5', name: 'Getting Started', description: 'Reach Level 5',
    category: 'special', points: 15, reward: { coins: 500, xp: 0 },
    check: (s) => s.level >= 5
  },
  level_10: {
    id: 'level_10', name: 'Established', description: 'Reach Level 10',
    category: 'special', points: 50, reward: { coins: 2000, xp: 0 },
    check: (s) => s.level >= 10
  },
  level_25: {
    id: 'level_25', name: 'Veteran Farmer', description: 'Reach Level 25',
    category: 'special', points: 150, reward: { coins: 10000, xp: 0 },
    check: (s) => s.level >= 25
  },
  level_50: {
    id: 'level_50', name: 'Farm Legend', description: 'Reach Level 50',
    category: 'special', points: 500, reward: { coins: 50000, xp: 0 },
    check: (s) => s.level >= 50
  },
  collection_1: {
    id: 'collection_1', name: 'Collector', description: 'Complete your first collection',
    category: 'special', points: 50, reward: { coins: 2000, xp: 1000 },
    check: (s) => s.completedCollections >= 1
  },
  collection_5: {
    id: 'collection_5', name: 'Curator', description: 'Complete 5 collections',
    category: 'special', points: 200, reward: { coins: 15000, xp: 7500 },
    check: (s) => s.completedCollections >= 5
  },
  day_streak_3: {
    id: 'day_streak_3', name: 'Dedicated', description: 'Play for 3 sessions',
    category: 'special', points: 15, reward: { coins: 300, xp: 150 },
    check: (s) => s.sessionsPlayed >= 3
  },
  day_streak_7: {
    id: 'day_streak_7', name: 'Committed', description: 'Play for 7 sessions',
    category: 'special', points: 50, reward: { coins: 1000, xp: 500 },
    check: (s) => s.sessionsPlayed >= 7
  },
  achievement_hunter: {
    id: 'achievement_hunter', name: 'Achievement Hunter', description: 'Unlock 20 achievements',
    category: 'special', points: 100, reward: { coins: 5000, xp: 2500 },
    check: (s) => s.achievementsUnlocked >= 20
  },
  completionist: {
    id: 'completionist', name: 'Completionist', description: 'Unlock 40 achievements',
    category: 'special', points: 500, reward: { coins: 50000, xp: 25000 },
    check: (s) => s.achievementsUnlocked >= 40
  }
}

// ── Ribbon system ───────────────────────────────────────────────────────────
export const RIBBON_TIERS = [
  { name: 'Yellow', color: '#ffd700', minPoints: 50 },
  { name: 'White', color: '#ffffff', minPoints: 150 },
  { name: 'Red', color: '#ff4444', minPoints: 350 },
  { name: 'Blue', color: '#4488ff', minPoints: 600 },
  { name: 'Purple', color: '#aa44ff', minPoints: 1000 },
  { name: 'Cosmic', color: '#ff44ff', minPoints: 1500 }
]

export const RIBBON_CATEGORIES = {
  architect: { name: 'Architect', icon: '\ud83c\udfe0', achievementCategory: 'building' },
  crop_master: { name: 'Crop Master', icon: '\ud83c\udf3e', achievementCategory: 'farming' },
  animal_breeder: { name: 'Animal Breeder', icon: '\ud83d\udc04', achievementCategory: 'animals' },
  social_butterfly: { name: 'Social Butterfly', icon: '\ud83e\udd1d', achievementCategory: 'social' },
  collector: { name: 'Collector', icon: '\u2b50', achievementCategory: 'special' },
  trader: { name: 'Trader', icon: '\ud83d\udcb0', achievementCategory: 'economy' }
}

// achievementState: { unlocked: { [id]: timestamp }, stats: { ... } }
let achievementState = { unlocked: {}, stats: {} }
let onAchievementUnlock = null

export function initAchievements (data, unlockCallback) {
  achievementState = data || { unlocked: {}, stats: {} }
  if (!achievementState.unlocked) achievementState.unlocked = {}
  if (!achievementState.stats) achievementState.stats = {}
  onAchievementUnlock = unlockCallback || null
}

export function getAchievementState () {
  return achievementState
}

export function isUnlocked (achievementId) {
  return !!achievementState.unlocked[achievementId]
}

export function getUnlockedCount () {
  return Object.keys(achievementState.unlocked).length
}

export function getTotalPoints () {
  let total = 0
  for (const id of Object.keys(achievementState.unlocked)) {
    const def = ACHIEVEMENT_DEFINITIONS[id]
    if (def) total += def.points
  }
  return total
}

/**
 * Get points earned in a specific achievement category
 */
export function getCategoryPoints (category) {
  let total = 0
  for (const id of Object.keys(achievementState.unlocked)) {
    const def = ACHIEVEMENT_DEFINITIONS[id]
    if (def && def.category === category) total += def.points
  }
  return total
}

/**
 * Get current ribbon tier for a ribbon category
 */
export function getRibbonTier (ribbonCatKey) {
  const cat = RIBBON_CATEGORIES[ribbonCatKey]
  if (!cat) return null
  const points = getCategoryPoints(cat.achievementCategory)
  let best = null
  for (const tier of RIBBON_TIERS) {
    if (points >= tier.minPoints) best = tier
  }
  return best
}

/**
 * Get all ribbons earned
 */
export function getAllRibbons () {
  const ribbons = []
  for (const key of Object.keys(RIBBON_CATEGORIES)) {
    const tier = getRibbonTier(key)
    if (tier) {
      ribbons.push({
        category: RIBBON_CATEGORIES[key],
        tier,
        key
      })
    }
  }
  return ribbons
}

/**
 * Update stats and check for newly unlocked achievements.
 * Returns array of newly unlocked achievements.
 */
export function updateStats (stats) {
  Object.assign(achievementState.stats, stats)

  // Also include achievement count in stats for self-referential checks
  achievementState.stats.achievementsUnlocked = getUnlockedCount()

  const newlyUnlocked = []

  for (const [id, def] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
    if (achievementState.unlocked[id]) continue

    try {
      if (def.check(achievementState.stats)) {
        achievementState.unlocked[id] = Date.now()
        newlyUnlocked.push(def)
        if (onAchievementUnlock) {
          onAchievementUnlock(def)
        }
      }
    } catch (e) {
      // Skip check errors silently
    }
  }

  return newlyUnlocked
}

/**
 * Render achievements panel
 */
export function renderAchievementsPanel (container) {
  if (!container) return
  container.innerHTML = ''

  // Points summary
  const summary = document.createElement('div')
  summary.className = 'achievements-summary'
  summary.innerHTML =
    '<span class="ach-points-total">' + getTotalPoints() + ' pts</span>' +
    '<span class="ach-unlocked-count">' + getUnlockedCount() + '/' + Object.keys(ACHIEVEMENT_DEFINITIONS).length + ' unlocked</span>'
  container.appendChild(summary)

  // Ribbons
  const ribbons = getAllRibbons()
  if (ribbons.length > 0) {
    const ribbonBar = document.createElement('div')
    ribbonBar.className = 'ribbon-bar'
    for (const r of ribbons) {
      const ribbon = document.createElement('span')
      ribbon.className = 'ribbon-badge'
      ribbon.style.background = r.tier.color
      ribbon.style.color = (r.tier.name === 'White' || r.tier.name === 'Yellow') ? '#222' : '#fff'
      ribbon.title = r.tier.name + ' ' + r.category.name + ' Ribbon'
      ribbon.textContent = r.category.icon + ' ' + r.tier.name
      ribbonBar.appendChild(ribbon)
    }
    container.appendChild(ribbonBar)
  }

  // Category tabs
  const tabBar = document.createElement('div')
  tabBar.className = 'ach-tab-bar'
  let activeCategory = null

  const allTab = document.createElement('button')
  allTab.className = 'ach-tab-btn active'
  allTab.textContent = 'All'
  allTab.addEventListener('click', () => {
    activeCategory = null
    renderList()
    tabBar.querySelectorAll('.ach-tab-btn').forEach(b => b.classList.remove('active'))
    allTab.classList.add('active')
  })
  tabBar.appendChild(allTab)

  for (const [catKey, cat] of Object.entries(ACHIEVEMENT_CATEGORIES)) {
    const tab = document.createElement('button')
    tab.className = 'ach-tab-btn'
    tab.textContent = cat.icon + ' ' + cat.name
    tab.addEventListener('click', () => {
      activeCategory = catKey
      renderList()
      tabBar.querySelectorAll('.ach-tab-btn').forEach(b => b.classList.remove('active'))
      tab.classList.add('active')
    })
    tabBar.appendChild(tab)
  }
  container.appendChild(tabBar)

  // Achievement list
  const listEl = document.createElement('div')
  listEl.className = 'ach-list'
  container.appendChild(listEl)

  function renderList () {
    listEl.innerHTML = ''
    const defs = Object.values(ACHIEVEMENT_DEFINITIONS)
      .filter(d => !activeCategory || d.category === activeCategory)
      .sort((a, b) => {
        const aUnlocked = isUnlocked(a.id) ? 1 : 0
        const bUnlocked = isUnlocked(b.id) ? 1 : 0
        if (aUnlocked !== bUnlocked) return bUnlocked - aUnlocked
        return a.points - b.points
      })

    for (const def of defs) {
      const unlocked = isUnlocked(def.id)
      const cat = ACHIEVEMENT_CATEGORIES[def.category]
      const card = document.createElement('div')
      card.className = 'ach-card' + (unlocked ? ' unlocked' : ' locked')

      card.innerHTML =
        '<div class="ach-card-icon" style="color:' + (cat ? cat.color : '#888') + '">' +
          (unlocked ? '\ud83c\udfc6' : '\ud83d\udd12') +
        '</div>' +
        '<div class="ach-card-info">' +
          '<div class="ach-card-name">' + def.name + '</div>' +
          '<div class="ach-card-desc">' + def.description + '</div>' +
          '<div class="ach-card-reward">' +
            (def.reward.coins ? def.reward.coins + ' coins ' : '') +
            (def.reward.xp ? def.reward.xp + ' XP' : '') +
          '</div>' +
        '</div>' +
        '<div class="ach-card-points">' + def.points + ' pts</div>'

      listEl.appendChild(card)
    }
  }

  renderList()
}
