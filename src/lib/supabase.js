import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://urawgirarhzesfszuobo.supabase.co'
export const supabase = createClient(SUPABASE_URL, 'sb_publishable_jsvpPYtWjN_7ao4E64qiXQ_rGFo8-By')

export function photoUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/trip-photos/${path}`
}
