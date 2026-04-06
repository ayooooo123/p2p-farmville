// ── Collections System ──────────────────────────────────────────────────────
// Rare items that randomly drop when harvesting. Complete sets for bonuses.

export const COLLECTION_DEFINITIONS = {
  spring_flowers: {
    name: 'Spring Flowers',
    icon: '\ud83c\udf38',
    reward: { coins: 5000, xp: 500 },
    items: [
      { id: 'daffodil', name: 'Daffodil', rarity: 'common', icon: '\ud83c\udf3c', description: 'A cheerful yellow bloom' },
      { id: 'tulip', name: 'Tulip', rarity: 'common', icon: '\ud83c\udf37', description: 'Graceful spring cup' },
      { id: 'crocus', name: 'Crocus', rarity: 'uncommon', icon: '\ud83d\udc9c', description: 'Delicate purple petals' },
      { id: 'lily', name: 'Lily', rarity: 'uncommon', icon: '\ud83c\udf3a', description: 'Elegant white trumpet' },
      { id: 'iris', name: 'Iris', rarity: 'rare', icon: '\ud83d\udc99', description: 'Named for the rainbow goddess' },
      { id: 'daisy', name: 'Daisy', rarity: 'common', icon: '\u2728', description: 'Simple and sweet' },
      { id: 'peony', name: 'Peony', rarity: 'rare', icon: '\ud83c\udf39', description: 'Lush, layered beauty' },
      { id: 'bluebell', name: 'Bluebell', rarity: 'epic', icon: '\ud83d\udd35', description: 'Woodland fairy bell' }
    ]
  },
  farm_tools: {
    name: 'Farm Tools',
    icon: '\ud83d\udee0\ufe0f',
    reward: { coins: 8000, xp: 800 },
    items: [
      { id: 'rusty_hoe', name: 'Rusty Hoe', rarity: 'common', icon: '\u2692\ufe0f', description: 'Seen better days' },
      { id: 'wooden_rake', name: 'Wooden Rake', rarity: 'common', icon: '\ud83e\udeb5', description: 'Hand-carved oak handle' },
      { id: 'brass_bell', name: 'Brass Bell', rarity: 'uncommon', icon: '\ud83d\udd14', description: 'Calls the farmhands home' },
      { id: 'iron_pitchfork', name: 'Iron Pitchfork', rarity: 'uncommon', icon: '\ud83d\udd31', description: 'Three sharp tines' },
      { id: 'copper_kettle', name: 'Copper Kettle', rarity: 'rare', icon: '\u2615', description: 'Tea time at the barn' },
      { id: 'stone_mortar', name: 'Stone Mortar', rarity: 'rare', icon: '\ud83e\uddea', description: 'Grind herbs and spices' },
      { id: 'silver_shears', name: 'Silver Shears', rarity: 'epic', icon: '\u2702\ufe0f', description: 'Precision cutting' },
      { id: 'gold_medal', name: 'Gold Medal', rarity: 'epic', icon: '\ud83c\udfc5', description: 'First prize at the county fair' }
    ]
  },
  animal_friends: {
    name: 'Animal Friends',
    icon: '\ud83d\udc3e',
    reward: { coins: 6000, xp: 600 },
    items: [
      { id: 'bunny_toy', name: 'Bunny Toy', rarity: 'common', icon: '\ud83d\udc30', description: 'Soft and fluffy' },
      { id: 'kitten_plush', name: 'Kitten Plush', rarity: 'common', icon: '\ud83d\udc31', description: 'Purrs when squeezed' },
      { id: 'puppy_collar', name: 'Puppy Collar', rarity: 'uncommon', icon: '\ud83d\udc36', description: 'Best friend tag attached' },
      { id: 'bird_feeder', name: 'Bird Feeder', rarity: 'uncommon', icon: '\ud83d\udc26', description: 'Attracts songbirds' },
      { id: 'fish_bowl', name: 'Fish Bowl', rarity: 'rare', icon: '\ud83d\udc20', description: 'Goldfish included' },
      { id: 'hamster_wheel', name: 'Hamster Wheel', rarity: 'rare', icon: '\ud83d\udc39', description: 'Spin spin spin!' },
      { id: 'turtle_shell', name: 'Turtle Shell', rarity: 'epic', icon: '\ud83d\udc22', description: 'Ancient wisdom inside' },
      { id: 'butterfly_net', name: 'Butterfly Net', rarity: 'epic', icon: '\ud83e\udd8b', description: 'Catch the wind' }
    ]
  },
  gemstones: {
    name: 'Gemstones',
    icon: '\ud83d\udc8e',
    reward: { coins: 15000, xp: 1500 },
    items: [
      { id: 'ruby', name: 'Ruby', rarity: 'uncommon', icon: '\u2764\ufe0f', description: 'Deep crimson fire' },
      { id: 'emerald', name: 'Emerald', rarity: 'uncommon', icon: '\ud83d\udc9a', description: 'Green as the forest' },
      { id: 'sapphire', name: 'Sapphire', rarity: 'rare', icon: '\ud83d\udc99', description: 'Ocean blue depths' },
      { id: 'amethyst', name: 'Amethyst', rarity: 'rare', icon: '\ud83d\udc9c', description: 'Royal purple crystal' },
      { id: 'topaz', name: 'Topaz', rarity: 'rare', icon: '\ud83d\udca0', description: 'Golden sunshine trapped' },
      { id: 'opal', name: 'Opal', rarity: 'epic', icon: '\ud83c\udf08', description: 'Shimmers every color' },
      { id: 'pearl', name: 'Pearl', rarity: 'epic', icon: '\u26aa', description: 'Born from the sea' },
      { id: 'diamond', name: 'Diamond', rarity: 'epic', icon: '\ud83d\udc8e', description: 'Unbreakable brilliance' }
    ]
  },
  seasons: {
    name: 'Four Seasons',
    icon: '\ud83c\udf43',
    reward: { coins: 7000, xp: 700 },
    items: [
      { id: 'spring_rain', name: 'Spring Rain', rarity: 'common', icon: '\ud83c\udf27\ufe0f', description: 'Fresh beginning drops' },
      { id: 'summer_sun', name: 'Summer Sun', rarity: 'common', icon: '\u2600\ufe0f', description: 'Warm golden rays' },
      { id: 'autumn_leaf', name: 'Autumn Leaf', rarity: 'uncommon', icon: '\ud83c\udf42', description: 'Crisp orange and red' },
      { id: 'winter_snow', name: 'Winter Snow', rarity: 'uncommon', icon: '\u2744\ufe0f', description: 'First snowflake of the year' },
      { id: 'harvest_moon', name: 'Harvest Moon', rarity: 'rare', icon: '\ud83c\udf15', description: 'Glows over the fields' },
      { id: 'rainbow', name: 'Rainbow', rarity: 'epic', icon: '\ud83c\udf08', description: 'After the storm, beauty' }
    ]
  },
  bakery_treats: {
    name: 'Bakery Treats',
    icon: '\ud83c\udf70',
    reward: { coins: 6000, xp: 600 },
    items: [
      { id: 'sourdough', name: 'Sourdough Loaf', rarity: 'common', icon: '\ud83c\udf5e', description: 'Tangy and crusty' },
      { id: 'croissant', name: 'Golden Croissant', rarity: 'common', icon: '\ud83e\udd50', description: 'Flaky layers of butter' },
      { id: 'blueberry_muffin', name: 'Blueberry Muffin', rarity: 'uncommon', icon: '\ud83e\uddc1', description: 'Bursting with berries' },
      { id: 'cinnamon_roll', name: 'Cinnamon Roll', rarity: 'uncommon', icon: '\ud83c\udf00', description: 'Swirled with sweetness' },
      { id: 'eclair', name: 'Chocolate Eclair', rarity: 'rare', icon: '\ud83c\udf6b', description: 'Cream-filled perfection' },
      { id: 'macaron', name: 'Rainbow Macaron', rarity: 'rare', icon: '\ud83c\udf6c', description: 'French perfection' },
      { id: 'wedding_cake', name: 'Wedding Cake', rarity: 'epic', icon: '\ud83c\udf82', description: 'Three-tiered masterpiece' }
    ]
  },
  country_music: {
    name: 'Country Music',
    icon: '\ud83c\udfb5',
    reward: { coins: 5500, xp: 550 },
    items: [
      { id: 'banjo', name: 'Banjo', rarity: 'common', icon: '\ud83c\udfb6', description: 'Twangy farm vibes' },
      { id: 'fiddle', name: 'Fiddle', rarity: 'common', icon: '\ud83c\udfbb', description: 'Dance under the stars' },
      { id: 'harmonica', name: 'Harmonica', rarity: 'uncommon', icon: '\ud83c\udfb5', description: 'Blues on the porch' },
      { id: 'cowboy_hat', name: 'Cowboy Hat', rarity: 'uncommon', icon: '\ud83e\udd20', description: 'Yee-haw!' },
      { id: 'guitar', name: 'Acoustic Guitar', rarity: 'rare', icon: '\ud83c\udfb8', description: 'Campfire serenade' },
      { id: 'golden_record', name: 'Golden Record', rarity: 'epic', icon: '\ud83d\udcbf', description: 'Number one hit' }
    ]
  },
  farm_legends: {
    name: 'Farm Legends',
    icon: '\ud83c\udfc6',
    reward: { coins: 20000, xp: 2000, farmCash: 5 },
    items: [
      { id: 'old_well', name: 'Old Well', rarity: 'uncommon', icon: '\ud83d\udea3', description: 'Wish upon a penny' },
      { id: 'scarecrow', name: 'Scarecrow', rarity: 'uncommon', icon: '\ud83e\uddd1\u200d\ud83c\udf3e', description: 'Guardian of the harvest' },
      { id: 'horseshoe', name: 'Lucky Horseshoe', rarity: 'rare', icon: '\ud83c\udfa0', description: 'Hang it for good luck' },
      { id: 'four_leaf_clover', name: 'Four-Leaf Clover', rarity: 'rare', icon: '\ud83c\udf40', description: 'One in ten thousand' },
      { id: 'golden_egg', name: 'Golden Egg', rarity: 'epic', icon: '\ud83e\udd5a', description: 'Laid by a legendary hen' },
      { id: 'enchanted_seed', name: 'Enchanted Seed', rarity: 'epic', icon: '\u2728', description: 'Grows anything, anywhere' },
      { id: 'farm_deed', name: 'Original Farm Deed', rarity: 'epic', icon: '\ud83d\udcdc', description: 'The founding document' }
    ]
  },
  weather_wonders: {
    name: 'Weather Wonders',
    icon: '\u26c8\ufe0f',
    reward: { coins: 7500, xp: 750 },
    items: [
      { id: 'morning_dew', name: 'Morning Dew', rarity: 'common', icon: '\ud83d\udca7', description: 'Fresh dawn droplets' },
      { id: 'thunderbolt', name: 'Thunderbolt', rarity: 'uncommon', icon: '\u26a1', description: 'Electrifying energy' },
      { id: 'tornado_in_jar', name: 'Tornado in a Jar', rarity: 'rare', icon: '\ud83c\udf2a\ufe0f', description: 'Bottled fury' },
      { id: 'frozen_raindrop', name: 'Frozen Raindrop', rarity: 'rare', icon: '\u2744\ufe0f', description: 'Time stood still' },
      { id: 'sunbeam', name: 'Captured Sunbeam', rarity: 'epic', icon: '\ud83c\udf1e', description: 'Warmth in a bottle' },
      { id: 'aurora', name: 'Aurora Borealis Shard', rarity: 'epic', icon: '\ud83c\udf0c', description: 'Northern lights fragment' }
    ]
  },
  vintage_farm: {
    name: 'Vintage Farm',
    icon: '\ud83d\udcf7',
    reward: { coins: 9000, xp: 900 },
    items: [
      { id: 'oil_lamp', name: 'Oil Lamp', rarity: 'common', icon: '\ud83e\ude94', description: 'Light before electricity' },
      { id: 'butter_churn', name: 'Butter Churn', rarity: 'common', icon: '\ud83e\uddc8', description: 'Hand-cranked goodness' },
      { id: 'weathervane', name: 'Weathervane', rarity: 'uncommon', icon: '\ud83d\udc13', description: 'Rooster on top' },
      { id: 'plow_blade', name: 'Antique Plow Blade', rarity: 'uncommon', icon: '\u2694\ufe0f', description: 'Turned the first furrow' },
      { id: 'milk_pail', name: 'Copper Milk Pail', rarity: 'rare', icon: '\ud83e\udd5b', description: 'Dawn milking memories' },
      { id: 'quilt', name: 'Grandmother\'s Quilt', rarity: 'rare', icon: '\ud83e\uddf5', description: 'Patchwork love' },
      { id: 'music_box', name: 'Music Box', rarity: 'epic', icon: '\ud83c\udfb6', description: 'Plays a forgotten melody' },
      { id: 'tintype_photo', name: 'Tintype Photo', rarity: 'epic', icon: '\ud83d\uddbc\ufe0f', description: 'The original farmers' }
    ]
  }
}

