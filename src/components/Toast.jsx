import { useState, useEffect } from 'react'

export default function Toast({ toast }) {
  const [visible, setVisible] = useState(null)

  useEffect(() => {
    if (!toast) return
    setVisible(toast)
    const id = setTimeout(() => setVisible(null), 2400)
    return () => clearTimeout(id)
  }, [toast])

  return (
    <div className={`toast ${visible ? 'show' : ''}`}>
      {visible ? visible.msg : ''}
    </div>
  )
}
