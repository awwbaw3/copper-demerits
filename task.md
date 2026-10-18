# Task Tracker — Copper Demerits (`copperdemerits.com`)

## Active Sprint — v1.3.0 (Isolated `copper_demerits` Schema & Itemized Demerit Type / Period Leaderboard)
- [x] Audit `Supabase5` (`iqbpnkttwtugxkospdqt`) structure and move all Copper Demerits tables out of `public` into isolated PostgreSQL schema `copper_demerits`
- [x] Verify `public` schema in `Supabase5` contains only its original 4 fantasy cache/keepalive tables (`api_cache`, `keepalives`, `leagues_cache`, `provider_accounts`)
- [x] Configure `src/lib/supabase.ts` to use `{ db: { schema: 'copper_demerits' } }` and verify live PostgREST access
- [x] Track itemized number (`points`) and category (`type`) of demerits on each slip via `demerit_items` JSONB
- [x] Calculate Leaderboard standings by selectable Period (`All-Time`, `This Month`, `This Week`, `Oct 17 Session`, `Custom Date Range`) and by Demerit Type
- [x] Complete VD/VDC workflow (`v1.3.0`) and deploy to `https://copperdemerits.com`
