# Walkthrough: what happens when you click "Vote"

This follows **one click** on the Villain of the Week page (`/villains`) all the way
through React, over the network, through Django and the database, and back onto
your screen. Open each file as you read. The line numbers were right when this was
written; if they've moved a little, search for the function name.

```
 React (browser)                         Django (server)                 Database
 ───────────────                         ───────────────                 ────────
 1. click Vote
 2. handleVote()
 3. voteVillain(id)  ──── POST ────▶  4. urls.py finds the view
                                       5. VillainVoteView.post()  ────▶  6. update_or_create
                     ◀─── 200 ──────                                        (one row per
 7. reload()                                                                  user per week)
 8. getVillains()   ──── GET  ────▶  9. VillainListView.get()    ────▶  10. COUNT votes
                     ◀─── JSON ─────
 11. React re-draws: new numbers, "✓ Your vote", crown moves
```

---

## 1–2. The click: `handleVote`

[frontend/src/components/VillainsPage/VillainsPage.jsx](../frontend/src/components/VillainsPage/VillainsPage.jsx), around line 49:

```jsx
async function handleVote(villain) {
    if (!requireLogin()) return
    try {
        await voteVillain(villain.id)
    } catch { alert('Could not vote - try reloading the page.') }
    reload()
}
```

- `requireLogin()` comes from `hooks/useRequireLogin.js`. Logged out, it sends
  you to `/login` (remembering this page) and returns `false`, so we stop here.
- `await` pauses the function until Django answers. The rest of the page keeps
  working while it waits; that's what `async` buys us.
- **Notice:** the button does not change the numbers itself. It asks Django,
  then asks again for the fresh list (`reload()`). The server stays the one
  source of truth, so two people voting at once can't make the page lie.

## 3. Over the network: `voteVillain` → `authRequest`

[frontend/src/api/client.js](../frontend/src/api/client.js): `voteVillain` (line ~1376) is one line:

```js
return authRequest(`/api/villains/${nominationId}/vote/`, 'POST')
```

`authRequest` (line ~138) is the shared helper for **logged-in** requests:

- `credentials: 'include'` sends the **session cookie**, which is how Django knows *who* you are.
- `X-CSRFToken` header (read by `getCookie`, line ~127): proof the request came
  from our own page, not from a trap on another website. Django rejects POSTs without it.
- If the answer isn't OK (e.g. 404), it **throws**, and that's what the
  `catch` in `handleVote` catches.

> Every page uses these same two lines of plumbing. That's why a new feature only
> needs a tiny `export function ...` in `client.js`.

## 4. Django finds the view

- [backend/config/urls.py](../backend/config/urls.py) line ~38: `path('api/', include('sitecontent.urls'))`
  hands everything starting with `/api/` to the app's own list.
- [backend/sitecontent/urls.py](../backend/sitecontent/urls.py) line ~28: `path('villains/<int:pk>/vote/', VillainVoteView.as_view())`.
  `<int:pk>` grabs the number from the URL and passes it to the view as `pk`.

## 5. The view: `VillainVoteView.post`

[backend/sitecontent/villain_views.py](../backend/sitecontent/villain_views.py), line ~97:

```python
class VillainVoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        this_week = week_start()
        nomination = get_object_or_404(VillainNomination, pk=pk, week=this_week)
        VillainVote.objects.update_or_create(user=request.user, week=this_week, defaults={'nomination': nomination})
        return Response({'voted_for': nomination.id})
```

- `IsAuthenticated`: logged-out requests get **403** before `post` even runs.
  (React already checked with `requireLogin`, but **never trust the browser**:
  anyone can send requests without our page.)
- `week_start()` ([models.py](../backend/sitecontent/models.py) line ~285): today's date minus
  `weekday()` days = this week's Monday. Every vote and nomination stores it.
- `get_object_or_404(..., week=this_week)`: last week's villains can't get votes.
  Try it: the test `test_last_weeks_winner_is_remembered` checks exactly this.

## 6. The database: one vote per person per week

`update_or_create(user=..., week=..., defaults={'nomination': ...})` means:

- *find* the row for this user + this week;
- found → **update** its `nomination` (you changed your mind: your vote *moves*);
- not found → **create** it.

And the model makes it impossible to cheat even if the code had a bug:

```python
class Meta:
    unique_together = ['user', 'week']      # models.py line ~315
```

The **database itself** refuses a second row for the same user and week.
Rules that matter belong in the database, not only in `if` statements.

## 7–8. Back in React: `reload()`

[frontend/src/hooks/useApi.js](../frontend/src/hooks/useApi.js): `useApi` keeps a `reloadKey`
number (line ~35) and lists it in the effect's dependencies (line ~55).
`reload()` just adds 1 to it → the effect runs again → `getVillains()` is called again.

A tiny trick worth remembering: **change a number to re-run an effect.**

## 9–10. The fresh list: `VillainListView.get`

`ranked(week)` (villain_views.py line ~36):

```python
VillainNomination.objects.filter(week=week)
    .annotate(vote_count=Count('votes'))
    .order_by('-vote_count', 'created_at')
```

- `annotate(Count('votes'))`: the **database** counts the votes for every
  nomination in **one query** (not one query per villain).
- `.order_by(...)` is written out on purpose: with `annotate`, the model's
  default ordering is ignored. (This bit us once while building it.)
- `nomination_data(...)` adds `is_my_vote` (line ~32), so React knows which
  button says "✓ Your vote".

## 11. React re-draws

`useApi` stores the new JSON in `data` → the component runs again → the `.map()`
draws the list in the new order. Index 0 gets the crown (line ~119). Nothing had
to be "updated by hand": **state changed, React redrew.**

---

## Try it yourself

1. **Watch it happen.** Open the browser DevTools → *Network* tab, click Vote,
   and find the `vote/` POST and the `villains/` GET that follows it.
2. **Break it on purpose.** In `VillainVoteView`, remove `week=this_week` from
   `get_object_or_404`, then run `python manage.py test sitecontent`. Which test
   fails, and why? (Put it back afterwards!)
3. **Small feature.** Show "You voted for *The Keeper*" at the top of the page.
   Hint: everything you need is already in `data.nominations` (`is_my_vote`).
   No Django change needed.
4. **Bigger feature.** Let people *remove* their vote. You'll need: a `DELETE`
   method on `VillainVoteView`, a `unvoteVillain()` in `client.js`, and a button.
   Write the Django test first.
