import exifr from 'exifr'

// EXIF dates carry no timezone - they are the camera's local clock, which for a
// traveller IS the trip's local day. Read the raw "YYYY:MM:DD HH:MM:SS" string
// (translateValues:false keeps exifr from timezone-guessing) and take the
// calendar date straight from it.

function parseExifDate(v) {
  if (v instanceof Date && !isNaN(v)) {
    const pad = (n) => String(n).padStart(2, '0')
    return {
      day: `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`,
      date: v,
    }
  }
  const m = typeof v === 'string' && v.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  return { day: `${y}-${mo}-${d}`, date: new Date(+y, +mo - 1, +d, +h, +mi, +(s || 0)) }
}

export async function readPhotoMeta(file) {
  let day = null
  let takenAt = null
  let lat = null
  let lng = null

  try {
    const raw = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'],
      translateValues: false,
    })
    const parsed =
      raw &&
      (parseExifDate(raw.DateTimeOriginal) ||
        parseExifDate(raw.CreateDate) ||
        parseExifDate(raw.ModifyDate))
    if (parsed) {
      day = parsed.day
      takenAt = parsed.date.toISOString()
    }
  } catch {
    /* no usable EXIF date - file date fallback below */
  }

  try {
    const gps = await exifr.gps(file)
    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
      lat = gps.latitude
      lng = gps.longitude
    }
  } catch {
    /* no GPS - fine */
  }

  if (!day && file.lastModified) {
    const d = new Date(file.lastModified)
    const pad = (n) => String(n).padStart(2, '0')
    day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    takenAt = d.toISOString()
  }

  return { day, takenAt, lat, lng }
}
