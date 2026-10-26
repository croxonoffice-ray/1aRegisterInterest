# 1A Traveller — register interest page (1atraveller.com)

A single page: the 1A logo and tagline, a short welcome, and a box to register
interest by email. Emails are saved in the app's Supabase project, in the
`interest_signups` table.

## Files
- `index.html` — the page (everything in one file)
- `logo-1a-traveller-256.png`, `logo-1a-traveller-512.png` — logo and sharing image
- `robots.txt`, `sitemap.xml` — for search engines
- `vercel.json` — Vercel settings
- `migration-add-interest-signups.sql` — run once in Supabase (not part of the website)

## Set up
1. Supabase → SQL Editor: run `migration-add-interest-signups.sql`.
2. GitHub: new repository (e.g. `1a-traveller-landing`) with the files above.
3. Vercel: Add New → Project → import that repository → Deploy.
4. Vercel → the app's project → Settings → Domains: remove `1atraveller.com` and `www.1atraveller.com`.
   Then the new project → Settings → Domains: add both (www redirecting to 1atraveller.com).

## Seeing the list
Supabase → Table Editor → `interest_signups` (Export → CSV for a spreadsheet).
The `source` column shows where people came from, e.g. links ending `?utm_source=instagram`.