// Rarity weights for drop selection
const RARITY_WEIGHTS = {
  common: 50,
  uncommon: 30,
  rare: 15,
  epic: 5
}

// collectionData: { [itemId]: number (count) }
let collectionData = {}
let onItemFound = null

export function initCollections (data, itemFoundCallback) {
  collectionData = data || {}
  onItemFound = itemFoundCallback || null
}

export function getCollectionData () {
  return collectionData
}

export function hasItem (itemId) {
  return (collectionData[itemId] || 0) > 0
}

export function getItemCount (itemId) {
  return collectionData[itemId] || 0
}

/**
 * Roll for a collection item drop (called on harvest). Returns item or null.
 * @param {number} dropChance - 0 to 1 (default 0.05 = 5%)
 */
export function rollForDrop (dropChance) {
  if (Math.random() > (dropChance || 0.05)) return null

  // Pick a random set
  const setKeys = Object.keys(COLLECTION_DEFINITIONS)
  const setKey = setKeys[Math.floor(Math.random() * setKeys.length)]
  const set = COLLECTION_DEFINITIONS[setKey]

  // Weight items by rarity
  const weightedItems = []
  for (const item of set.items) {
    const weight = RARITY_WEIGHTS[item.rarity] || 10
    for (let i = 0; i < weight; i++) {
      weightedItems.push(item)
    }
  }

  const item = weightedItems[Math.floor(Math.random() * weightedItems.length)]

  // Add to collection
  collectionData[item.id] = (collectionData[item.id] || 0) + 1

  if (onItemFound) {
    onItemFound(item, setKey, set)
  }

  return { item, setKey, setName: set.name }
}

