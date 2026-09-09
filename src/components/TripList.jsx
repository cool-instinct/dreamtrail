import { useState, useEffect } from 'react'
import { listTrips, createTrip } from '../lib/api'
import { supabase } from '../lib/supabase'
import { fmtDate } from '../lib/storage'

export default function TripList({ session, showToast }) {
  const [trips, setTrips] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', start: '', end: '', cities: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        setTrips(await listTrips())
      } catch (e) {
        showToast('Could not load trips: ' + e.message)
        setTrips([])
      }
    })()
  }, [showToast])

  const submit = async () => {
    if (!form.name || !form.start || !form.end) { showToast('Name and dates first'); return }
    if (form.end < form.start) { showToast('End date is before start date'); return }
    setBusy(true)
    try {
      const trip = await createTrip({
        name: form.name,
        start_date: form.start,
        end_date: form.end,
        cities: form.cities.split(',').map((c) => c.trim()).filter(Boolean),
      })
      window.location.hash = `#/trip/${trip.id}`
    } catch (e) {
      showToast('Could not create trip: ' + e.message)
      setBusy(false)
    }
  }

  return (
    <div className="triplist">
      <header className="triplist-header">
        <div>
          <div className="eyebrow">DreamTrail</div>
          <h1 className="triplist-title">Your trips</h1>
        </div>
        <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>

      {trips === null && <div className="loading">Loading trips...</div>}
      {trips && trips.map((t) => (
        <a className="trip-row" key={t.id} href={`#/trip/${t.id}`}>
          <div>
            <div className="trip-name">{t.name}</div>
            <div className="trip-dates">{fmtDate(t.start_date).label} - {fmtDate(t.end_date).label}</div>
          </div>
          <div className="trip-cities">
            {(t.cities || []).map((c) => <span className="city confirmed" key={c}>{c}</span>)}
          </div>
        </a>
      ))}

      {trips && trips.length === 0 && (
        <div className="card empty-trips">
          <p>No trips yet.</p>
          <p>Create your first trip - give it a name, dates, and the cities you are dreaming of.</p>
        </div>
      )}

      {!showForm && <button className="add-memory" onClick={() => setShowForm(true)}>+ New trip</button>}
      {showForm && (
        <div className="card newtrip">
          <label>Trip name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Japan in spring" />
          <div className="newtrip-row">
            <div><label>Start</label><input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
            <div><label>End</label><input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
          </div>
          <label>Cities (comma separated, in order)</label>
          <input value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} placeholder="Tokyo, Kyoto, Osaka" />
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn solid" disabled={busy} onClick={submit}>{busy ? 'Creating...' : 'Create trip'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
