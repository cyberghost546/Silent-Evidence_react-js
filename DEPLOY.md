# Putting Silent Evidence online

A step-by-step guide. You need a GitHub account (the code is pushed
there) and free accounts at **Render** (Django + database) and
**Vercel** (React). Nothing here costs money, except the optional disk
for uploaded pictures (step 2.4).

```
 visitor ──> your-site.vercel.app ──┬── React pages (built by Vercel)
                                    │
                                    └── /api, /media, /admin ... ──> Django on Render ──> Postgres
```

**Why this shape?** The browser only ever talks to ONE site
(`your-site.vercel.app`). Vercel quietly forwards `/api/...` to Django
(the "rewrites" in `frontend/vercel.json`). So the login cookie and the
CSRF cookie belong to your site, and they just work. With two separate
addresses, browsers block those cookies and every login would fail.

---

## 1. Before you start

- [ ] All tests pass: `python manage.py test` (backend) and `npm test` (frontend)
- [ ] The code is pushed to GitHub
- [ ] Maintenance mode: decide if the new site starts open or closed
      (Dashboard → Site Settings - it's a setting in the database, so a
      new database starts **open**)

## 2. Django on Render

### 2.1 The database
Render → **New → Postgres**. Any name, free plan. When it's ready,
copy its **Internal Database URL** (starts with `postgres://`).

### 2.2 The web service
Render → **New → Web Service** → pick your GitHub repo.

| Field | Value |
| --- | --- |
| Root Directory | `backend` |
| Runtime | Python |
| Build Command | `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate` |
| Start Command | `gunicorn config.wsgi --bind 0.0.0.0:$PORT` |

### 2.3 Environment variables
Service → **Environment**. The full list, with explanations, is in
`backend/.env.example`. The ones you must set:

| Name | Value |
| --- | --- |
| `DJANGO_DEBUG` | `false` |
| `DJANGO_SECRET_KEY` | a long random text - make one with `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DJANGO_ALLOWED_HOSTS` | your Render address without `https://`, e.g. `silent-evidence.onrender.com` |
| `FRONTEND_ORIGINS` | your Vercel address with `https://` (you get it in step 3 - come back and fill it in) |
| `SITE_URL` | the same Vercel address |
| `DATABASE_URL` | the address from 2.1 |
| `TRUSTED_PROXY_COUNT` | `2` (check it in step 5) |
| `PYTHON_VERSION` | the version you use locally, e.g. `3.14.7` (`python --version`) |

Optional: `EMAIL_HOST` + friends for real emails (step 4),
`ANTHROPIC_API_KEY` for the AI pages.

### 2.4 Uploaded pictures (avatars, covers, slides)
Render's normal disk is **wiped on every deploy** - uploaded pictures
would disappear. Two choices:

- **Render Disk** (small monthly cost): service → **Disks** → mount path
  `/var/data/media`, then set `MEDIA_ROOT=/var/data/media`. Done.
- **Free, for trying it out:** skip it, and know that uploads vanish on
  each deploy.

(A bigger site would store pictures in a file service like S3 or
Cloudinary with `django-storages` - a nice next project.)

### 2.5 Your admin account
Service → **Shell**: `python manage.py createsuperuser`.
(Your local database - users, stories - is NOT copied. The live site
starts empty. The categories come from migrations if you made them
that way; otherwise add them in the Dashboard.)

## 3. React on Vercel

1. Open `frontend/vercel.json` and replace every
   `YOUR-BACKEND.onrender.com` with your Render address. Commit + push.
2. Vercel → **Add New → Project** → your repo.
   - Root Directory: `frontend`
   - Framework: Vite (found automatically)
   - Environment Variable: `VITE_API_URL` = *(empty)* - see `frontend/.env.example`
3. Deploy. Copy your address (`https://….vercel.app`), put it in
   `FRONTEND_ORIGINS` and `SITE_URL` on Render (step 2.3), and let Render
   redeploy.

## 4. Real emails (optional)

Without `EMAIL_HOST`, emails are only printed in Render's logs (and
still show in Dashboard → Email Log). To really send them, make an
account at a mail service (Resend, SendGrid, Brevo...), verify your
domain there, and set on Render:
`EMAIL_HOST`, `EMAIL_PORT` (usually 587), `EMAIL_HOST_USER`,
`EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`.
Test with Dashboard → Newsletter → "Send test".

## 4b. Phone notifications (optional)

Run this ONCE on your computer (in `backend`, with the venv on):

```bash
python manage.py make_push_keys
```

It prints three lines. Add them on Render → Environment
(`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT`), and put your
real email in the last one. The private key is a secret: never in git.
Members can then switch on Settings → Notifications → **Phone
notifications**. Without the keys the switch says "Coming soon" and
nothing else changes.

## 4c. Payments: Pro and candles (optional)

Without this, the Pro page says "Payments open soon" and the candle
button is hidden - everything else works. (On your computer there's a
pretend payment page instead, so you can try it all without Stripe.)

