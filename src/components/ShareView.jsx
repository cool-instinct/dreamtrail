import { useState, useEffect } from 'react'
import { fetchSharedTrip } from '../lib/api'
import { CITY_COLORS } from '../data/colors'
import { fmtDate } from '../lib/storage'
import { photoUrl } from '../lib/supabase'

export default function ShareView({ token, onPhotoClick }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSharedTrip(token)
      .then((d) => (d ? setData(d) : setError('This link is not active anymore.')))
      .catch(() => setError('This link is not active anymore.'))
  }, [token])

  if (error) return <div className="landing"><h1 className="triplist-title">Link unavailable</h1><p className="subtitle">{error}</p></div>
  if (!data) return <div className="loading">Loading shared trip...</div>

  const { trip, days, memories } = data

  return (
    <>
      <header>
        <div className="eyebrow">Shared via DreamTrail</div>
        <h1>{trip.name}</h1>
        <p className="subtitle">{fmtDate(trip.start_date).label} - {fmtDate(trip.end_date).label}</p>
      </header>
      <div className="timeline">
        {days.map((day) => {
          const color = CITY_COLORS[day.city] || 'var(--tbd)'
          const d = fmtDate(day.date)
          const mem = memories.filter((m) => m.day === day.date)
          const photos = mem.filter((m) => m.type === 'photo')
          const notes = mem.filter((m) => m.type === 'note')
          return (
            <div className="day visible" key={day.id} style={{ '--city-color': color }}>
              <div className="card">
                <div className="card-top">
                  <div className="dateblock">
                    <div className="weekday">{d.weekday}</div>
                    <div className="date">{d.label}</div>
                  </div>
                  <div className="badges"><span className="badge">{day.city}</span></div>
                </div>
                <div className="events">
                  {(day.events || []).map((e, i) => (
                    <div className="event" key={i}><span className="time">{e.time}</span><span className="text">{e.text}</span></div>
                  ))}
                </div>
                {photos.length > 0 && (
                  <div className="memories-grid">
                    {photos.map((p) => (
                      <img src={photoUrl(p.storage_path)} alt="memory" loading="lazy" key={p.id} onClick={() => onPhotoClick(photoUrl(p.storage_path))} />
                    ))}
                  </div>
                )}
                {notes.map((n) => (
                  <div className="note" key={n.id}>{n.text}<span className="note-time">{fmtDate(n.day).label}</span></div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <footer><p className="heart">Shared with you from DreamTrail.</p></footer>
    </>
  )
}
