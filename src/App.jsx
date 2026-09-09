import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Landing from './components/Landing'
import TripList from './components/TripList'
import TripDetail from './components/TripDetail'
import ShareView from './components/ShareView'
import Toast from './components/Toast'
import Lightbox from './components/Lightbox'

function parseHash() {
  const h = window.location.hash
  if (h.startsWith('#access_token') || h.startsWith('#/access_token')) return { name: 'auth-return' }
  const mTrip = h.match(/^#\/trip\/([0-9a-f-]{36})$/i)
  if (mTrip) return { name: 'trip', id: mTrip[1] }
  const mShare = h.match(/^#\/share\/([0-9a-f-]{36})$/i)
  if (mShare) return { name: 'share', token: mShare[1] }
  return { name: 'home' }
}

export default function App() {
  const [route, setRoute] = useState(parseHash)
  const [session, setSession] = useState(undefined)
  const [toast, setToast] = useState(null)
  const [lightboxSrc, setLightboxSrc] = useState(null)

  const showToast = useCallback((msg) => setToast({ id: Date.now(), msg }), [])

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s)
      if (s && parseHash().name === 'auth-return') window.location.hash = '#/'
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  let body
  if (route.name === 'share') {
    body = <ShareView token={route.token} onPhotoClick={setLightboxSrc} />
  } else if (session === undefined) {
    body = <div className="loading">Loading...</div>
  } else if (!session) {
    body = <Landing />
  } else if (route.name === 'trip') {
    body = <TripDetail tripId={route.id} showToast={showToast} onPhotoClick={setLightboxSrc} />
  } else {
    body = <TripList session={session} showToast={showToast} />
  }

  return (
    <>
      <div className="wrap">{body}</div>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      <Toast toast={toast} />
    </>
  )
}
