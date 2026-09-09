# AGENTS.md - how an Instinct agent works on DreamTrail for a user

Product intent: the user should never have to type trip details. They drop
photos; the app files them. An agent fills in everything else (days, stays,
documents) from the user's booking confirmations when asked.

## Stack

- Vite + React static build on GitHub Pages (`gh-pages` branch, `/dreamtrail/` base).
- Supabase project `dreamtrail` (ref `urawgirarhzesfszuobo`): email+password auth,
  Postgres tables `trips/days/memories/documents` with owner-only RLS,
  storage buckets `trip-photos` (public read) and `trip-documents` (private),
  token-gated read-only share RPC `get_shared_trip(uuid)`.
- Schema: `supabase/schema.sql`. Migrations for the live DB:
  `supabase/migrations/*.sql` (apply via the dashboard SQL editor).

## Photo-first memories (what the user sees)

The Photos tab on a trip takes a batch drop of photos. The browser reads each
file's EXIF date (`DateTimeOriginal`, then file mtime as fallback) and GPS with
`exifr`, auto-assigns the photo to the matching trip day, and stores
`taken_at`/`lat`/`lng` on the memory row. Photos whose date falls outside the
trip land in a "Needs a day" bucket; every photo has a day picker for manual
moves. `memories.day` is nullable for this reason.

## Managing a user's trips as an agent (read/write)

Use `agent/dreamtrail-agent.mjs`. It talks to Supabase with the project's
publishable key plus the **user's own session** - so row-level security does
the scoping and the agent can only ever touch that user's data. There is no
service-role key anywhere in this path; never introduce one into the frontend
bundle or this CLI.

### Getting a session (preferred flow, no password in chat)

1. Open https://cool-instinct.github.io/dreamtrail/ in the cloud browser and
   sign in as the user with their vault entry (`dreamtrail-<name>`, vault fill).
2. Read the refresh token out of the signed-in page:

   ```js
   JSON.parse(localStorage.getItem('sb-urawgirarhzesfszuobo-auth-token')).refresh_token
   ```

3. Export it and run the CLI:

   ```bash
   export DREAMTRAIL_REFRESH_TOKEN=<token>
   node agent/dreamtrail-agent.mjs whoami
   ```

Fallback, only if the user explicitly shares their password:
`DREAMTRAIL_EMAIL` + `DREAMTRAIL_PASSWORD` env vars.

### Commands

```bash
node agent/dreamtrail-agent.mjs list-trips
node agent/dreamtrail-agent.mjs get-trip --trip <id>
node agent/dreamtrail-agent.mjs create-trip --name 'Japan in spring' \
  --start 2027-04-02 --end 2027-04-14 --cities 'Tokyo,Kyoto,Osaka'
node agent/dreamtrail-agent.mjs upsert-day --trip <id> --date 2027-04-03 \
  --city Kyoto --confirmed \
  --stay '{"name":"Hotel Gran Ms Kyoto","confirmed":true}' \
  --events '[{"time":"15:00","text":"Check in"},{"time":"18:30","text":"Gion walk"}]'
node agent/dreamtrail-agent.mjs add-note --trip <id> --day 2027-04-03 --text '...'
node agent/dreamtrail-agent.mjs add-document --trip <id> --place Kyoto \
  --category stay --title 'Hotel booking confirmation' --file ./booking.pdf
node agent/dreamtrail-agent.mjs delete-trip --trip <id>   # cascades rows; storage files stay
node agent/dreamtrail-agent.mjs signup --email <e> --password <p>  # test accounts only
```

`create-trip` generates one `days` row per date, same as the web app.
`add-document` uploads to `trip-documents` under the user's own folder (the
storage policy requires `<uid>/...`) and inserts the row.

### Typical task: populate a trip from booking confirmations

1. `create-trip` (or find it with `list-trips` if the user made one).
2. For each confirmation (flight, hotel, activity): `upsert-day` with the
   city/stay/events, `add-document` with the PDF.
3. Report the trip link: `https://cool-instinct.github.io/dreamtrail/#/trip/<id>`.

### Security rules

- Never use a service-role or DB superuser key for user-data writes. The
  publishable key + user session is the whole privilege model.
- Treat the refresh token like a password: env var only, never committed,
  never sent anywhere except `*.supabase.co`.
- Photos and documents stay inside the owner's rows; the share RPC is the only
  read path that bypasses RLS and it is token-gated and read-only.
- Clean up after smoke tests (`delete-trip`), and never delete or merge rows
  in a user's real trip without being asked.

## Deploying

```bash
npm run build                      # outputs dist/
git push origin main               # source
# publish dist/ to the gh-pages branch root (index.html + assets/)
```

Push access: fine-grained PAT `dreamtrail-deploy-agent` (repo-scoped,
Contents RW) in vault entry `github-dreamtrail-deploy-pat`, expires
2026-10-09 - regenerate in GitHub settings when it lapses.
