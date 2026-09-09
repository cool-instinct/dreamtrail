import { useState, useRef, useEffect } from 'react'
import { fmtDate, downscale, dataUrlToBlob } from '../lib/storage'
import { addNote, addPhoto } from '../lib/api'

export default function MemoryModal({ tripId, date, onClose, onSaved, onError }) {
  const [pendingPhotos, setPendingPhotos] = useState([])
  const [noteText, setNoteText] = useState('')
  const [dropText, setDropText] = useState('Click to add photos from this day')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach((f) => {
      downscale(f, 1200, 0.78).then((dataUrl) => {
        if (dataUrl) setPendingPhotos((prev) => [...prev, dataUrl])
      })
    })
    setDropText(files.length ? `${files.length} photo(s) selected - click to add more` : 'Click to add photos from this day')
  }

  const handleSave = async () => {
    if (!pendingPhotos.length && !noteText.trim()) { onError('Add a photo or a note first'); return }
    setSaving(true)
    try {
      for (const p of pendingPhotos) await addPhoto(tripId, date, dataUrlToBlob(p))
      if (noteText.trim()) await addNote(tripId, date, noteText.trim())
      onSaved()
    } catch (e) {
      setSaving(false)
      onError('Could not save memory: ' + e.message)
    }
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <h3>Add a memory</h3>
        <div className="modal-date">{fmtDate(date).full}</div>
        <label>Photos</label>
        <div className="file-drop" onClick={() => fileInputRef.current?.click()}>
          <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFiles} />
          <span>{dropText}</span>
        </div>
        <div className="preview-row">
          {pendingPhotos.map((p, i) => <img src={p} alt="" key={i} />)}
        </div>
        <label>Note</label>
        <textarea
          placeholder="What made this day worth remembering?"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn solid" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save memory'}</button>
        </div>
      </div>
    </div>
  )
}
