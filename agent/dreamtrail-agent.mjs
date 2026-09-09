#!/usr/bin/env node
// DreamTrail agent CLI - manage trips/days/documents on a user's behalf.
// Auth: the user's own Supabase session (refresh token or email+password), so
// every call runs under row-level security exactly like the web app.
// See AGENTS.md for the full flow. Never use a service-role key here.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const SUPABASE_URL = process.env.DREAMTRAIL_SUPABASE_URL || 'https://urawgirarhzesfszuobo.supabase.co'
const PUBLISHABLE_KEY =
  process.env.DREAMTRAIL_PUBLISHABLE_KEY || 'sb_publishable_jsvpPYtWjN_7ao4E64qiXQ_rGFo8-By'

const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const cmd = process.argv[2]
const arg = (flag) => {
  const i = process.argv.indexOf(flag)
  return i > -1 ? process.argv[i + 1] : null
}
const need = (flag) => arg(flag) ?? fail(`missing ${flag}`)
const has = (flag) => process.argv.includes(flag)
function fail(msg) {
  console.error('error: ' + msg)
  process.exit(1)
}
const out = (v) => console.log(JSON.stringify(v, null, 2))

async function auth() {
  const rt = process.env.DREAMTRAIL_REFRESH_TOKEN
  if (rt) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: rt })
    if (error) fail('refresh token rejected: ' + error.message)
    return data.user
  }
  const email = process.env.DREAMTRAIL_EMAIL
  const password = process.env.DREAMTRAIL_PASSWORD
  if (email && password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) fail('sign-in failed: ' + error.message)
    return data.user
  }
  fail('no credentials: set DREAMTRAIL_REFRESH_TOKEN (preferred, see AGENTS.md) or DREAMTRAIL_EMAIL + DREAMTRAIL_PASSWORD')
}

async function main() {
  if (cmd === 'signup') {
    // Provision an account (e.g. a test account) with credentials you generated.
    const email = need('--email')
    const password = need('--password')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) fail('signup failed: ' + error.message)
    if (!data.session) fail('signup needs email confirmation - check project auth settings')
    out({ user_id: data.user.id, email: data.user.email })
    return
  }

  const user = await auth()

  if (cmd === 'whoami') {
    out({ user_id: user.id, email: user.email })
  } else if (cmd === 'list-trips') {
    const { data, error } = await supabase.from('trips').select('id,name,start_date,end_date,cities').order('start_date')
    if (error) fail(error.message)
    out(data)
  } else if (cmd === 'get-trip') {
    const id = need('--trip')
    const [t, d, m, docs] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('days').select('*').eq('trip_id', id).order('date'),
      supabase.from('memories').select('*').eq('trip_id', id).order('created_at'),
      supabase.from('documents').select('*').eq('trip_id', id).order('created_at'),
    ])
    if (t.error) fail(t.error.message)
    out({ trip: t.data, days: d.data, memories: m.data, documents: docs.data })
  } else if (cmd === 'create-trip') {
    const name = need('--name')
    const start = need('--start')
    const end = need('--end')
    const cities = (arg('--cities') || '').split(',').map((c) => c.trim()).filter(Boolean)
    if (end < start) fail('--end is before --start')
    const { data: trip, error } = await supabase
      .from('trips')
      .insert({ name, start_date: start, end_date: end, cities })
      .select()
      .single()
    if (error) fail(error.message)
    const days = []
    const d = new Date(start + 'T12:00:00')
    const last = new Date(end + 'T12:00:00')
    while (d <= last) {
      days.push({ trip_id: trip.id, date: d.toISOString().slice(0, 10) })
      d.setDate(d.getDate() + 1)
    }
    const { error: dErr } = await supabase.from('days').insert(days)
    if (dErr) fail(dErr.message)
    out({ trip_id: trip.id, days_created: days.length })
  } else if (cmd === 'upsert-day') {
    const trip = need('--trip')
    const date = need('--date')
    const patch = {}
    if (arg('--city')) patch.city = arg('--city')
    if (has('--confirmed')) patch.confirmed = true
    if (arg('--events')) patch.events = JSON.parse(arg('--events'))
    if (arg('--stay')) patch.stay = JSON.parse(arg('--stay'))
    const { data: existing } = await supabase.from('days').select('id').eq('trip_id', trip).eq('date', date).maybeSingle()
    if (existing) {
      const { error } = await supabase.from('days').update(patch).eq('id', existing.id)
      if (error) fail(error.message)
      out({ day_id: existing.id, updated: true })
    } else {
      const { data, error } = await supabase.from('days').insert({ trip_id: trip, date, ...patch }).select().single()
      if (error) fail(error.message)
      out({ day_id: data.id, updated: false })
    }
  } else if (cmd === 'add-note') {
    const { error } = await supabase.from('memories').insert({
      trip_id: need('--trip'),
      day: need('--day'),
      type: 'note',
      text: need('--text'),
    })
    if (error) fail(error.message)
    out({ added: 'note' })
  } else if (cmd === 'add-document') {
    const trip = need('--trip')
    const file = need('--file')
    if (!file.toLowerCase().endsWith('.pdf')) fail('documents are PDFs (same as the web app)')
    const path = `${user.id}/${trip}/${randomUUID()}.pdf`
    const bytes = readFileSync(file)
    const { error: upErr } = await supabase.storage
      .from('trip-documents')
      .upload(path, bytes, { contentType: 'application/pdf' })
    if (upErr) fail(upErr.message)
    const { data, error } = await supabase
      .from('documents')
      .insert({
        trip_id: trip,
        place: need('--place'),
        category: need('--category'),
        title: arg('--title') || file.split('/').pop(),
        storage_path: path,
      })
      .select()
      .single()
    if (error) fail(error.message)
    out({ document_id: data.id, storage_path: path })
  } else if (cmd === 'delete-trip') {
    // Cascades to days/memories/documents rows. Storage objects are left in
    // place deliberately: removing shared photos could break other trips.
    const { error } = await supabase.from('trips').delete().eq('id', need('--trip'))
    if (error) fail(error.message)
    out({ deleted: true })
  } else {
    console.log(`DreamTrail agent CLI

auth (env):  DREAMTRAIL_REFRESH_TOKEN   preferred - session token from the signed-in web app (AGENTS.md)
             DREAMTRAIL_EMAIL + DREAMTRAIL_PASSWORD   only if the user shared their password

commands:
  whoami
  list-trips
  get-trip --trip <id>
  create-trip --name <n> --start <YYYY-MM-DD> --end <YYYY-MM-DD> [--cities a,b,c]
  upsert-day --trip <id> --date <YYYY-MM-DD> [--city X] [--confirmed] [--events '<json>'] [--stay '<json>']
  add-note --trip <id> --day <YYYY-MM-DD> --text <t>
  add-document --trip <id> --place <city> --category stay|transport|activity --title <t> --file <path.pdf>
  delete-trip --trip <id>
  signup --email <e> --password <p>   (provision a test account; no user credentials needed)`)
  }
}

main().catch((e) => fail(e.message))
