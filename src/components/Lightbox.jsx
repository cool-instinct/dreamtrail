import { useEffect } from 'react'

export default function Lightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="lightbox open" onClick={onClose}>
      <img src={src} alt="" />
    </div>
  )
}
