// ── Inventory Management ────────────────────────────────────────────────────

const BASE_CAPACITY = 50

let inventory = []
let capacityBonus = 0
let onChangeCallback = null

/**
 * Initialize inventory system
 * @param {function} onChange - callback when inventory changes
 */
export function initInventory (onChange) {
  inventory = []
  capacityBonus = 0
  onChangeCallback = onChange
}

/**
 * Set storage bonus from buildings
 */
export function setCapacityBonus (bonus) {
  capacityBonus = bonus
}

/**
 * Get maximum inventory capacity
 */
export function getMaxCapacity () {
  return BASE_CAPACITY + capacityBonus
}

/**
 * Get current item count
 */
export function getItemCount () {
  let total = 0
  for (const item of inventory) {
    total += item.quantity
  }
  return total
}

/**
 * Check if inventory has room for more items
 */
export function hasRoom (quantity) {
  return getItemCount() + (quantity || 1) <= getMaxCapacity()
}

/**
 * Add item to inventory
 * @returns {boolean} true if added successfully
 */
export function addItem (itemId, quantity, meta) {
  if (!quantity || quantity <= 0) return false
  if (!hasRoom(quantity)) return false

  const existing = inventory.find(i => i.itemId === itemId)
  if (existing) {
    existing.quantity += quantity
  } else {
    inventory.push({
      itemId,
      name: meta?.name || itemId,
      quantity,
      type: meta?.type || 'misc',
      sellPrice: meta?.sellPrice || 0,
      usable: meta?.usable || false,
      useEffect: meta?.useEffect || null  // e.g. { restoreEnergy: 10 }
    })
  }

  if (onChangeCallback) onChangeCallback(inventory)
  return true
}

/**
 * Remove item from inventory
 * @returns {boolean} true if removed successfully
 */
export function removeItem (itemId, quantity) {
  if (!quantity || quantity <= 0) return false

  const existing = inventory.find(i => i.itemId === itemId)
  if (!existing || existing.quantity < quantity) return false

  existing.quantity -= quantity
  if (existing.quantity <= 0) {
    inventory = inventory.filter(i => i.itemId !== itemId)
  }

  if (onChangeCallback) onChangeCallback(inventory)
  return true
}

/**
 * Check if inventory has at least N of an item
 */
export function hasItem (itemId, quantity) {
  const existing = inventory.find(i => i.itemId === itemId)
  return existing && existing.quantity >= (quantity || 1)
}

/**
 * Get quantity of an item
 */
export function getItemQty (itemId) {
  const existing = inventory.find(i => i.itemId === itemId)
  return existing ? existing.quantity : 0
}

/**
 * Get entire inventory
 */
export function getInventory () {
  return [...inventory]
}

/**
 * Sell an item from inventory
 * @returns {{ coins: number, sold: number } | null}
 */
export function sellItem (itemId, quantity) {
  const existing = inventory.find(i => i.itemId === itemId)
  if (!existing || existing.quantity < quantity) return null

  const sold = Math.min(quantity, existing.quantity)
  const coins = sold * (existing.sellPrice || 0)

  existing.quantity -= sold
  if (existing.quantity <= 0) {
    inventory = inventory.filter(i => i.itemId !== itemId)
  }

  if (onChangeCallback) onChangeCallback(inventory)
  return { coins, sold }
}

/**
 * Render inventory panel UI
 * @param {HTMLElement} panelEl
 * @param {function} onSell  - called with (itemId, qty)
 * @param {function} onUse   - called with (itemId, useEffect) for usable items
 */
export function renderInventoryPanel (panelEl, onSell, onUse) {
  if (!panelEl) return

  const header = panelEl.querySelector('#inventory-header-info')
  if (header) {
    header.textContent = getItemCount() + '/' + getMaxCapacity() + ' items'
  }

  const grid = panelEl.querySelector('#inventory-grid')
  if (!grid) return

  grid.innerHTML = ''

  if (inventory.length === 0) {
    grid.innerHTML = '<div class="inventory-empty">Inventory is empty</div>'
    return
  }

  for (const item of inventory) {
    const card = document.createElement('div')
    card.className = 'inventory-item'

    const totalValue = item.sellPrice > 0 ? item.sellPrice * item.quantity : 0
    card.innerHTML = `
      <div class="inv-item-name">${item.name}</div>
      <div class="inv-item-qty">x${item.quantity}</div>
      <div class="inv-item-type">${item.type}</div>
      <div class="inv-item-actions">
        ${item.usable ? `<button class="inv-use-btn" data-item="${item.itemId}">Use</button>` : ''}
        ${item.sellPrice > 0 ? `<button class="inv-sell-btn" data-item="${item.itemId}" data-qty="1">Sell 1 (${item.sellPrice}🪙)</button>` : ''}
        ${item.sellPrice > 0 && item.quantity > 1 ? `<button class="inv-sell-all-btn" data-item="${item.itemId}" data-qty="${item.quantity}">Sell All (${totalValue}🪙)</button>` : ''}
      </div>
    `

    const useBtn = card.querySelector('.inv-use-btn')
    if (useBtn) {
      useBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (onUse) onUse(item.itemId, item.useEffect)
      })
    }

    const sellBtn = card.querySelector('.inv-sell-btn')
    if (sellBtn) {
      sellBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (onSell) onSell(item.itemId, 1)
      })
    }

    const sellAllBtn = card.querySelector('.inv-sell-all-btn')
    if (sellAllBtn) {
      sellAllBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (onSell) onSell(item.itemId, item.quantity)
      })
    }

    grid.appendChild(card)
  }
}

window.InventorySystem = { initInventory, setCapacityBonus, getMaxCapacity, getItemCount, hasRoom, addItem, removeItem, hasItem, getItemQty, getInventory, sellItem, renderInventoryPanel }
