import { useState, useEffect } from 'react'
import { fmtDate } from '../lib/storage'

function countdownText(trip, now) {
  const start = new Date(trip.start_date + 'T00:00:00')
  const end = new Date(trip.end_date + 'T23:59:59')
  const days = Math.round((new Date(trip.end_date + 'T12:00:00') - new Date(trip.start_date + 'T12:00:00')) / 86400000) + 1
  if (now < start) {
    const d = Math.ceil((start - now) / 86400000)
    return <>Wheels up in <strong>{d}</strong> day{d === 1 ? '' : 's'}</>
  }
  if (now <= end) {
    const dayNum = Math.floor((now - start) / 86400000) + 1
    return <>On the trip - day <strong>{dayNum}</strong> of {days}</>
  }
  return <>Trip complete - <strong>{days}</strong> days</>
}

export default function Header({ trip }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  const cities = trip.cities || []
  return (
    <header>
      <div className="eyebrow">{fmtDate(trip.start_date).label} - {fmtDate(trip.end_date).label} · {new Date(trip.start_date + 'T12:00:00').getFullYear()}</div>
      <h1>{trip.name}</h1>
      <div className="countdown">{countdownText(trip, now)}</div>
      {cities.length > 0 && (
        <div className="route">
          {cities.map((c, i) => (
            <span key={c + i} style={{ display: 'contents' }}>
              {i > 0 && <span className="arrow">&#8594;</span>}
              <span className="city confirmed">{c}</span>
            </span>
          ))}
        </div>
      )}
    </header>
  )
}
