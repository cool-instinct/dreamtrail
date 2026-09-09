import { useRef, useEffect, useState } from 'react'
import { CITY_COLORS } from '../data/colors'
import { fmtDate } from '../lib/storage'
import { photoUrl } from '../lib/supabase'
import { updateDay } from '../lib/api'

export default function DayCard({ trip, day, dayMem, onChanged, onAddMemory, onPhotoClick, showToast }) {
  const ref = useRef(null)
  const [addingEvent, setAddingEvent] = useState(false)
  const [ev, setEv] = useState({ time: '', text: '' })
  const [editingStay, setEditingStay] = useState(false)
  const [stayName, setStayName] = useState(day.stay?.name || '')
  const d = fmtDate(day.date)
  const color = CITY_COLORS[day.city] || 'var(--tbd)'
  const photos = dayMem.filter((m) => m.type === 'photo')
  const notes = dayMem.filter((m) => m.type === 'note')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('visible'); observer.unobserve(en.target) }
      }),
      { threshold: 0.08 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const patch = async (p, msg) => {
    try { await updateDay(day.id, p); await onChanged(); if (msg) showToast(msg) }
    catch (e) { showToast('Could not save: ' + e.message) }
  }

  const assignCity = (city) => patch({ city: city || 'TBD' }, city ? `${city} pencilled in for ${d.label}` : null)

  const addEvent = () => {
    if (!ev.text.trim()) { showToast('Say what happens first'); return }
    patch({ events: [...(day.events || []), { time: ev.time.trim() || 'TBD', text: ev.text.trim() }] }, 'Event added')
    setAddingEvent(false); setEv({ time: '', text: '' })
  }

  const removeEvent = (i) => patch({ events: (day.events || []).filter((_, j) => j !== i) })

  const saveStay = () => {
    patch({ stay: stayName.trim() ? { name: stayName.trim(), confirmed: day.stay?.confirmed || false } : null }, 'Stay updated')
    setEditingStay(false)
  }

  const plannerCities = [...(trip.cities || []), 'TBD'].filter((c, i, a) => a.indexOf(c) === i)

  return (
    <div className="day" ref={ref} style={{ '--city-color': color }}>
      <div className="card">
        <div className="card-top">
          <div className="dateblock">
            <div className="weekday">{d.weekday}</div>
            <div className="date">{d.label}</div>
          </div>
          <div className="badges">
            <span className="badge">{day.city}</span>
            {!day.confirmed && <span className="badge tbd">TBD</span>}
            {(day.badges || []).map((b) => <span className="badge travel" key={b}>{b}</span>)}
          </div>
        </div>

        <div className="events">
          {(day.events || []).map((e, i) => (
            <div className="event" key={i}>
              <span className="time">{e.time}</span>
              <span className="text">{e.text}</span>
              <button className="iconbtn" title="Remove event" onClick={() => removeEvent(i)}>&times;</button>
            </div>
          ))}
        </div>
        {addingEvent ? (
          <div className="addevent">
            <input className="ev-time" placeholder="Time" value={ev.time} onChange={(e) => setEv({ ...ev, time: e.target.value })} />
            <input className="ev-text" placeholder="What happens?" value={ev.text} onChange={(e) => setEv({ ...ev, text: e.target.value })} />
            <button className="btn solid sm" onClick={addEvent}>Add</button>
            <button className="btn ghost sm" onClick={() => setAddingEvent(false)}>Cancel</button>
          </div>
        ) : (
          <button className="linklike" onClick={() => setAddingEvent(true)}>+ add event</button>
        )}

        {editingStay ? (
          <div className="addevent">
            <input className="ev-text" placeholder="Hotel, Airbnb, night train..." value={stayName} onChange={(e) => setStayName(e.target.value)} />
            <button className="btn solid sm" onClick={saveStay}>Save</button>
            <button className="btn ghost sm" onClick={() => setEditingStay(false)}>Cancel</button>
          </div>
        ) : (
          day.stay ? (
            <div className={`stay ${day.stay.confirmed ? '' : 'tbd'}`}>
              <span className="icon">{day.stay.confirmed ? '🏨' : '🛏️'}</span>
              {day.stay.confirmed ? <strong>{day.stay.name}</strong> : <span>{day.stay.name}</span>}
              <button className="iconbtn" title="Edit stay" onClick={() => { setStayName(day.stay.name); setEditingStay(true) }}>&#9998;</button>
            </div>
          ) : (
            <button className="linklike" onClick={() => { setStayName(''); setEditingStay(true) }}>+ add stay</button>
          )
        )}

        <div className="city-picker">
          <label>City</label>
          <select value={day.city} onChange={(e) => assignCity(e.target.value)}>
            {plannerCities.map((c) => <option value={c} key={c}>{c}</option>)}
          </select>
        </div>

        {(photos.length > 0 || notes.length > 0) && (
          <div className="memories">
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
                <span className="note-time">{fmtDate(n.created_at.slice(0, 10)).label}</span>
              </div>
            ))}
          </div>
        )}

        <button className="add-memory" onClick={() => onAddMemory(day.date)}>+ Add memory</button>
      </div>
    </div>
  )
}
