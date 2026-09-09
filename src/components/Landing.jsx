import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Auth: Supabase email+password (email confirmation disabled in project settings).
// To add Google later: enable the provider in Supabase Auth and render a
// signInWithOAuth({ provider: 'google' }) button here.

export default function Landing() {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const go = async () => {
    if (!email.includes('@')) { setMsg('Enter a valid email'); return }
    if (password.length < 6) { setMsg('Password needs at least 6 characters'); return }
    setBusy(true); setMsg(null)
    const { error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) { setMsg(error.message); return }
    // onAuthStateChange in App takes it from here
  }

  return (
    <div className="landing">
      <div className="eyebrow">DreamTrail</div>
      <h1>Every trip, one timeline.</h1>
      <p className="subtitle">Plan the days, keep the documents, save the memories - and share the story with a link.</p>

      <div className="authbox">
        <input
          type="email" placeholder="you@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password" placeholder="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
        />
        <button className="btn solid" disabled={busy} onClick={go}>
          {busy ? 'One moment...' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        <button className="linklike" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(null) }}>
          {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
        {msg && <p className="authbox-err">{msg}</p>}
      </div>
      <p className="landing-note">Have a share link? It works without signing in.</p>
    </div>
  )
}
