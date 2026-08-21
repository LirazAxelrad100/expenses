# Expenses tracker

A simple personal tool for Liraz to log expenses on the go and see monthly
spend broken down by category ("bucket"). Part of her PM git portfolio.

## Status
v1 built, deployed, and in real use. Live on Vercel (connected to GitHub repo
https://github.com/LirazAxelrad100/expenses, auto-deploys on push). Added to Liraz's iPhone
home screen as a full-screen web app.

## What's done
- Add-expense form: amount, bucket (dropdown, no default selection — must actively choose),
  item (optional), where (optional), notes (optional)
- "This purchase covers more than one bucket" checkbox: reveals a "+ Add another bucket" button
  that appends extra amount+bucket rows below the main one (each becomes its own expense row,
  sharing the same item/place/notes). Unchecked, the form is untouched — this was a deliberate
  redesign after the first version replaced/hid the main fields, which confused Liraz
- Buckets are editable in-app (add/delete) — not hardcoded, since Liraz expected to change them often
- Running monthly total, always visible, updates live
- This-month breakdown by bucket
- Recent expenses list — no delete; tapping "edit" loads the entry into the form to correct mistakes
  (Liraz's call: deleting isn't the expected action here, editing is)
- Date field on the form (`expense_date` column), defaults to today, editable — lets Liraz log
  an expense for a day other than today. Monthly total/breakdown and "recent" ordering are based
  on this date, not on when the row was created, so a backdated entry lands in the right month
- Backend: Supabase (Postgres + auto REST API), tables `buckets` and `expenses`, schema in schema.sql
- No login/auth — single user, RLS policies allow public access scoped to these two tables only
- Plain HTML/CSS/JS, no build step or framework, loads Supabase client from CDN
- iOS home screen support: apple-mobile-web-app meta tags (full-screen, no Safari address bar) +
  custom apple-touch-icon.png (dark square, white € symbol, matches the app's button color)

## Key decisions
- **Broad buckets, not granular ones** (e.g. "Groceries" not "Vegetables"/"Snacks"/etc). Liraz
  won't itemize a full supermarket receipt — fine-grained buckets would kill adoption. Buckets
  can be split further later if she actually wants that once she has real usage data.
- **Split feature is for rare, clearly-known amounts — not routine categorization.** Liraz can't
  reliably eyeball how much of a supermarket cart was veg vs. cleaning vs. junk while at checkout,
  so splitting a whole trip into fine buckets isn't realistic. Guidance we landed on: log the
  whole trip under one broad bucket by default; only use split when you actually know a specific
  number on the spot (e.g. "the vacuum was clearly €45 of this €80"). A "subtract the junk items
  from the receipt total" workflow was proposed and rejected as still too fiddly for real use.
- **No offline support**: Liraz confirmed missing signal is rare enough not to design for.
- **No receipt/barcode scanning in v1**: this is the real fix for wanting granular insight
  (junk/sweets spend etc.) without manual splitting — OCR reads printed items/prices, app
  suggests a bucket per line, Liraz just corrects instead of calculating. Deliberately parked:
  it needs a server-side function (API keys can't live in client-side JS) and has a real
  per-receipt cost, a meaningfully bigger step than anything built so far. Liraz chose to use
  the app as-is for a while and revisit once the lack of junk/sweets tracking actually bothers her.
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
- Liraz to use it for real for a while
- Revisit receipt scanning (OCR, v2+) once the lack of junk/sweets-level insight actually bothers her
