import { useRef, useState } from 'react'
import { fmtDate, downscale, dataUrlToBlob } from '../lib/storage'
import { photoUrl } from '../lib/supabase'
import { addPhotoWithMeta, updateMemoryDay } from '../lib/api'
import { readPhotoMeta } from '../lib/exif'

export default function Gallery({ trip, days, memories, onChanged, onPhotoClick, showToast }) {
  const [uploads, setUploads] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)
  // tolerate duplicated day rows (same date twice) - show each date once
  const uniqDays = days.filter((d, i, a) => a.findIndex((x) => x.date === d.date) === i)
  const dayDates = uniqDays.map((d) => d.date)
  const busy = uploads.some((u) => u.status === 'reading' || u.status === 'uploading')

  const setUpload = (id, patch) =>
    setUploads((us) => us.map((u) => (u.id === id ? { ...u, ...patch } : u)))

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    for (const f of files) {
      const id = crypto.randomUUID()
      const thumb = await downscale(f, 320, 0.7)
      setUploads((us) => [...us, { id, name: f.name, thumb, status: 'reading' }])
      try {
        const meta = await readPhotoMeta(f)
        const day = meta.day && dayDates.includes(meta.day) ? meta.day : null
        setUpload(id, { status: 'uploading', day, hadDate: !!meta.day })
        const full = await downscale(f, 1600, 0.82)
        await addPhotoWithMeta(trip.id, { day, takenAt: meta.takenAt, lat: meta.lat, lng: meta.lng }, dataUrlToBlob(full))
        setUpload(id, { status: 'done', day })
      } catch (e) {
        setUpload(id, { status: 'error', error: e.message })
      }
    }
    await onChanged()
    showToast('Photos added to the trip')
    setTimeout(() => {
      setUploads((us) => us.filter((u) => u.status === 'reading' || u.status === 'uploading' || u.status === 'error'))
    }, 6000)
  }

  const reassign = async (photo, day) => {
    try {
      await updateMemoryDay(photo.id, day || null)
      await onChanged()
      showToast(day ? `Moved to ${fmtDate(day).label}` : 'Marked as unassigned')
    } catch (e) {
      showToast('Could not move photo: ' + e.message)
    }
  }

  const statusText = (u) => {
    if (u.status === 'reading') return 'reading date...'
    if (u.status === 'uploading') return 'uploading...'
    if (u.status === 'error') return 'failed: ' + u.error
    if (u.day) return `added - ${fmtDate(u.day).label}`
    return u.hadDate ? 'added - outside trip dates, pick a day below' : 'added - no date found, pick a day below'
  }

  const photos = memories
    .filter((m) => m.type === 'photo')
    .sort((a, b) => (a.taken_at || a.created_at).localeCompare(b.taken_at || b.created_at))
  const unassigned = photos.filter((p) => !p.day || !dayDates.includes(p.day))
  const groups = uniqDays
    .map((d) => ({ day: d, photos: photos.filter((p) => p.day === d.date) }))
    .filter((g) => g.photos.length > 0)

  const daySelect = (p) => (
    <select value={p.day && dayDates.includes(p.day) ? p.day : ''} onChange={(e) => reassign(p, e.target.value)}>
      <option value="">Unassigned</option>
      {uniqDays.map((d) => (
        <option value={d.date} key={d.id}>
          {fmtDate(d.date).label} - {d.city}
        </option>
      ))}
    </select>
  )

  return (
    <div className="gallery">
      <div
        className={dragOver ? 'gallery-drop over' : 'gallery-drop'}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
      >
        <input type="file" accept="image/*" multiple ref={fileRef} onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
        <strong>Drop a batch of photos here</strong>
        <div>We read each photo's date (and place, if it has one) and file it on the right day. No typing needed.</div>
      </div>

      {uploads.length > 0 && (
        <div className="upload-list">
          {uploads.map((u) => (
            <div className="upload-item" key={u.id}>
              {u.thumb && <img src={u.thumb} alt="" />}
              <span className="u-name">{u.name}</span>
              <span className={`u-status ${u.status === 'done' ? 'ok' : ''} ${u.status === 'error' ? 'err' : ''}`}>{statusText(u)}</span>
            </div>
          ))}
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="g-group">
          <div className="g-group-h">
            <span className="g-date">Needs a day</span>
            <span className="g-city">{unassigned.length} photo{unassigned.length === 1 ? '' : 's'} we could not place</span>
          </div>
          <div className="g-grid">
            {unassigned.map((p) => (
              <div className="g-item" key={p.id}>
                <img src={photoUrl(p.storage_path)} alt="memory" loading="lazy" onClick={() => onPhotoClick(photoUrl(p.storage_path))} />
                {daySelect(p)}
              </div>
            ))}
          </div>
        </div>
      )}

      {groups.map((g) => (
        <div className="g-group" key={g.day.id}>
          <div className="g-group-h">
            <span className="g-date">{fmtDate(g.day.date).full}</span>
            <span className="g-city">{g.day.city}</span>
          </div>
          <div className="g-grid">
            {g.photos.map((p) => (
              <div className="g-item" key={p.id}>
                <img src={photoUrl(p.storage_path)} alt="memory" loading="lazy" onClick={() => onPhotoClick(photoUrl(p.storage_path))} />
                {daySelect(p)}
              </div>
            ))}
          </div>
        </div>
      ))}

      {photos.length === 0 && !busy && (
        <p className="g-empty">No photos yet. Drop a handful above - the timeline fills itself in.</p>
      )}
    </div>
  )
}
