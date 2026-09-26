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


## Tests

```bash
cd backend
python manage.py test        # Django tests (settings, feed, privacy, messages...)

cd frontend
npm run lint                 # checks the React code for mistakes
```


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
| `stories` | Stories, likes, saves, comments, reading history, co-author invites, search, feed |
| `messaging` | Private messages |
| `moderation` | Reports, appeals, login logs and the login lock-out |
| `sitecontent` | Announcement banner, writing prompts, challenges, bundles |
| `support` | Help tickets (member <-> admin conversations) |
| `mailings` | Newsletter and the comment digest (`python manage.py send_comment_digests weekly`) |
| `categories` | Story categories |
| `slides` | The homepage slideshow |
| `dashboard` | Admin dashboard numbers |
| `contact` | The contact form |

**One rule worth knowing:** "which stories may this person see?" is
answered in one place - `stories_for(user)` in `backend/stories/models.py`.
It applies the reader's content rating setting, their blocked users and
private profiles. Use it for any new list of stories.

### The pages

| URL | File | Login? |
| --- | --- | --- |
| `/` | `HomePage/` | |
| `/stories/:id` | `StoryPage/` | |
| `/category/:slug` | `CategoryPage/` | |
| `/profile/:username` | `ProfilePage/` | |
| `/search` | `SearchPage/` | |
| `/leaderboard` | `LeaderboardPage/` | |
| `/about`, `/privacy`, `/terms`, `/cookies`... | `InfoPage/` (text in `infoPages.js`) | |
| `/write` | `WriteStory/` | yes |
| `/feed` | `FeedPage/` | yes |
| `/my-stories` | `MyStoriesPage/` | yes |
| `/lists` | `MyListsPage/` | yes |
| `/history` | `HistoryPage/` | yes |
| `/invites` | `InvitesPage/` | yes |
| `/messages` | `MessagesPage/` | yes |
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
| `/challenges`, `/bundles` | `ChallengesPage/`, `BundlesPage/` | |
| `/support` | `SupportPage/` | yes |

All routes live in `frontend/src/App.jsx`.

### Building blocks to reuse

| Component | Use it for |
| --- | --- |
| `PageLayout` | A new simple page: background, title with the red bar, empty-state box |
| `Avatar` | Anyone's photo or initials, in 3 sizes |
| `SegmentedControl` | A row of buttons where one is picked (sort, tabs) |
| `StoryGridCard` / `StoryCard` | Showing a story (tall card / wide card) |
| `EmptyState` | "Nothing here yet" |
| `SiteTour` | The step-by-step pop-up tour (steps in `tourSteps.js`); opens once for new visitors |
| `SearchBox` | The big search bar with "try" suggestions |
| `SearchModal` | A pop-up over the page (Esc / click outside to close) - here with the SearchBox; opened from the header or Ctrl + K |
| `Dashboard/AdminParts` | Admin list pages: `AdminSearch`, `AdminFilters`, `PageMessages` |
| `SettingsParts` | `SettingsSection`, `SettingRow`, `Toggle` (on/off switch) |
| `styles/formStyles.js` | The shared classes for labels, inputs, buttons |

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
