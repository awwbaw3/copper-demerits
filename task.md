# Task Tracker — Copper Demerits (`copperdemerits.com`)

## Active Sprint — v1.3.1 (Add `docs/28318.jpg` David Lee Slip + Isolated `copper_demerits` Schema & Itemized Demerit Types)
- [x] Audit `Supabase5` (`iqbpnkttwtugxkospdqt`) structure and move all Copper Demerits tables out of `public` into isolated PostgreSQL schema `copper_demerits`
- [x] Verify `public` schema in `Supabase5` contains only its original 4 fantasy cache/keepalive tables (`api_cache`, `keepalives`, `leagues_cache`, `provider_accounts`)
- [x] Track itemized number (`points`) and category (`type`) of demerits on each slip via `demerit_items` JSONB
- [x] Calculate Leaderboard standings by selectable Period (`All-Time`, `This Month`, `This Week`, `Oct 17 Session`, `Custom Date Range`) and by Demerit Type
- [x] Add `docs/28318.jpg` (`David Lee`, `6:27 PM`, `1 - so far` demerit for `"back talk, insubordinate"`, signed `"The Boss Lady"` → `Sarah`) to `copper_demerits` DB, Supabase `slips` Storage, and frontend fallback data
- [x] Complete VD/VDC workflow (`v1.3.1`) and deploy to `https://copperdemerits.com`
