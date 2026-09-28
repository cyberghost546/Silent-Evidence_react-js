# Walkthrough: what happens when you log in

This follows **one log-in** from the moment the site opens, through the form,
Django, the database and the cookies, and on to every request after it.
Open each file as you read. Line numbers were right when this was written; if
they've moved, search for the function name.

```
 1. The site opens        React asks "who is logged in?"  GET /api/accounts/me/
                          Django answers null + hands out a csrftoken cookie
 2. You press "Log In"    LogIn.jsx -> useAuth().login() -> loginRequest()
 3. The request           POST /api/accounts/login/  (FormData, cookie, X-CSRFToken)
 4. Django checks         banned?  locked out?  password right?
 5. Django logs you in    login(request, user) -> a SESSION row + a sessionid cookie
 6. React remembers       setUser(data) -> the Header, menus, pages all update
 7. Every request after   the browser sends sessionid -> Django knows it's you
 8. Refresh the page      step 1 again - but now /me/ answers with your user
```

---

## 1. The site opens: "is anyone logged in?"

[frontend/src/auth/AuthContext.jsx](../frontend/src/auth/AuthContext.jsx), around line 34:

```jsx
useEffect(() => {
    getCurrentUser()                       // GET /api/accounts/me/
        .then(data => setUser(data))       // null, or { id, username, ... }
        .finally(() => setLoading(false))
}, [])
```

- `AuthProvider` wraps the **whole app** (in `main.jsx`), so this runs once, when the site opens.
- `loading` stays `true` until Django answers. `ProtectedRoute` shows "Loading..."
  meanwhile, instead of wrongly sending a logged-in admin to `/login` for a split second.
- On the Django side, `MeView` ([backend/accounts/views.py](../backend/accounts/views.py), `class MeView`)
  has `@ensure_csrf_cookie`: even for a visitor, the answer **sets a `csrftoken` cookie**.
  We need that token for step 3.

## 2. You press "Log In"

[frontend/src/components/LogIn/LogIn.jsx](../frontend/src/components/LogIn/LogIn.jsx), `handleSubmit` (line ~43):

```jsx
await login(form.username, form.password)
navigate(location.state?.from || '/')
```

- `login` comes from `useAuth()`, which is the function in `AuthContext.jsx` (line ~47).
- `location.state?.from`: if `ProtectedRoute` sent you here from `/settings`, you go
  **back to `/settings`** afterwards. (`ProtectedRoute.test.jsx` checks this.)
- If Django says no, `login` **throws**, and the form's `catch` shows the message.

## 3. The request

[frontend/src/api/client.js](../frontend/src/api/client.js): `loginRequest` (line ~198) packs the username
and password into `FormData`, and sends it with `authRequest` (the same helper as every
logged-in request):

| What | Why |
| --- | --- |
| `credentials: 'include'` | send and **receive** cookies (the `sessionid` comes back in step 5) |
| `X-CSRFToken` header | the token from the `csrftoken` cookie of step 1 |

> **What is CSRF?** Cross-Site Request Forgery. An evil page could contain a hidden form
> that POSTs to *our* site - and your browser would attach *your* cookies. The token
> stops that: the evil page can't read our cookies, so it can't copy the token into
> the header. Django refuses the request without a matching token.
>
> **Detail worth knowing:** Django REST Framework only checks CSRF for requests that
> are *already* logged in with a session. The log-in itself isn't one yet, which is
> why the **lock-out** below matters so much for it.

## 4. Django checks - in this order

`LogInView.post` ([backend/accounts/views.py](../backend/accounts/views.py), `class LogInView`):

1. **Email or username?** If the box contains `@`, find the account with that email
   and use its username (`authenticate()` only understands usernames).
2. **Banned?** `active_ban(account)`: a running ban refuses the log-in with its reason (403).
3. **Locked out?** `is_locked(login_name, client_ip(request))`
   ([backend/moderation/security.py](../backend/moderation/security.py), line ~76): too many failed
   tries *for this username* **or** *from this IP address* recently → 429 "Too many failed attempts".
   - It's checked **before** the password, so guessing is useless during the lock -
     even the right password is refused.
   - The limits come from Dashboard → Rate Limits (`login_limits()`).
4. **Password right?** `authenticate(request, username=..., password=...)`.
   Django never stores your password - only a **hash** (a one-way scramble). It
   scrambles what you typed the same way and compares the results.
   - Wrong → `record_login(..., success=False)` and the answer is always
     **"Wrong email, username or password."** Never "that user doesn't exist":
     that would tell an attacker which accounts are real.

Every try, good or bad, becomes a `LoginEvent` row: that's Dashboard → Login Logs
and the Login Map.

## 5. Django logs you in: the session

```python
login(request, user)
record_login(request, login_name, user, success=True)
return Response(user_data(user))
```

`login()` is Django's own:

- It makes a row in the **`django_session`** table: a random key → "user 7".
- The answer carries a **`Set-Cookie: sessionid=<that random key>`** header.
- The cookie is `HttpOnly`: JavaScript (ours *or* an attacker's) can't read it.
  On the live site it's also `Secure` (HTTPS only) - see `SESSION_COOKIE_SECURE`
  in `config/settings.py`.
- It also **changes the CSRF token** - an old token from before the log-in stops working.

The password is never sent again. From now on the random key *is* your proof.

## 6. React remembers you

Back in `AuthContext.jsx`: `setUser(data)`. Every component that calls `useAuth()`
re-renders - the Header swaps "Log In" for your avatar, the bell appears, `ProtectedRoute`
lets you through. That's what a **Context** is for: one value, used everywhere, no
passing props through ten components.

## 7. Every request after

The browser attaches `sessionid` to every request to our site by itself. Django's
`SessionMiddleware` + `AuthenticationMiddleware` turn it back into `request.user`.
That's all `IsAuthenticated` checks. Nothing in React "sends your login" - the cookie does it.

## 8. Refresh the page

React's memory (`user`) is gone - but the cookie isn't. Step 1 runs again, and now
`/api/accounts/me/` answers with your user. Logged in, no password needed.

**Log out** (`LogOutView`) deletes the session row on the server - so even a copied
`sessionid` cookie stops working immediately.

---

## Try it yourself

1. **See the cookies.** DevTools → *Application* → *Cookies* → `localhost`. Find
   `csrftoken` and `sessionid`. Log out and watch `sessionid` disappear.
2. **See the session in the database.** `python manage.py shell`:
   ```python
   from django.contrib.sessions.models import Session
   for s in Session.objects.all(): print(s.session_key[:8], s.get_decoded())
   ```
   Your user id is in there - nothing else, and no password.
3. **Trigger the lock-out.** Type a wrong password several times (Dashboard → Rate
   Limits shows how many). Then try the *right* one. Unlock yourself in Dashboard →
   Login Logs.
4. **Read the tests.** `moderation/tests.py` tests the lock-out
   (`test_locked_after_too_many_failures_even_with_right_password`);
   `LogIn.test.jsx` and `ProtectedRoute.test.jsx` test the React side. Can you add a
   test for "logging in with your email address works"?
