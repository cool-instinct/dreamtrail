import { useState, useEffect, useCallback } from 'react'
import { loadTrip, setSharing } from '../lib/api'
import Header from './Header'
import Timeline from './Timeline'
import Places from './Places'
import MemoryModal from './MemoryModal'

export default function TripDetail({ tripId, showToast, onPhotoClick }) {
  const [data, setData] = useState(null)
  const [modalDate, setModalDate] = useState(null)
  const [tab, setTab] = useState('timeline')

  const reload = useCallback(async () => {
    try {
      setData(await loadTrip(tripId))
    } catch (e) {
      showToast('Could not load trip: ' + e.message)
    }
  }, [tripId, showToast])

  useEffect(() => { reload() }, [reload])

  if (!data) return <div className="loading">Loading trip...</div>
  const { trip, days, memories, documents } = data

  const shareUrl = `${window.location.origin}/dreamtrail/#/share/${trip.share_token}`

  const toggleShare = async () => {
    try {
      await setSharing(tripId, !trip.share_enabled)
      await reload()
      showToast(!trip.share_enabled ? 'Share link is live' : 'Sharing turned off')
    } catch (e) {
      showToast('Could not update sharing: ' + e.message)
    }
  }

  return (
    <>
      <a className="backlink" href="#/">&larr; all trips</a>
      <Header trip={trip} />

      <div className="sharebar">
        {trip.share_enabled ? (
          <>
            <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
            <button className="btn solid" onClick={() => { navigator.clipboard.writeText(shareUrl); showToast('Link copied') }}>Copy link</button>
            <button className="btn ghost" onClick={toggleShare}>Turn off</button>
          </>
        ) : (
          <button className="btn ghost" onClick={toggleShare}>Share this trip</button>
        )}
      </div>

      <div className="tabs">
        <button className={tab === 'timeline' ? 'tab active' : 'tab'} onClick={() => setTab('timeline')}>Timeline</button>
        <button className={tab === 'places' ? 'tab active' : 'tab'} onClick={() => setTab('places')}>Places &amp; documents</button>
      </div>

      {tab === 'timeline' ? (
        <Timeline
          trip={trip}
          days={days}
          memories={memories}
          onChanged={reload}
          onAddMemory={setModalDate}
          onPhotoClick={onPhotoClick}
          showToast={showToast}
        />
      ) : (
        <Places
          trip={trip}
          days={days}
          memories={memories}
          documents={documents}
          onChanged={reload}
          onPhotoClick={onPhotoClick}
          showToast={showToast}
        />
      )}

      <footer>
        <p className="heart">"The world is a book, and those who do not travel read only one page."</p>
        <p style={{ marginTop: 10 }}>DreamTrail - your trips, your memories, shared only when you choose.</p>
      </footer>

      {modalDate && (
        <MemoryModal
          tripId={tripId}
          date={modalDate}
          onClose={() => setModalDate(null)}
          onSaved={() => { setModalDate(null); reload(); showToast('Memory saved') }}
          onError={(m) => showToast(m)}
        />
      )}
    </>
  )
}
