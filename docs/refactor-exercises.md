# Refactor exercises

Real duplication in this codebase, found by searching it (numbers from
2026-09-28). Each exercise: **what's repeated → what to build → how to check.**
Do them in order; they get harder.

Ground rules for every exercise:

- Work on a new branch: `git switch -c refactor-<name>` (back up
  `backend/db.sqlite3` first, as always).
- Change **one or two files first**, run the tests, look at the page, *then*
  do the rest. Never change 40 files in one go.
- Before: `npm test` and `npx eslint src` pass. After: they still pass.
- Commit per exercise. Then ask me to review the branch.

---

## 1. Use the `pluralize()` you already have ⭐

**Repeated (45×):** `{count} {count === 1 ? 'vote' : 'votes'}`, e.g. in
`VillainsPage.jsx`, `SprintsPage.jsx`, `BundlesPage.jsx`.

**Already exists:** `pluralize(count, singular, plural)` in `utils/format.js`:

```js
pluralize(3, 'vote', 'votes')   // "3 votes"
```

**Do:** replace them. Find them with:
`grep -rn "=== 1 ? '" frontend/src --include=*.jsx`

**Check:** the pages read the same. (Some tests look for text like "1 word" -
they must still pass.)

**Lesson:** before writing a helper, search whether one exists.

---

## 2. One way to read an error from Django ⭐⭐

**Repeated:**

- `err.data?.detail || 'Could not ...'`: **51×**
- `err.data ? Object.values(err.data).flat().join(' ') : '...'`: **8×**
  (e.g. `AnnouncementsDashboard.jsx:53`, `BundlesDashboard.jsx:99`)

Django sends errors in two shapes: `{"detail": "..."}` or per field
`{"title": ["This field is required."]}`.

**Do:** add to `utils/format.js`:

```js
// Any Django error -> one sentence for the screen.
export function errorMessage(err, fallback) {
    if (err.data?.detail) return err.data.detail
    if (err.data) return Object.values(err.data).flat().join(' ')
    return fallback
}
```

Write `utils/format.test.js` cases for all three branches **first**. Then
replace the 8 long ones, then some of the 51 short ones.

**Lesson:** test a helper on its own before 50 files depend on it.

---

## 3. `<AdminHeading>` for the 45 dashboard titles ⭐⭐

**Repeated (45 files):**

```jsx
<h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
    <Clapperboard className='h-7 w-7 text-red-500' />
    Videos
</h1>
<p className='mt-1 text-gray-400'>...</p>
```

**Do:** add to `components/Dashboard/AdminParts.jsx`:

```jsx
export function AdminHeading({ icon: Icon, title, children }) { ... }
// <AdminHeading icon={Clapperboard} title='Videos'>Story readings from YouTube...</AdminHeading>
```

Note `icon: Icon`: renaming a prop so it can be used as a component
(`<Icon />` - components must start with a capital letter).

**Check:** change 3 dashboards, compare them in the browser side by side with
`main`. Then the rest.

**Lesson:** a component is just a function; if you copy markup, it wants to be one.

---

## 4. `useLocalStorage` hook ⭐⭐⭐

**Repeated:** 12 files read/write `localStorage`, each with its own
`try { ... } catch { }` (it can throw in private browsing). See
`hooks/useScareWarnings.js`, `components/StoryPage/narrator.js`,
`components/HomeFeed/SeasonalTakeover.jsx`, `WriteStory.jsx`.

**Do:** `hooks/useLocalStorage.js`:

```js
// const [size, setSize] = useLocalStorage('textSize', 'normal')
export function useLocalStorage(key, startValue) { ... }
```

- Save as JSON (`JSON.stringify` / `JSON.parse`) so it works for
  strings, booleans and objects alike.
- Keep the `try/catch` **inside** the hook: that's the whole point.
- Then rewrite `useScareWarnings` using it (should shrink to ~3 lines).

**Careful:** `useScareWarnings` stores `'on'`/`'off'`, not JSON. Changing the
format means old saved values read as garbage. Either handle both, or accept
that people's choice resets once. (Real apps face this constantly - it's
called a *migration*.)

**Lesson:** a custom hook is how React code shares *stateful* logic.

---

## 5. `<StatusBadge>` ⭐⭐⭐

**Repeated (10 maps):** `STATUS_STYLES` / `STATUS_BADGES` / `STATUS_LABELS` in
`TopStoriesTable.jsx`, `MyStoriesPage.jsx`, `InvitesPage.jsx`,
`SupportPage.jsx`, `TicketThread.jsx`, `AppealsDashboard.jsx`,
`ReportsDashboard.jsx`, `StoriesDashboard.jsx`, `SupportDashboard.jsx`,
`TrueStorySubmitPage.jsx`.

They're *similar, not identical* (different words, some use dots). That's the
real challenge: decide what the shared part is.

**Do:** a `components/StatusBadge/StatusBadge.jsx` taking a `tone`
(`'good' | 'waiting' | 'neutral' | 'bad'`) and `children` (the words):

```jsx
<StatusBadge tone='waiting'>Waiting for review</StatusBadge>
```

Each page keeps its own "status → tone + words" mapping; only the
*look* is shared.

**Lesson:** share the part that is the same (the look), not the part that only
looks the same (the meaning).

---

## When you're done

Tell me "review my refactor branch" and I'll go through the diff with you:
what's cleaner, what I'd do differently, and anything that quietly changed
behaviour.
