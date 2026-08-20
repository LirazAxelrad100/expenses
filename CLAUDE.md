# Expenses tracker

A simple personal tool for Liraz to log expenses on the go and see monthly
spend broken down by category ("bucket"). Part of her PM git portfolio.

## Status
v1 built, deployed, and in real use. Live on Vercel (connected to GitHub repo
https://github.com/LirazAxelrad100/expenses, auto-deploys on push). Added to Liraz's iPhone
home screen as a full-screen web app.

## What's done
- Add-expense form: amount, item, bucket (dropdown, no default selection — must actively choose),
  where (optional), notes (optional)
- Buckets are editable in-app (add/delete) — not hardcoded, since Liraz expected to change them often
- Running monthly total, always visible, updates live
- This-month breakdown by bucket
- Recent expenses list — no delete; tapping "edit" loads the entry into the form to correct mistakes
  (Liraz's call: deleting isn't the expected action here, editing is)
- Backend: Supabase (Postgres + auto REST API), tables `buckets` and `expenses`, schema in schema.sql
- No login/auth — single user, RLS policies allow public access scoped to these two tables only
- Plain HTML/CSS/JS, no build step or framework, loads Supabase client from CDN
- iOS home screen support: apple-mobile-web-app meta tags (full-screen, no Safari address bar) +
  custom apple-touch-icon.png (dark square, white € symbol, matches the app's button color)

## Key decisions
- **Broad buckets, not granular ones** (e.g. "Groceries" not "Vegetables"/"Snacks"/etc). Liraz
  won't itemize a full supermarket receipt — fine-grained buckets would kill adoption. Buckets
  can be split further later if she actually wants that once she has real usage data.
- **Optional split for mixed trips**: not built in v1. For now a free-text `notes` field covers
  it (e.g. "big shop, mixed buckets"). Revisit if the notes-field approach turns out insufficient.
- **No offline support**: Liraz confirmed missing signal is rare enough not to design for.
- **No receipt/barcode scanning in v1**: real complexity (OCR APIs, per-item bucket matching),
  parked as a v2+ idea. Her supermarket receipts are in German (she lives in Germany), not Hebrew.
- **Hosting/tooling kept consistent with her other projects**: GitHub login for Supabase account,
  Vercel for hosting (same as her other site) — fewer accounts/logins to juggle.
- **Supabase "Automatically expose new tables" left off, RLS required explicit grants**: safer
  default. schema.sql includes explicit `grant` statements for the anon/authenticated roles since
  nothing is exposed automatically.

## Things to avoid / watch out for
- Don't name a JS variable `supabase` in app.js — the Supabase CDN library already defines a
  global with that name; declaring `const supabase = ...` crashes the whole script with a
  SyntaxError. Client is named `db` instead.
- Static files are served with no cache-busting, so during local testing the browser can serve a
  stale cached app.js after edits. If changes don't seem to apply when testing, hard refresh or
  bump a `?v=` query string on the script tag.

## Next
- Liraz to use it for real and revisit bucket granularity / the mixed-trip notes approach once
  she has actual usage