1. Make an account on [stripe.com](https://stripe.com). You must be 18+
   to own it; it asks for a bank account to pay you.
2. **Start in test mode** (the "Test mode" switch in Stripe's
   dashboard). Test payments use fake cards like `4242 4242 4242 4242`
   (any future date, any CVC) - no real money.
3. Developers → API keys: copy the **Secret key** (`sk_test_...`).
   On Render → Environment add `STRIPE_SECRET_KEY` = that key.
4. Developers → Webhooks → **Add endpoint**:
   - URL: `https://<your-render-address>/api/payments/stripe-webhook/`
   - Events: `checkout.session.completed` and
     `checkout.session.async_payment_succeeded`
   - Copy its **Signing secret** (`whsec_...`) into
     `STRIPE_WEBHOOK_SECRET` on Render.
5. Buy Pro with the test card. After a few seconds the "Thank you"
   page should say "You're Pro now". If it keeps waiting, the webhook
   isn't arriving: check step 4 (Stripe shows each attempt and its
   error under Developers → Webhooks).
6. Ready for real money? Switch Stripe to live mode, make a **new**
   webhook there (live mode has its own), and replace both keys with the
   `sk_live_...` / live `whsec_...` ones.

Both keys are secrets: only in Render's settings, never in git.
Prices are in `backend/payments/prices.py`; the currency is
`CURRENCY` in `config/settings.py` (EUR).

**Candles:** the money arrives in YOUR Stripe account. Dashboard →
Revenue lists what you owe each writer (90% of their candles); send it
to them and click "Mark as paid out".

## 5. Check that everything works

- [ ] The homepage loads, with categories
- [ ] Sign up, log out, log in (this proves the cookies work)
- [ ] Write a story with a cover picture, and see the picture
- [ ] `https://your-site.vercel.app/admin/` shows Django's admin with its styling
- [ ] `/robots.txt` and `/sitemap.xml` show your Vercel address
- [ ] **The app:** on your phone, open the site in Chrome (Android) and
  use "Install the app" in the footer - or in Safari (iPhone) tap
  Share → *Add to Home Screen*. It should open full-screen with the
  red "SE" icon. Then switch on airplane mode and open it: you should
  see "The line went dead." (the offline page), not the browser's error.
  (The service worker in `frontend/public/sw.js` only runs on the built,
  HTTPS site - never on `npm run dev`.)
- [ ] **Real IP addresses:** log in, then open Dashboard → Login Logs.
  Your own IP should be there (compare with a "what is my IP" site).
  - It shows a Vercel/Render address instead → try `TRUSTED_PROXY_COUNT=1` or `3`.
  - Getting it right matters: the login lock, the IP Blocklist and the
    rate limits all use this address. A wrong value can lock out
    everybody at once, or let people fake their address.

## 6. Backups

Your members' stories live in the database - back it up.

```bash
python manage.py backup_site             # -> backups/backup-<date>.zip (keeps the newest 10)
python manage.py restore_site backups/backup-<date>.zip
```

The .zip holds the whole database (`data.json`) **and** the uploaded
pictures. It works for SQLite and Postgres alike - you can even move
your local test data to the live site with it.

- **By hand:** before every big change (a new migration, a big import).
- **Every night on Render:** New → **Cron Job**, same repo, Root Directory
  `backend`, schedule `0 3 * * *` (03:00 every night), command
  `python manage.py backup_site`. Give it the same environment variables
  as the web service. The backups land on the service's disk, so point
  `BACKUP_DIR` at your persistent disk (e.g. `/var/data/backups`), and
  now and then download one to your own computer - a backup on the same
  server as the site doesn't help if that server is lost.
- **Restoring** is safest on a fresh database: `migrate`, then `restore_site`.

## 7. Weekly emails (optional)

Two more Render **Cron Jobs**, set up the same way as the nightly backup
(same repo, Root Directory `backend`, same environment variables):

| Name | Schedule | Command |
| --- | --- | --- |
| Top of the week | `0 8 * * 1` (08:00 every Monday) | `python manage.py send_weekly_top` |
| Comment digest | `0 9 * * 1` (09:00 every Monday) | `python manage.py send_comment_digests weekly` |
| Writers you follow | `0 7 * * *` (07:00 every day) | `python manage.py send_follow_digest` |

Both only email members who switched the digest on in Settings, and
"Top of the week" skips quiet weeks. You can preview it any time in
Dashboard → Newsletter. Real emails need step 4 first.

## If something goes wrong

| What you see | Likely cause |
| --- | --- |
| Render build fails on `DJANGO_SECRET_KEY` | the variable isn't set (step 2.3) |
| "Bad Request (400)" from Django | `DJANGO_ALLOWED_HOSTS` doesn't match the Render address |
| Logging in "works" but you're logged out again | `VITE_API_URL` isn't empty, so the browser talks to Render directly - make it empty and redeploy |
| "CSRF verification failed" | `FRONTEND_ORIGINS` doesn't exactly match the Vercel address (`https://`, no `/` at the end) |
| Pages work, refreshing one gives a Vercel 404 | the last rewrite in `vercel.json` is missing |
| Uploaded pictures disappear | no persistent disk (step 2.4) |
| Admin has no styling | `collectstatic` isn't in the Build Command |

Render's **Logs** tab shows Django's errors - start there.
