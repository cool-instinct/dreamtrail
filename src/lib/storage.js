// LocalStorage keys kept identical to the pre-React app so existing
// saved memories and day plans survive the rebuild (same origin).
export const LS_KEY = 'europe2026.memories.v1'
export const LS_PLAN = 'europe2026.plan.v1'

export function loadJSON(k) {
  try {
    return JSON.parse(localStorage.getItem(k)) || {}
  } catch {
    return {}
  }
}

export function saveJSON(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
    return true
  } catch {
    return false
  }
}

export function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00')
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    full: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  }
}

/* downscale photos so localStorage can hold them */
export function downscale(file, maxDim, quality) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        let w = img.width
        let h = img.height
        if (Math.max(w, h) > maxDim) {
          const r = maxDim / Math.max(w, h)
          w = Math.round(w * r)
          h = Math.round(h * r)
        }
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(c.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => resolve(null)
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

export function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(',')
  const mime = head.match(/:(.*?);/)[1]
  const bin = atob(body)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}
