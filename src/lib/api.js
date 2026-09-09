import { supabase } from './supabase'

export async function listTrips() {
  const { data, error } = await supabase.from('trips').select('*').order('start_date')
  if (error) throw error
  return data
}

export async function createTrip({ name, start_date, end_date, cities }) {
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({ name, start_date, end_date, cities })
    .select().single()
  if (error) throw error
  const days = []
  const d = new Date(start_date + 'T12:00:00')
  const end = new Date(end_date + 'T12:00:00')
  while (d <= end) {
    days.push({ trip_id: trip.id, date: d.toISOString().slice(0, 10) })
    d.setDate(d.getDate() + 1)
  }
  const { error: dErr } = await supabase.from('days').insert(days)
  if (dErr) throw dErr
  return trip
}

export async function loadTrip(tripId) {
  const [t, d, m, docs] = await Promise.all([
    supabase.from('trips').select('*').eq('id', tripId).single(),
    supabase.from('days').select('*').eq('trip_id', tripId).order('date'),
    supabase.from('memories').select('*').eq('trip_id', tripId).order('created_at'),
    supabase.from('documents').select('*').eq('trip_id', tripId).order('created_at'),
  ])
  if (t.error) throw t.error
  return { trip: t.data, days: d.data || [], memories: m.data || [], documents: docs.data || [] }
}

export async function updateDay(dayId, patch) {
  const { error } = await supabase.from('days').update(patch).eq('id', dayId)
  if (error) throw error
}

export async function addNote(tripId, day, text) {
  const { error } = await supabase.from('memories').insert({ trip_id: tripId, day, type: 'note', text })
  if (error) throw error
}

export async function addPhoto(tripId, day, blob) {
  const uid = (await supabase.auth.getUser()).data.user.id
  const path = `${uid}/${tripId}/${crypto.randomUUID()}.jpg`
  const { error: upErr } = await supabase.storage.from('trip-photos').upload(path, blob, { contentType: 'image/jpeg' })
  if (upErr) throw upErr
  const { error } = await supabase.from('memories').insert({ trip_id: tripId, day, type: 'photo', storage_path: path })
  if (error) throw error
}

export async function uploadDocument(tripId, place, category, title, file) {
  const uid = (await supabase.auth.getUser()).data.user.id
  const path = `${uid}/${tripId}/${crypto.randomUUID()}.pdf`
  const { error: upErr } = await supabase.storage.from('trip-documents').upload(path, file, { contentType: 'application/pdf' })
  if (upErr) throw upErr
  const { error } = await supabase.from('documents').insert({ trip_id: tripId, place, category, title, storage_path: path })
  if (error) throw error
}

export async function documentUrl(path) {
  const { data, error } = await supabase.storage.from('trip-documents').createSignedUrl(path, 120)
  if (error) throw error
  return data.signedUrl
}

export async function deleteDocument(doc) {
  await supabase.from('documents').delete().eq('id', doc.id)
  await supabase.storage.from('trip-documents').remove([doc.storage_path])
}

export async function setSharing(tripId, enabled) {
  const { error } = await supabase.from('trips').update({ share_enabled: enabled }).eq('id', tripId)
  if (error) throw error
}

export async function fetchSharedTrip(token) {
  const { data, error } = await supabase.rpc('get_shared_trip', { p_token: token })
  if (error) throw error
  return data
}
