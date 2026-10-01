# Silent Evidence

A horror story community, built to learn **React** and **Django**.
Readers browse, like, save and comment on stories. Writers publish
them, see their stats and work together with co-authors.

- **Frontend:** React 19 + Vite + Tailwind CSS v4, React Router, lucide-react icons
- **Backend:** Django + Django REST Framework, SQLite

```
react-js_trainning/
├── backend/     Django: the database and the /api/... URLs
└── frontend/    React: everything you see in the browser
```


## Running it on your computer

You need two terminals: one for Django, one for React.

**1. Backend** (http://localhost:8000)

```bash
cd backend
python -m venv venv                  # only the first time
venv\Scripts\activate                # Windows  (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt      # only the first time
python manage.py migrate             # makes / updates the database
python manage.py createsuperuser     # only the first time: an admin account
python manage.py runserver
```

Emails (contact replies, support answers, newsletter, digest) are
**printed in this terminal** instead of sent while developing - see
EMAIL in `config/settings.py`.

Optional, for the Admin Dashboard's AI Generator: start Django with an
Anthropic API key (`$env:ANTHROPIC_API_KEY = "sk-ant-..."` in PowerShell
before `runserver`). Never commit the key.

**2. Frontend** (http://localhost:5173)

```bash
cd frontend
npm install        # only the first time
npm run dev
```

Open http://localhost:5173. The Django admin is at http://localhost:8000/admin.

> The database (`db.sqlite3`) and uploaded images (`media/`) are **not**
> in git - they're your own local data. A fresh copy starts empty:
> add categories and stories in the admin, or sign up and write some.


## Backups

```bash
python manage.py backup_site            # database + pictures -> backups/backup-<date>.zip
python manage.py restore_site <the .zip>
```

More (and nightly backups on the live site) in DEPLOY.md.


## Putting it online

See **[DEPLOY.md](DEPLOY.md)** - Django on Render, React on Vercel,
step by step. On your own computer you don't need any of it.


## Tests

```bash
cd backend
python manage.py test        # Django tests (settings, feed, privacy, messages...)

cd frontend
npm run lint                 # checks the React code for mistakes
npm test                     # React tests (Vitest) - once
npm run test:watch           # React tests - again on every save
```

React tests live next to the component they test (`LogIn.test.jsx`
next to `LogIn.jsx`). Start from `utils/format.test.js` (plain
functions) and `StoryPage/Comments.test.jsx` (a component, with
Django faked by `vi.mock`) - both explain every step.

**Which code do the tests actually run?** (coverage)

```bash
cd frontend
npm run test:coverage                    # table in the terminal, report in coverage/

cd backend
pip install -r requirements-dev.txt      # once
coverage run manage.py test
coverage report --sort=miss              # least-tested files at the bottom
```

Some tests guard the whole site rather than one feature:
`dashboard/test_permissions.py` (every admin address is admin-only; no
public address accepts data by accident) and `forums/test_speed.py`
(no database query per forum reply).

**Browser tests** (Playwright) - a real Chrome clicks through the
site: reading, jump-scare warnings, choose-your-path, writing and
editing a story, reading lists, Villain of the Week, admin-only pages.

```bash
cd frontend
npx playwright install chromium   # once (on your computer it uses your Chrome anyway)
npm run test:e2e
```

It starts its own Django (port 8010) and Vite (port 5180) with its
own database, `backend/e2e.sqlite3`, filled fresh every run by
`manage.py e2e_seed` - so your `db.sqlite3` is never touched, and your
normal dev servers can keep running. The tests are in `frontend/e2e/`;
`helpers.js` has `logIn(page, 'e2e_reader')` and the test users.

**On GitHub, automatically:** `.github/workflows/tests.yml` runs all of
the above (Django tests, lint, Vitest, build, browser tests) on every
push and pull request. A red cross next to a commit = something broke;
click it to see which step.

## The app (install it on a phone)

Silent Evidence is an installable web app (a "PWA"): on a phone it can
be added to the home screen and opens full-screen, with an offline page.

| File | What it does |
| --- | --- |
| `frontend/public/manifest.webmanifest` | the app's name, colours, icons and shortcuts |
| `frontend/public/sw.js` | the service worker: caches the app's files, shows `offline.html` without internet, never caches Django's answers |
| `frontend/public/icons/` | the home-screen icons (made from `favicon.svg`) |
| `src/components/InstallAppButton/` | "Install the app" in the footer |

It only works on the built site over HTTPS (so: once it's online). Changed
`sw.js`? Bump its `VERSION` so phones pick up the new one.

## Learning material

In [`docs/`](docs/): walkthroughs of a [Villain vote](docs/walkthrough-villain-vote.md)
and of [logging in](docs/walkthrough-login.md) from click to database and back,
and [refactor exercises](docs/refactor-exercises.md) based on real repetition
in this code.


## How it fits together

1. React calls a function in **`frontend/src/api/client.js`** - e.g.
   `getFeed()`. Every call to Django goes through that one file.
2. That sends a request to Django, e.g. `GET /api/stories/feed/`.
3. **`backend/<app>/urls.py`** picks the view, the **view** (`views.py`)
   asks the database through the **models** (`models.py`), and a
   **serializer** turns the rows into JSON.
4. React puts the JSON in state and draws the page.

Logging in uses Django's session cookie. `authRequest()` in `client.js`
sends it along (plus the CSRF token), and `AuthContext.jsx` keeps
"who is logged in" for the whole app - read it anywhere with `useAuth()`.

### The Django apps

| App | What's in it |
| --- | --- |
| `accounts` | Sign up / log in, profiles, settings, follows, blocks, leaderboard |
| `stories` | Stories, likes, saves, comments (with replies), reading history + progress, co-author invites, search, feed, series, fear meter, reactions, story chains, beta readers, writing sprints, views per day, anonymous true stories, reading lists, narration uploads, version history, recommendations, read-alongs, Claude feedback, Word (.docx) import (`docx_import.py`), search with typo tolerance (`search.py` - Postgres full-text on the live site, a simpler match on SQLite) |
| `messaging` | Private messages |
| `moderation` | Reports (stories, comments, read-along chat messages, public reading lists), appeals, login logs + lock-out, content filter, verification, warnings & bans, AI toxicity checks |
| `sitecontent` | Announcement banner, writing prompts, challenges, bundles, featured authors, spotlight, polls, villain of the week |
| `support` | Help tickets (member <-> admin conversations) |
| `mailings` | Newsletter, comment digest (`python manage.py send_comment_digests weekly`), follow digest - new stories from writers you follow (`python manage.py send_follow_digest`, daily), the email log and the email templates (`render_email()` in `email_templates.py`) |
| `forums` | Forum boards, threads and replies |
| `categories` | Story categories |
| `slides` | The homepage slideshow |
| `dashboard` | Admin dashboard numbers, site settings + rate limits (`SiteSettings.load()`), IP blocklist, audit log (both in `middleware.py`), SEO (`/sitemap.xml`, `/robots.txt`), heatmap |
| `contact` | The contact form |
| `payments` | Pro and candles (tips) with Stripe: prices in `prices.py`, "hand over what was bought" in `fulfil.py` (only the signed Stripe webhook calls it), a pretend payment page on your computer when there's no Stripe key. Setup: DEPLOY.md 4c |

**One rule worth knowing:** "which stories may this person see?" is
answered in one place - `stories_for(user)` in `backend/stories/models/story.py`.
It applies the reader's content rating setting, their blocked users and
private profiles. Use it for any new list of stories.

**18+ stories:** the site is open to everyone, but the TEXT of a story
rated "18+ Mature" is only sent to members who confirmed they're 18 or
older (their birth date, asked once on the story's lock screen). The
rules are in `backend/accounts/age.py`; the lock screen is
`StoryPage/StoryLock.jsx`. Admins can reset a member's age on the Users page.

### The pages

| URL | File | Login? |
| --- | --- | --- |
| `/` | `HomePage/` | |
| `/stories/:id` | `StoryPage/` | |
| `/category/:slug` | `CategoryPage/` | |
| `/profile/:username` | `ProfilePage/` | |
| `/search` | `SearchPage/` | |
| `/premium`, `/payment/done/:id`, `/payment/fake/:id` | `PremiumPage/` | paying needs a login |
| `/leaderboard` | `LeaderboardPage/` | |
| `/about`, `/privacy`, `/terms`, `/cookies`... | `InfoPage/` (text in `infoPages.js`) | |
| `/write` | `WriteStory/` | yes |
| `/feed` | `FeedPage/` | yes |
| `/my-stories` | `MyStoriesPage/` | yes |
| `/lists` | `MyListsPage/` | yes |
| `/history` | `HistoryPage/` | yes |
| `/invites` | `InvitesPage/` | yes |
| `/messages` | `MessagesPage/` | yes |
| `/notifications` | `NotificationsPage/` (the bell in the header; made by `notify()` in `accounts/notifications.py`) | yes |
| `/settings` | `SettingsPage/` | yes |
| `/author` | `AuthorDashboard/` | yes |
| `/dashboard` | `Dashboard/` | admins |
| `/dashboard/users` | `UsersDashboard/` | admins |
| `/dashboard/stories` | `StoriesDashboard/` | admins |
| `/dashboard/ai` | `AIGeneratorDashboard/` (needs `ANTHROPIC_API_KEY`) | admins |
| `/dashboard/moderation`, `/reports`, `/appeals` | `ModerationDashboard/`, `ReportsDashboard/`, `AppealsDashboard/` | admins |
| `/dashboard/login-logs`, `/security` | `LoginLogsDashboard/`, `SecurityDashboard/` | admins |
| `/dashboard/categories`, `/story-of-week`, `/announcements`, `/prompts`, `/challenges`, `/bundles` | one `...Dashboard/` folder each | admins |
| `/dashboard/contact`, `/support`, `/newsletter`, `/digest`, `/funnel` | one `...Dashboard/` folder each | admins |
| `/dashboard/cookies`, `/verification`, `/content-filter`, `/discipline` | one `...Dashboard/` folder each | admins |
| `/dashboard/premium`, `/revenue`, `/scheduled`, `/tags`, `/moods` | one `...Dashboard/` folder each | admins |
| `/dashboard/search`, `/email-log`, `/health` | one `...Dashboard/` folder each | admins |
| `/dashboard/featured-authors`, `/spotlight`, `/polls`, `/calendar`, `/merge` | one `...Dashboard/` folder each | admins |
| `/dashboard/site-settings`, `/rate-limits`, `/blocklist`, `/audit-log` | one `...Dashboard/` folder each | admins |
| `/dashboard/email-templates`, `/seo`, `/heatmap`, `/toxicity` (needs `ANTHROPIC_API_KEY`) | one `...Dashboard/` folder each | admins |
| `/dashboard/errors` | `ErrorLogDashboard/` - crashes from `ErrorBoundary` (React) and `ErrorLogMiddleware` (Django) | admins |
| `/challenges`, `/bundles` | `ChallengesPage/`, `BundlesPage/` | |
| `/support` | `SupportPage/` | yes |
| `/forums`, `/forums/:slug`, `/forums/:slug/:id` | `Forums/` (boards made by a migration) | reading: no, posting: yes |
| `/chains`, `/chains/:id` | `Chains/` - stories written together in turns | reading: no, writing: yes |
| `/videos` | `VideosPage/` (admins add them at `/dashboard/videos`) | |
| `/explore/latest`, `/popular`, `/timeline` | `ExplorePage/` | |
| `/villains`, `/villains/nominate` | `VillainsPage/` - nominate and vote, one of each per week | reading: no, voting: yes |
| `/sprints` | `SprintsPage/` - timed writing, weekly leaderboard, carries on to `/write` | sprinting: no, saving results: yes |
| `/true-stories`, `/true-stories/submit` | `TrueStories/` - anonymous true stories; admins review at `/dashboard/true-stories` | reading: no, sending: yes |
| `/reading-lists/:id` | `ReadingLists/` - a shareable list; add stories from a story's Actions menu | reading: no (public lists) |
| `/map` | `Map/` - the Haunted Map (Leaflet + OpenStreetMap); true-story pins blurred to ~1 km | |
| `/read-alongs`, `/read-alongs/:id` | `ReadAlongs/` - read together at a set time, live chat, fear-rating reveal | reading: no, joining: yes |
| `/offline-library` | `OfflineLibrary/` - stories downloaded for offline reading (works without internet) | |
| `/my-stories/:id/edit` | `EditStoryPage/` - edit your story, version history, private feedback from Claude | yes |
| `/challenges/:id/judge` | `ChallengesPage/JudgePage.jsx` - judges score entries | yes (judges) |
| `/series/:id` | `SeriesPage/` | |

All routes live in `frontend/src/App.jsx`.

### Building blocks to reuse

| Component | Use it for |
| --- | --- |
| `PageLayout` | A new simple page: background, title with the red bar, empty-state box |
| `Avatar` | Anyone's photo or initials, in 3 sizes |
| `FancyAvatar` | Wraps an Avatar with the border someone picked (pulse, orbit, flicker, Pro gold) |
| `ProName` | A name with the Pro colour + PRO badge: `<ProName name={...} look={comment.author_look} />` |
| `SegmentedControl` | A row of buttons where one is picked (sort, tabs) |
| `StoryGridCard` / `StoryCard` | Showing a story (tall card / wide card) |
| `EmptyState` | "Nothing here yet" |
| `SiteTour` | The step-by-step pop-up tour (steps in `tourSteps.js`); opens once for new visitors |
| `SearchBox` | The big search bar with "try" suggestions |
| `SearchModal` | A pop-up over the page (Esc / click outside to close) - here with the SearchBox; opened from the header or Ctrl + K |
| `Dashboard/AdminParts` | Admin list pages: `AdminSearch`, `AdminFilters`, `PageMessages` |
| `SettingsParts` | `SettingsSection`, `SettingRow`, `Toggle` (on/off switch) |
| `styles/formStyles.js` | The shared classes for labels, inputs, buttons |
| `useApi(() => getX(), [deps])` | Loading data from Django in one line: `data`, `error`, `loading`, `reload()` (examples: `PollsDashboard`, `SeriesPage`) |
| `usePageTitle('...')` | The browser-tab title of a page (site name from the SEO page) |
| `useSiteStatus()` | Maintenance mode, sign-ups open, contact email, site title (asked once per page load) |

Every file starts with a comment explaining what it does and how to use it.


## Adding a new page - the recipe

1. **Django model** (if you need new data): add it to `models.py`, then
   `python manage.py makemigrations` and `python manage.py migrate`.
2. **Django view + URL:** a view in `views.py`, a line in `urls.py`.
   Add `permission_classes = [IsAuthenticated]` if you must be logged in.
3. **Test it:** add a test in the app's `tests.py`, run `python manage.py test`.
4. **API function:** one small function in `frontend/src/api/client.js`.
5. **React page:** a folder in `frontend/src/components/`, start from
   `<PageLayout>`, load the data in a `useEffect`.
6. **Route:** a `<Route>` in `App.jsx` (inside `<ProtectedRoute>` if
   you must be logged in), and a link to it somewhere.
   For an **admin** or **members-only** page, import it with
   `const MyPage = lazy(() => import('./components/MyPage/MyPage'))`
   (next to the others at the top of `App.jsx`) instead of a normal
   `import` - then visitors don't download it. Admin pages also need a
   line in `NAV_ITEMS` in `Dashboard/Sidebar.jsx`.
