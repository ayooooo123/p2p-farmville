// Sliding toast notifications
const TOAST_DURATION = 3500
const MAX_TOASTS = 4
let toastContainer = null

function ensureContainer () {
  if (toastContainer) return
  toastContainer = document.createElement('div')
  toastContainer.id = 'toast-container'
  document.body.appendChild(toastContainer)
}

const ICONS = {
  harvest: '🌾', coin: '🪙', xp: '⭐', level: '🎉',
  achievement: '🏆', quest: '📋', trade: '🤝', gift: '🎁',
  error: '❌', info: 'ℹ️', warning: '⚠️'
}

export function showToast (message, type = 'info', subtitle = null) {
  ensureContainer()

  // Limit stack
  const existing = toastContainer.querySelectorAll('.toast')
  if (existing.length >= MAX_TOASTS) existing[0].remove()

  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.innerHTML = `
    <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
    <div class="toast-body">
      <div class="toast-msg">${message}</div>
      ${subtitle ? `<div class="toast-sub">${subtitle}</div>` : ''}
    </div>
  `
  toastContainer.appendChild(toast)

  // Animate in
  requestAnimationFrame(() => toast.classList.add('visible'))

  // Auto dismiss
  setTimeout(() => {
    toast.classList.remove('visible')
    setTimeout(() => toast.remove(), 400)
  }, TOAST_DURATION)
}

window.ToastSystem = { showToast }