/**
 * Check if a set is complete
 */
export function isSetComplete (setKey) {
  const set = COLLECTION_DEFINITIONS[setKey]
  if (!set) return false
  return set.items.every(item => (collectionData[item.id] || 0) > 0)
}

/**
 * Get set completion progress
 */
export function getSetProgress (setKey) {
  const set = COLLECTION_DEFINITIONS[setKey]
  if (!set) return { found: 0, total: 0, progress: 0 }
  const found = set.items.filter(item => (collectionData[item.id] || 0) > 0).length
  return { found, total: set.items.length, progress: found / set.items.length }
}

/**
 * Get total completed sets count
 */
export function getCompletedSetsCount () {
  return Object.keys(COLLECTION_DEFINITIONS).filter(k => isSetComplete(k)).length
}

/**
 * Get total unique items found
 */
export function getTotalItemsFound () {
  return Object.keys(collectionData).filter(k => collectionData[k] > 0).length
}

/**
 * Render collections panel
 */
export function renderCollectionsPanel (container) {
  if (!container) return
  container.innerHTML = ''

  const setKeys = Object.keys(COLLECTION_DEFINITIONS)

  // Summary header
  const summary = document.createElement('div')
  summary.className = 'collections-summary'
  summary.textContent = getCompletedSetsCount() + '/' + setKeys.length + ' sets complete | ' + getTotalItemsFound() + ' unique items'
  container.appendChild(summary)

  for (const setKey of setKeys) {
    const set = COLLECTION_DEFINITIONS[setKey]
    const prog = getSetProgress(setKey)
    const complete = isSetComplete(setKey)

    const card = document.createElement('div')
    card.className = 'collection-set-card' + (complete ? ' complete' : '')

    const header = document.createElement('div')
    header.className = 'collection-set-header'
    header.innerHTML =
      '<span class="collection-set-icon">' + set.icon + '</span>' +
      '<span class="collection-set-name">' + set.name + '</span>' +
      '<span class="collection-set-progress">' + prog.found + '/' + prog.total + '</span>'

    const itemGrid = document.createElement('div')
    itemGrid.className = 'collection-item-grid'
    itemGrid.style.display = 'none'

    for (const item of set.items) {
      const found = (collectionData[item.id] || 0) > 0
      const count = collectionData[item.id] || 0
      const slot = document.createElement('div')
      slot.className = 'collection-item-slot' + (found ? ' found' : ' locked') +
        ' rarity-' + item.rarity
      slot.title = found
        ? item.name + ' (' + item.rarity + ') - ' + item.description + (count > 1 ? ' x' + count : '')
        : '???'
      slot.innerHTML = found
        ? '<span class="collection-item-icon">' + item.icon + '</span><span class="collection-item-name">' + item.name + '</span>'
        : '<span class="collection-item-icon">?</span><span class="collection-item-name">???</span>'
      itemGrid.appendChild(slot)
    }

    // Reward info
    const rewardEl = document.createElement('div')
    rewardEl.className = 'collection-reward'
    let rewardText = 'Reward: ' + set.reward.coins + ' coins, ' + set.reward.xp + ' XP'
    if (set.reward.farmCash) rewardText += ', ' + set.reward.farmCash + ' Farm Cash'
    rewardEl.textContent = complete ? 'COMPLETED!' : rewardText
    itemGrid.appendChild(rewardEl)

    header.addEventListener('click', () => {
      itemGrid.style.display = itemGrid.style.display === 'none' ? 'grid' : 'none'
    })

    card.appendChild(header)
    card.appendChild(itemGrid)
    container.appendChild(card)
  }
}
