// ---------------------------------------------------------------
// One place that knows where the Django backend lives.
//
// Why bother? Without this file you end up writing
// "http://localhost:8000" in five different components. The day you
// deploy the site, that address changes - and you have to hunt down
// every copy. Here you change one line.
//
// It comes from VITE_API_URL (Vite reads it from .env files or the
// host's settings while building):
//   - not set (your computer): http://localhost:8000
//   - set to '' (empty) on the live site: "this same site" - the host
//     forwards /api and /media to Django (vercel.json, see DEPLOY.md),
//     so the browser sees ONE site and the login cookie just works.
// ?? (not ||): only "not set at all" gets the default - an empty ''
// is kept, on purpose.
// ---------------------------------------------------------------

export const API_HOST = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'


// Django REST Framework usually sends images as a full URL already
// ("http://localhost:8000/media/slides/case1.jpg"). But if it ever
// sends just the path ("/media/slides/case1.jpg"), that would point at
// localhost:5173/media/... - React's server, which doesn't have it.
// So: full URL -> use it as is. Just a path -> stick the backend's
// address on the front.
export function mediaUrl(path) {
    if (!path) return ''
    if (path.startsWith('http')) return path
    return `${API_HOST}${path}`
}


// A small wrapper around fetch so components don't repeat this.
// "async/await" is just a nicer way to write .then() chains.
export async function getJSON(path) {
    // credentials: 'include' = send the login cookie too, so Django
    // knows who's asking. Needed e.g. during maintenance mode, when
    // only admins may load anything (dashboard/middleware.py).
    const response = await fetch(`${API_HOST}${path}`, { credentials: 'include' })

    // fetch does NOT throw on a 404 or 500 - it only throws if the
    // network itself failed. So we have to check response.ok ourselves.
    if (!response.ok) {
        const error = new Error(`Request failed: ${response.status}`)

        // Keep the number too, so a page can react to specific
        // answers - e.g. 404 means "that doesn't exist".
        error.status = response.status
        throw error
    }

    return response.json()
}

// ---------------------------------------------------------------
// Requests that need to know WHO you are: logging in and out, and
// the admin dashboard.
//
// These are different from getJSON in two ways:
//   1. credentials: 'include' - send the login cookie along, so
//      Django knows it's you.
//   2. X-CSRFToken header - Django refuses any POST/PATCH/DELETE
//      from a logged-in user that doesn't carry this token. It's
//      protection against other websites sending requests with
//      your cookie.
// ---------------------------------------------------------------

// document.cookie is ONE string like "csrftoken=abc123; theme=dark".
// This splits it up and finds the piece we want.
function getCookie(name) {
    const cookies = document.cookie.split('; ')

    for (const cookie of cookies) {
        const [key, value] = cookie.split('=')
        if (key === name) return value
    }

    return null
}

export async function authRequest(path, method = 'GET', body = null) {
    const headers = { 'X-CSRFToken': getCookie('csrftoken') }

    // Two kinds of body:
    //   FormData     -> sent as it is. No 'Content-Type' on purpose:
    //                   the browser writes that header itself (it
    //                   includes a random "boundary" between fields).
    //   plain object -> sent as JSON. Needed for LISTS, like the
    //                   stories in a bundle ({ story_ids: [3, 7] }),
    //                   which FormData can't send when they're empty.
    if (body !== null && !(body instanceof FormData)) {
        body = JSON.stringify(body)
        headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${API_HOST}${path}`, {
        method: method,
        body: body,
        credentials: 'include',
        headers: headers,
    })

    if (!response.ok) {
        // Django explains what went wrong in the body, e.g.
        // {"title":["This field is required."]}. Put it in the error
        // so we can show it on screen.
        const details = await response.text()
        const error = new Error(`Request failed: ${response.status} ${details}`)

        // The number on its own too (404, 403...) - same as getJSON.
        error.status = response.status

        // Also keep the details as an object, so a form can show each
        // message under the right input (error.data.password, ...).
        // try/catch because if Django crashes it sends an HTML page,
        // and JSON.parse would throw on that.
        try {
            error.data = JSON.parse(details)
        } catch {
            error.data = { detail: `Server error (${response.status})` }
        }

        throw error
    }

    // DELETE and logout answer "204 No Content" - there's no JSON to
    // read, and calling .json() on nothing would throw.
    if (response.status === 204) return null

    return response.json()
}


// Like getJSON, but "204 No Content" (nothing there) gives null
// instead of crashing on the empty body.
export async function getJSONOrNull(path) {
    const response = await fetch(`${API_HOST}${path}`, { credentials: 'include' })
    if (response.status === 204) return null
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    return response.json()
}


// A small helper: FormData from a plain object, used by the
// functions below.
export function toFormData(values) {
    const data = new FormData()
    for (const [key, value] of Object.entries(values)) {
        data.append(key, value)
    }
    return data
}
