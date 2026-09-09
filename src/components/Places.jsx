import { useState, useRef } from 'react'
import { CITY_COLORS } from '../data/colors'
import { fmtDate } from '../lib/storage'
import { photoUrl } from '../lib/supabase'
import { uploadDocument, documentUrl, deleteDocument } from '../lib/api'

const CATEGORIES = [
  { key: 'stay', label: 'Stay' },
  { key: 'transport', label: 'Transport' },
  { key: 'activity', label: 'Activity' },
]

function PlaceSection({ trip, place, days, memories, documents, onChanged, onPhotoClick, showToast }) {
  const [cat, setCat] = useState('stay')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const color = CITY_COLORS[place] || 'var(--tbd)'
  const photos = memories.filter((m) => m.type === 'photo')
  const notes = memories.filter((m) => m.type === 'note')

  const doUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { showToast('Pick a PDF first'); return }
    setBusy(true)
    try {
      await uploadDocument(trip.id, place, cat, title.trim() || file.name, file)
      setTitle(''); fileRef.current.value = ''
      await onChanged()
      showToast('Document saved')
    } catch (e) {
      showToast('Upload failed: ' + e.message)
    }
    setBusy(false)
  }

  const openDoc = async (doc) => {
    try { window.open(await documentUrl(doc.storage_path), '_blank') }
    catch (e) { showToast('Could not open: ' + e.message) }
  }

  const removeDoc = async (doc) => {
    try { await deleteDocument(doc); await onChanged(); showToast('Document deleted') }
    catch (e) { showToast('Could not delete: ' + e.message) }
  }

  return (
    <section className="place" style={{ '--city-color': color }}>
      <h2 className="place-name">{place}</h2>
      <div className="place-days">
        {days.map((d) => <span key={d.id} className="place-day">{fmtDate(d.date).label}</span>)}
      </div>

      <div className="place-docs">
        <div className="place-sub">Documents</div>
        {CATEGORIES.map((c) => {
          const docs = documents.filter((d) => d.category === c.key)
          return (
            <div className="doc-group" key={c.key}>
              <div className="doc-cat">{c.label}</div>
              {docs.length === 0 && <div className="doc-empty">No {c.label.toLowerCase()} documents yet</div>}
              {docs.map((d) => (
                <div className="doc-row" key={d.id}>
                  <button className="doc-link" onClick={() => openDoc(d)}>📄 {d.title}</button>
                  <button className="iconbtn" title="Delete" onClick={() => removeDoc(d)}>&times;</button>
                </div>
              ))}
            </div>
          )
        })}
        <div className="doc-upload">
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATEGORIES.map((c) => <option value={c.key} key={c.key}>{c.label}</option>)}
          </select>
          <input placeholder="Title (e.g. hotel booking)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="file" accept="application/pdf" ref={fileRef} />
          <button className="btn solid sm" disabled={busy} onClick={doUpload}>{busy ? 'Uploading...' : 'Upload PDF'}</button>
        </div>
      </div>

      {(photos.length > 0 || notes.length > 0) && (
        <div className="place-mems">
          <div className="place-sub">Memories</div>
          {photos.length > 0 && (
            <div className="memories-grid">
              {photos.map((p) => (
                <img src={photoUrl(p.storage_path)} alt="memory" loading="lazy" key={p.id} onClick={() => onPhotoClick(photoUrl(p.storage_path))} />
              ))}
            </div>
          )}
          {notes.map((n) => (
            <div className="note" key={n.id}>
              {n.text}
              <span className="note-time">{fmtDate(n.day).label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function Places({ trip, days, memories, documents, onChanged, onPhotoClick, showToast }) {
  const places = (trip.cities || []).filter((c) => c !== 'TBD')
  if (places.length === 0) return <div className="loading">No cities on this trip yet.</div>
  return (
    <div className="places">
      {places.map((p) => (
        <PlaceSection
          key={p}
          trip={trip}
          place={p}
          days={days.filter((d) => d.city === p)}
          memories={memories.filter((m) => (days.find((d) => d.date === m.day) || {}).city === p)}
          documents={documents.filter((d) => d.place === p)}
          onChanged={onChanged}
          onPhotoClick={onPhotoClick}
          showToast={showToast}
        />
      ))}
    </div>
  )
}
