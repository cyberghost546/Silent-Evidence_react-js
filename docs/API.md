# The Silent Evidence API - a guide

Everything the website does goes through this API: the React site is just
one program that calls it. Another project - a second website, a phone app,
a Discord bot, a Python script - can call the same addresses.

This guide explains **how to use it**. The full list of all 213 addresses
(each with its methods, who may use it, and what it does) is in
**[API-reference.md](API-reference.md)**.

---

## Contents

1. [The basics](#1-the-basics)
2. [Logging in: cookies and CSRF](#2-logging-in-cookies-and-csrf)
3. [Calling it from another project](#3-calling-it-from-another-project)
4. [Errors](#4-errors)
5. [Limits](#5-limits)
6. [Pictures and files](#6-pictures-and-files)
7. [The main things, with examples](#7-the-main-things-with-examples)
8. [Rules the API enforces for you](#8-rules-the-api-enforces-for-you)
9. [Finding everything else](#9-finding-everything-else)
10. [Adding a new address](#10-adding-a-new-address)

---

## 1. The basics

**Where it lives**

| | Address |
| --- | --- |
| On your computer | `http://localhost:8000` (`python manage.py runserver`) |
| Live | your Render address, e.g. `https://silent-evidence.onrender.com` |
| Live, through the website | `https://your-site.vercel.app/api/...` (Vercel passes `/api/...` on to Render - see `frontend/vercel.json`) |

Every address starts with `/api/` and **ends with a `/`**:
`/api/stories/5/`, not `/api/stories/5`. (Without the slash Django answers
with a redirect, and a POST gets lost on the way.)

**JSON in, JSON out.** Answers are JSON. You send JSON too, with the header
`Content-Type: application/json` - except when you upload a file (a cover,
an avatar, a Word document): then you send `multipart/form-data` (in
JavaScript: a `FormData` object). Both work for every address.

**Try it right now** - no login needed to read:

```bash
curl http://localhost:8000/api/stories/
```

Or just open that address in your browser: Django REST framework shows a
readable page with the answer.

**Methods** - the usual meaning:

| Method | Means |
| --- | --- |
| `GET` | read (never changes anything) |
| `POST` | create something, or do an action (like, follow, log in) |
| `PATCH` | change some fields of one thing |
| `PUT` | replace one thing completely (rarely used here) |
| `DELETE` | remove it |

**Dates** are ISO 8601 in UTC: `"2026-10-01T09:35:00.798314Z"`. In
JavaScript, `new Date(value)` reads them.

**Money** is text with two decimals, `"3.99"` - never a float (see
`backend/payments/models.py` for why).

---

## 2. Logging in: cookies and CSRF

The API uses Django's normal login: a **session cookie**. There are no API
keys or tokens to handle by hand. This is the part that trips people up, so
here it is step by step.

### What happens

1. You `POST /api/accounts/login/` with a username (or email) and password.
2. Django answers with the user's details AND two cookies:
   - `sessionid` - "this is Christopher". Sent back on every request, it
     keeps you logged in (for two weeks).
   - `csrftoken` - a random value you must COPY into a header on every
     request that changes something.
3. From then on: send both cookies with every request, and for `POST`,
   `PATCH`, `PUT` and `DELETE` also send the header `X-CSRFToken: <the
   csrftoken value>`.

### Why the CSRF token?

Without it, any other website could make your browser send "delete my
account" to our site - and your browser would helpfully attach your login
cookie. A site on another domain can't READ our `csrftoken` cookie, so it
can't put the right value in the header. Django refuses any change that
doesn't have it.

### Tested behaviour (so you know what to expect)

| You send | Answer |
| --- | --- |
| `POST /api/accounts/login/` with no token | `200` - logging in needs no token |
| A change (e.g. like) while logged in, no `X-CSRFToken` | `403 {"detail": "CSRF Failed: CSRF token missing."}` |
| The same, with `X-CSRFToken` | `200` |
| Over **https**, with the token but no `Origin`/`Referer` header | `403 {"detail": "CSRF Failed: Referer checking failed - no Referer."}` |
| Over https, with the token and `Origin: <an allowed address>` | `200` |
| A change while logged OUT | `403 {"detail": "Authentication credentials were not provided."}` |

Browsers send `Origin` by themselves. **Scripts and phone apps must add it**
when talking to the live (https) site - use the site's own address, e.g.
`Origin: https://your-site.vercel.app` (it must be in `FRONTEND_ORIGINS`).

### Getting a `csrftoken` before logging in

`GET /api/accounts/me/` always sets the `csrftoken` cookie (even when
nobody is logged in - then it answers `204 No Content`). The React site does
this once when it starts (`frontend/src/auth/AuthContext.jsx`).

### Logging out

`POST /api/accounts/logout/` -> `204`. The session is deleted on the server,
so the old cookie stops working even if someone copied it.

---

## 3. Calling it from another project

### a) Another website, in the browser

Browsers are strict about cookies between different sites. Two ways:

**The easy way (recommended): put the API under your own address.**
Make your website's server pass `/api/...` on to Django, the same way the
Silent Evidence site does. Then, to the browser, the API is on YOUR site:
no CORS, and the cookies just work.

- With Vite (while developing) - `vite.config.js`:
  ```js
  server: { proxy: { '/api': 'http://localhost:8000' } }
  ```
- With Vercel (live) - `vercel.json`:
  ```json
  { "rewrites": [{ "source": "/api/:path*", "destination": "https://YOUR-BACKEND.onrender.com/api/:path*" }] }
  ```
- Netlify, Nginx, Next.js... all have the same "rewrite"/"proxy" idea.

**The other way: call Django's address directly.** Add your website's
address to `FRONTEND_ORIGINS` on Render (comma-separated, e.g.
`https://silentevidence.app,https://my-other-site.com`). That one setting
fills both `CORS_ALLOWED_ORIGINS` (may this site read our answers?) and
`CSRF_TRUSTED_ORIGINS` (may this site send changes?). Then:

```js
fetch('https://YOUR-BACKEND.onrender.com/api/stories/', { credentials: 'include' })
```

`credentials: 'include'` = "send and accept cookies". Catch: if your site
and the API are on **different domains**, browsers block the login cookie
(it's `SameSite=Lax`) - reading public data works, logging in doesn't. To
allow it you'd set `SESSION_COOKIE_SAMESITE = 'None'` and
`CSRF_COOKIE_SAMESITE = 'None'` in `settings.py` (https only) - and some
browsers (Safari) block those "third-party cookies" anyway. That's why the
easy way above is recommended.

A ready-made, commented `fetch` helper with the CSRF handling is in
`frontend/src/api/core.js` (`getJSON`, `authRequest`) - copy it.

### b) A phone app, a bot or a script (not a browser)

No CORS here (that's a browser rule). You only need to **keep the cookies**
between requests (a "cookie jar") and add the two headers.

**Python** (`pip install requests`):

```python
import requests

SITE = 'http://localhost:8000'          # or the live https address
session = requests.Session()             # a Session keeps cookies by itself

# 1. Log in - no token needed for this one.
answer = session.post(f'{SITE}/api/accounts/login/', json={'username': 'raven', 'password': '...'})
answer.raise_for_status()                # stop here if it failed
print('Hello', answer.json()['username'])

# 2. Every change: copy the csrftoken cookie into the header.
#    Origin: needed on https (see section 2).
headers = {'X-CSRFToken': session.cookies['csrftoken'], 'Origin': 'http://localhost:5173'}
answer = session.post(f'{SITE}/api/stories/5/like/', headers=headers)
print(answer.json())                     # {'liked': True, 'like_count': 13}
```

**Node.js 18+ / React Native** - `fetch` doesn't keep cookies in Node, so
copy them by hand (React Native's fetch keeps them by itself on iOS/Android):

```js
const SITE = 'http://localhost:8000'

const login = await fetch(`${SITE}/api/accounts/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'raven', password: '...' }),
})
// getSetCookie() = the cookies Django sent, e.g. ['sessionid=abc; ...', 'csrftoken=xyz; ...']
const cookies = login.headers.getSetCookie().map(c => c.split(';')[0])   // ['sessionid=abc', 'csrftoken=xyz']
const csrf = cookies.find(c => c.startsWith('csrftoken=')).split('=')[1]

const like = await fetch(`${SITE}/api/stories/5/like/`, {
    method: 'POST',
    headers: { Cookie: cookies.join('; '), 'X-CSRFToken': csrf, Origin: 'http://localhost:5173' },
})
console.log(await like.json())
```

**curl** - `-c` saves cookies to a file, `-b` sends them:

```bash
curl -c jar.txt -H "Content-Type: application/json" \
     -d '{"username":"raven","password":"..."}' http://localhost:8000/api/accounts/login/
# Look up the csrftoken value in jar.txt, then:
curl -b jar.txt -X POST -H "X-CSRFToken: <value>" http://localhost:8000/api/stories/5/like/
```

---

## 4. Errors

Look at the **status code** first, then the JSON body.

| Code | Means | Typical body |
| --- | --- | --- |
| `200` | OK | the answer |
| `201` | Created (sign-up, new story, new comment...) | the new thing |
| `204` | OK, nothing to send back (logout, delete; `/me/` when logged out) | empty |
| `400` | What you sent isn't right | `{"title": ["This field is required."]}` - one list of messages **per field** |
| `403` | Not allowed: not logged in, not yours, admins only, CSRF missing, banned, or a Pro-only feature | `{"detail": "..."}` (Pro features add `"pro_required": true`) |
| `404` | Doesn't exist **or you may not see it** (a draft, a blocked writer, a private profile) - on purpose the same answer, so nobody can find out it exists | `{"detail": "Not found."}` |
| `429` | Too many tries - wait (see [Limits](#5-limits)) | `{"detail": "Request was throttled. Expected available in 3540 seconds."}` |
| `500` | A bug on our side | an HTML error page (not JSON!) |
| `502` / `503` | An outside service (Claude, Stripe) failed or isn't set up | `{"detail": "..."}` |

The two body shapes:

```json
{ "detail": "You can't light a candle for your own story." }
```
```json
{ "username": ["A user with that username already exists."],
  "password": ["This password is too common."] }
```

The React site turns both into `error.data` (see `authRequest` in
`frontend/src/api/core.js`) and shows the field messages under the right
input.

---

## 5. Limits

Some addresses count requests per IP address (or per account) and answer
`429` when it's too many:

| What | Limit |
| --- | --- |
| Sign up | 10 per hour per IP |
| Password reset emails | 5 per hour |
| "Send the confirmation email again" | 3 per hour |
| Contact form | 20 per hour |
| Error reports from the browser | 30 per hour |
| Starting a writing sprint | 10 per hour |
| **Log in** | after too many wrong passwords the account+IP is **locked** for a while (`429`, "Too many failed attempts. Try again in N minutes."). Admins set the numbers on Dashboard -> Rate Limits. |
| Claude feedback on a story | 3 a month, Pro: 5 a day (`429` with the reason) |

Admins can change the main rate limits on Dashboard -> Rate Limits, and
block IP addresses (Dashboard -> IP Blocklist): a blocked address gets `403`
on everything.

---

## 6. Pictures and files

Uploaded files come back as a **path**, not a full address:

```json
"cover_image": "/media/stories/house.jpg",
"avatar": "/media/avatars/raven.png"
```

Put the API's address in front: `http://localhost:8000/media/stories/house.jpg`.
`null` or `""` = no picture.

But: a writer can also paste the address of a picture on the internet. Then
`cover_image` is already a full address (`"https://..."`) - use it as it is.
So the rule is: **starts with `http` -> use it; starts with `/` -> put the
API's address in front.** React does exactly that in `mediaUrl()` in
`frontend/src/api/core.js`.

To **upload**, send `multipart/form-data`:

```js
const data = new FormData()
data.append('title', 'The Well')
data.append('cover_image', fileFromAnInput)     // a File object
await fetch('/api/stories/new/', { method: 'POST', body: data, credentials: 'include', headers: { 'X-CSRFToken': csrf } })
// Don't set Content-Type yourself for FormData - the browser adds it (with the "boundary").
```

Limits: pictures 5 MB, narration audio 25 MB (MP3/M4A/OGG/WAV), Word
documents for import 5 MB.

---

## 7. The main things, with examples

All answers below are real ones (made with test data), shortened where it
says `...`.

### Who am I?

`GET /api/accounts/me/` - anyone

- Logged out: `204` (empty).
- Logged in: `200`

```json
{
  "id": 2,
  "username": "night_owl",
  "email": "owl@example.com",
  "is_staff": false,
  "email_verified": false,
  "age_confirmed": false,
  "is_adult": false,
  "avatar": "",
  "is_premium": false
}
```

`is_staff` = admin. `is_premium` = Pro. `age_confirmed` / `is_adult`: see
18+ stories in [section 8](#8-rules-the-api-enforces-for-you).

### Sign up, log in, log out

| | Send | Answer |
| --- | --- | --- |
| `POST /api/accounts/signup/` | `{ "username", "email", "password" }` | `201` + the same shape as `/me/` (and you're logged in). `403` if an admin closed sign-ups. |
| `POST /api/accounts/login/` | `{ "username": "night_owl or owl@example.com", "password" }` | `200` + the `/me/` shape. `400` wrong password, `403` banned, `429` locked. |
| `POST /api/accounts/logout/` | nothing | `204` |

### Stories: the list

`GET /api/stories/` - anyone. Newest first. Options (`?key=value`, combine
them with `&`):

| Option | Example | Means |
| --- | --- | --- |
| `category` | `?category=haunted-houses` | one category (its slug - from `GET /api/categories/`) |
| `author` | `?author=the_keeper` | one writer's stories |
| `mood` | `?mood=creepy` | the mood picked when writing |
| `tag` | `?tag=halloween` | one tag |
| `sort` | `?sort=popular` | `newest` (default), `oldest`, `popular` (most views), `scariest` (highest fear meter) |

```json
[
  {
    "id": 1,
    "title": "The House on Wren Street",
    "excerpt": "Nobody visits anymore.",
    "cover_image": null,
    "category": "Haunted Houses",
    "author": "the_keeper",
    "reading_time": 1,
    "views": 0,
    "created_at": "2026-10-01T09:35:00.798314Z",
    "content_rating": "all",
    "fear_average": null,
    "is_interactive": false,
    "early_access_until": null
  }
]
```

- `reading_time` - minutes, for THIS reader's reading speed (Settings).
- `content_rating` - `all`, `teen` or `mature` (18+).
- `is_interactive` - a choose-your-path story (see below).
- `early_access_until` - `null`, or the moment a Pro-only story opens to
  everyone.

These "cards" are the same shape everywhere stories are listed (search, feed,
profile, reading lists...): `StoryCardSerializer` in
`backend/stories/serializers.py`.

### One story

`GET /api/stories/{id}/` - anyone (but see the locks). Counts as a view, and
puts it in your reading history if you're logged in.

```json
{
  "id": 1,
  "title": "The House on Wren Street",
  "...": "everything from the card above, plus:",
  "body": "The door was open. The door was open...",
  "category_slug": "haunted-houses",
  "word_count": 160,
  "like_count": 0,
  "comment_count": 1,
  "liked": false,
  "saved": false,
  "coauthors": [],
  "tags": [],
  "series": null,
  "lock": null,
  "fear": { "average": null, "votes": 0, "mine": null },
  "reactions": { "counts": { "got_me": 0, "cant_sleep": 0, "creepy": 0 }, "mine": [] },
  "my_progress": 0,
  "author_look": { "is_pro": false, "name_color": "" },
  "audio": "",
  "mood": "creepy",
  "content_warnings": "",
  "language": "en"
}
```

The important ones:

- **`lock`** - `null` = you may read it. Otherwise the reason you can't, and
  then **`body` is `""`** (Django doesn't send the text at all):
  - `"login"` - an 18+ story and you're logged out
  - `"age"` - 18+, logged in, but you haven't confirmed your age
    (`POST /api/accounts/age/ { "birth_date": "1998-04-23" }`, once)
  - `"too_young"` - 18+, and you're under 18
  - `"early_access"` - Pro readers only until `early_access_until`
- **`body`** - plain text. Paragraphs are separated by blank lines. Special
  marks inside it:
  - a line `!!scare` = a planned jump scare
  - `[[section: name]]` and `[[choice: Open the door -> cellar]]` lines = a
    choose-your-path story (`is_interactive: true`). The React reader is
    `frontend/src/components/StoryPage/InteractiveStory.jsx`.
- **`series`** - `null`, or `{ id, title, part, total, previous, next }`.
- **`my_progress`** - 0-100, how far YOU got last time. Save it with
  `POST /api/stories/{id}/progress/ { "percent": 40 }`.

### Comments

`GET /api/stories/{id}/comments/` - anyone. `POST` - logged in.

```json
[
  {
    "id": 1,
    "author": "night_owl",
    "author_look": { "is_pro": false, "name_color": "" },
    "body": "I read this with the lights on.",
    "created_at": "2026-10-01T09:35:00.799787Z",
    "parent": null
  }
]
```

To post: `{ "body": "Great!" }`, or a reply: `{ "body": "Thanks!", "parent": 1 }`.
`parent` = the comment you answer. A blocked word (Dashboard -> Content
Filter) gets `400`.

### Like, save, follow - "toggles"

Send the same `POST` again to undo it. No body needed.

| Address | Answer |
| --- | --- |
| `POST /api/stories/{id}/like/` | `{ "liked": true, "like_count": 13 }` |
| `POST /api/stories/{id}/save/` | `{ "saved": true }` (your saved list: `GET /api/stories/saved/`) |
| `POST /api/accounts/authors/{username}/follow/` | `{ "following": true, "follower_count": 4 }` |

### Search

`GET /api/search/?q=lighthouse` - anyone

```json
{
  "stories": [ "...story cards..." ],
  "authors": [ { "username": "the_keeper", "avatar": "", "story_count": 12 } ]
}
```

All words must match (title, text, tags, writer); small typos are forgiven on
the live (Postgres) site. How it works: `backend/stories/search.py`.

### A profile

`GET /api/accounts/profile/{username}/` - anyone: `username, avatar, bio,
website, story_count, follower_count, following_count, total_views,
total_likes, is_following, is_me, badges, streak, profile_theme,
avatar_border, is_pro, name_color`. A private profile you don't follow answers only the
name, avatar and `"is_locked": true`. Their stories:
`GET /api/stories/?author={username}`.

### Notifications (the bell)

`GET /api/accounts/notifications/?limit=20` - logged in

```json
{ "unread": 2, "items": [ { "id": 7, "kind": "like", "actor": "raven", "text": "raven liked your story \"The Well\"", "link": "/stories/5", "is_read": false, "created_at": "..." } ] }
```

Mark as read: `POST /api/accounts/notifications/read/` (all), or
`{ "ids": [7, 8] }` for some.

### Writing a story

`POST /api/stories/new/` - logged in. Send `multipart/form-data` (it may
have a picture):

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | max 200 characters |
| `body` | yes | the text, max 100,000 characters |
| `category` | yes | the category **id** (from `GET /api/categories/`) |
| `excerpt` | | the short text on cards, max 300 |
| `is_published` | | `true` = public, `false` = a draft |
| `publish_at` | | an ISO date in the future = scheduled |
| `cover_image` or `cover_image_url` | | a file, or a picture's address |
| `content_rating` | | `all` (default), `teen`, `mature` |
| `mood`, `content_warnings`, `language` | | |
| `tag_names` | | send it several times, max 5 |
| `series` | | the id of one of YOUR series |
| `early_access` | | `true` = Pro readers only for 48 hours |

Answer: `201` + the story, with its `id`. Change it later:
`PATCH /api/stories/{id}/edit/` (the old version goes into the history).

### Pro and candles (payments)

| | |
| --- | --- |
| `GET /api/payments/plans/` | prices + `mode` (`stripe`, `fake` on your computer, `off`) |
| `POST /api/payments/checkout/` `{ "kind": "pro_monthly" }` | `{ "url": "https://checkout.stripe.com/..." }` - send the person there |
| `POST /api/payments/checkout/` `{ "kind": "tip", "story_id": 5, "amount": "3.00", "message": "..." }` | the same, for a candle |
| `GET /api/payments/{id}/` | `{ "status": "pending" or "paid", ... }` |

Pro is switched on ONLY by Stripe's signed message to
`/api/payments/stripe-webhook/` - never by the app saying "I paid". Details:
`backend/payments/views.py`.

---

## 8. Rules the API enforces for you

You can't get around these by calling the API directly - they're checked in
Django, not in React:

- **Who sees which stories:** `stories_for(user)` in
  `backend/stories/models/story.py` - the reader's content setting, writers
  they blocked, private profiles. Drafts are only for their writer (and beta
  readers they invited). Everything else answers `404`.
- **18+ stories and Pro early access:** `story_lock()` in
  `backend/accounts/age.py` - the text is left out of the answer.
- **Only your own:** editing or deleting a story, comment, list... checks
  you're the owner (`403`/`404` otherwise).
- **Admins only:** every `/api/dashboard/...` address (and a few others)
  answers `403` to members. `backend/dashboard/test_permissions.py` tests
  this for EVERY address, so a new one can't forget it.
- **Blocked words:** the Content Filter refuses stories/comments with them
  (`400`).
- **Bans:** a banned member can't log in (`403` with the reason and when it ends).

---

## 9. Finding everything else

- **[API-reference.md](API-reference.md)** - all 213 addresses: methods, who
  may use them, the React function that calls each one, and what it does.
  It's generated from the code:
  ```bash
  cd backend
  python manage.py api_reference
  ```
  Run that again after adding or changing an address.
- **The React functions** - `frontend/src/api/` has one small, commented
  function per address (`accounts.js`, `stories.js`, `community.js`,
  `payments.js`, `admin.js`). The easiest way to see exactly what to send.
- **The view itself** - the reference names the Django view; the comment
  above it explains the details.
- **Browse it** - open any `GET` address in your browser while Django runs
  (DRF's browsable page).

---

## 10. Adding a new address

1. Write the view in the app's `*_views.py` (an `APIView` with `get` /
   `post`...). Put a comment block above it: what it does, what to send,
   what comes back - that comment becomes its description in the reference.
2. Set `permission_classes` (`IsAuthenticated`, `IsAdminUser`...). Leaving it
   out means **anyone** - and `test_permissions.py` will complain about a
   public address that accepts data.
3. Add it to the app's `urls.py`.
4. Write a test (`python manage.py test`).
5. Add a function for it in `frontend/src/api/<topic>.js`, with a comment.
6. `python manage.py api_reference` to update the reference.
