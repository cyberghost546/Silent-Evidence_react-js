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
async function getJSON(path) {
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


// One function per endpoint. Components call these instead of
// writing fetch() with a hardcoded URL.
export function getCategories() {
    return getJSON('/api/categories/')
}

export function getSlides() {
    return getJSON('/api/slides/')
}

// One category by its slug. Throws an error with .status 404 if
// there's no such category.
export function getCategory(slug) {
    return getJSON(`/api/categories/${slug}/`)
}

// { story_of_the_day: {...} or null, story_of_the_week: {...} or null }
export function getFeaturedStories() {
    return getJSON('/api/stories/featured/')
}

// One whole story (with its body) for the story page. Opening it
// also adds 1 to the story's view count. Throws an error with
// .status 404 for a draft or a story that doesn't exist.
//
// authRequest (not getJSON) because it sends the login cookie - so
// Django can answer "liked: true / saved: true" for YOU.
// It's defined further down; that's fine, because by the time this
// function is CALLED the whole file has loaded.
export function getStory(id) {
    return authRequest(`/api/stories/${id}/`)
}

// { id: 7 } - a random published story. Throws with .status 404 if
// there are no stories at all.
export function getRandomStory() {
    return getJSON('/api/stories/random/')
}

// Published stories. `filters` is an object, all keys optional:
//   getStories()                                        -> all, newest first
//   getStories({ category: 'paranormal' })              -> one category
//   getStories({ category: 'paranormal', sort: 'oldest' })
//   getStories({ sort: 'popular', limit: 3 })           -> top 3 by views
//
// URLSearchParams turns { category: 'paranormal', sort: 'oldest' }
// into "category=paranormal&sort=oldest" - and safely escapes any
// weird characters, which gluing strings together by hand wouldn't.
export function getStories(filters = {}) {
    const query = new URLSearchParams(filters).toString()
    return getJSON(`/api/stories/?${query}`)
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

async function authRequest(path, method = 'GET', body = null) {
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


// --- Accounts ---

// Answers with the logged-in user, or null if nobody is.
export function getCurrentUser() {
    return authRequest('/api/accounts/me/')
}

export function loginRequest(username, password) {
    const data = new FormData()
    data.append('username', username)
    data.append('password', password)
    return authRequest('/api/accounts/login/', 'POST', data)
}

export function signupRequest(username, email, password) {
    const data = new FormData()
    data.append('username', username)
    data.append('email', email)
    data.append('password', password)
    return authRequest('/api/accounts/signup/', 'POST', data)
}

export function logoutRequest() {
    return authRequest('/api/accounts/logout/', 'POST')
}



// --- Authors ---

// The "Authors to Follow" row. Uses authRequest so Django can say
// is_following: true / false for YOU (logged out = always false).
// [ { username, story_count, follower_count, is_following }, ... ]
export function getAuthors(limit = 6) {
    return authRequest(`/api/accounts/authors/?limit=${limit}`)
}

// Everything for the top of a profile page (see ProfileView in
// accounts/views.py). authRequest so Django knows if it's YOUR
// profile (is_me) and if you follow them (is_following).
// Throws with .status 404 if there's no such user.
export function getProfile(username) {
    return authRequest(`/api/accounts/profile/${username}/`)
}

// Click once = follow, again = unfollow.
// Answers { following, follower_count }.
export function followAuthor(username) {
    return authRequest(`/api/accounts/authors/${username}/follow/`, 'POST')
}

// --- Likes, saves and comments (logged in) ---

// Click once = like, again = unlike. Answers { liked, like_count }.
export function likeStory(id) {
    return authRequest(`/api/stories/${id}/like/`, 'POST')
}

// Same idea for bookmarks. Answers { saved }.
export function saveStory(id) {
    return authRequest(`/api/stories/${id}/save/`, 'POST')
}

// Anyone can read comments, so a plain getJSON is enough.
// [ { id, author, body, created_at }, ... ] newest first.
export function getComments(storyId) {
    return getJSON(`/api/stories/${storyId}/comments/`)
}

// Answers with the new comment, in the same shape as the list above.
// parentId = the comment you're replying to (leave it out for a normal comment).
export function postComment(storyId, body, parentId) {
    const data = new FormData()
    data.append('body', body)
    if (parentId) data.append('parent', parentId)
    return authRequest(`/api/stories/${storyId}/comments/`, 'POST', data)
}



// --- Writing stories (logged in) ---

// formData, not a plain object, because it can carry a cover image
// file. Answers with the new story, including its id.
export function createStory(formData) {
    return authRequest('/api/stories/new/', 'POST', formData)
}


// --- Last Words (the quote wall on the homepage) ---

// Anyone can read them. [ { id, author, body, created_at }, ... ]
export function getLastWords() {
    return getJSON('/api/last-words/')
}

// Logged in only. Answers with the new quote, same shape as above.
export function postLastWord(body) {
    const data = new FormData()
    data.append('body', body)
    return authRequest('/api/last-words/', 'POST', data)
}


// --- Contact page ---

// Anyone can send one (no login needed). `form` is
// { name, email, subject, message }. authRequest because it adds the
// CSRF token, which Django needs if the sender IS logged in.
// A 429 error means "too many messages - try again later".
export function sendContactMessage(form) {
    const data = new FormData()
    data.append('name', form.name)
    data.append('email', form.email)
    data.append('subject', form.subject)
    data.append('message', form.message)
    return authRequest('/api/contact/', 'POST', data)
}


// --- Author Dashboard (logged in) ---

// All the numbers for YOUR stories. days = 7 or 30 (the charts and
// the "last X days" boxes). See AuthorStatsView in stories/views.py.
export function getAuthorStats(days = 30) {
    return authRequest(`/api/author/stats/?days=${days}`)
}

// --- Dashboard (admin only) ---

// Numbers, chart data and recent lists for the Overview page.
export function getDashboardStats() {
    return authRequest('/api/dashboard/stats/')
}

export function getAllSlides() {
    return authRequest('/api/dashboard/slides/')
}

// formData, not a plain object: we're uploading an image file, and
// JSON can't carry files.
export function createSlide(formData) {
    return authRequest('/api/dashboard/slides/', 'POST', formData)
}

// PATCH = "change only the fields I send". So editing a title without
// choosing a new image keeps the old image.
export function updateSlide(id, formData) {
    return authRequest(`/api/dashboard/slides/${id}/`, 'PATCH', formData)
}

export function deleteSlide(id) {
    return authRequest(`/api/dashboard/slides/${id}/`, 'DELETE')
}


// --- Settings page (logged in) ---

// Everything the Settings page shows, in one object:
// { username, email, avatar, bio, website, content_access,
//   fear_moods, reading_speed, weekly_digest, comment_digest,
//   profile_theme, avatar_border, is_private }
export function getSettings() {
    return authRequest('/api/accounts/settings/')
}

// Change SOME settings. `changes` is a plain object with only the
// fields you want to change: { bio: 'Hi' } or { weekly_digest: false }.
// Answers with ALL the settings again (the updated version).
//
// We turn it into FormData because the avatar can be a file.
export function updateSettings(changes) {
    const data = new FormData()
    for (const [key, value] of Object.entries(changes)) {
        data.append(key, value)
    }
    return authRequest('/api/accounts/settings/', 'PATCH', data)
}

export function changePassword(currentPassword, newPassword) {
    const data = new FormData()
    data.append('current_password', currentPassword)
    data.append('new_password', newPassword)
    return authRequest('/api/accounts/change-password/', 'POST', data)
}

// Deletes the account for good (and logs out).
export function deleteAccount(password) {
    const data = new FormData()
    data.append('password', password)
    return authRequest('/api/accounts/delete/', 'POST', data)
}

// [ 'troll99', ... ] - usernames you blocked.
export function getBlockedUsers() {
    return authRequest('/api/accounts/blocks/')
}

// Both answer with the new list.
export function blockUser(username) {
    const data = new FormData()
    data.append('username', username)
    return authRequest('/api/accounts/blocks/', 'POST', data)
}

export function unblockUser(username) {
    return authRequest(`/api/accounts/blocks/${username}/`, 'DELETE')
}

// Everything the site has about you, as one big object.
export function exportMyData() {
    return authRequest('/api/accounts/export/')
}


// --- Leaderboard (anyone) ---

// tab = 'all' or 'elite'. Most likes first:
// [ { rank, username, avatar, story_count, follower_count,
//     total_likes, total_views, is_elite }, ... ]
export function getLeaderboard(tab = 'all') {
    return getJSON(`/api/accounts/leaderboard/?tab=${tab}`)
}


// --- My Feed (logged in) ---

// Stories by the authors you follow. sort = 'newest' or 'popular'.
// { following: [ { username, avatar }, ... ], stories: [ ...cards ] }
export function getFeed(sort = 'newest') {
    return authRequest(`/api/stories/feed/?sort=${sort}`)
}


// --- My Lists, Reading History, My Stories (logged in) ---

// Your saved stories, as story cards. Last saved first.
export function getSavedStories() {
    return authRequest('/api/stories/saved/')
}

// [ { last_read_at, story: {...card...} }, ... ] newest first.
export function getReadingHistory() {
    return authRequest('/api/stories/history/')
}

export function clearReadingHistory() {
    return authRequest('/api/stories/history/', 'DELETE')
}

// Everything you wrote, drafts too:
// [ { id, title, category, status, views, like_count, comment_count, ... } ]
export function getMyStories() {
    return authRequest('/api/stories/mine/')
}

// isPublished = true (publish) or false (back to draft).
// Answers with the updated row.
export function setStoryPublished(id, isPublished) {
    const data = new FormData()
    data.append('is_published', isPublished)
    return authRequest(`/api/stories/${id}/manage/`, 'PATCH', data)
}

export function deleteMyStory(id) {
    return authRequest(`/api/stories/${id}/manage/`, 'DELETE')
}


// --- Search (anyone) ---

// { stories: [...cards...], authors: [ { username, avatar, story_count } ] }
// encodeURIComponent: turns spaces and symbols into URL-safe text
// ("red house" -> "red%20house").
export function searchSite(query) {
    return authRequest(`/api/search/?q=${encodeURIComponent(query)}`)
}


// --- Co-author invites (logged in) ---

// { received: [...], sent: [...] }
// Each: { id, story_id, story_title, from_user, to_user, status, created_at }
export function getInvites() {
    return authRequest('/api/invites/')
}

export function sendInvite(storyId, username) {
    const data = new FormData()
    data.append('story_id', storyId)
    data.append('username', username)
    return authRequest('/api/invites/', 'POST', data)
}

// answer = 'accept' or 'decline'
export function answerInvite(id, answer) {
    return authRequest(`/api/invites/${id}/${answer}/`, 'POST')
}

export function cancelInvite(id) {
    return authRequest(`/api/invites/${id}/`, 'DELETE')
}


// --- Messages (logged in) ---

// [ { username, avatar, last_message: {...}, unread }, ... ]
export function getConversations() {
    return authRequest('/api/messages/')
}

// { username, avatar, blocked, messages: [ { id, body, created_at, is_mine } ] }
export function getConversation(username) {
    return authRequest(`/api/messages/${username}/`)
}

export function sendMessage(username, body) {
    const data = new FormData()
    data.append('body', body)
    return authRequest(`/api/messages/${username}/`, 'POST', data)
}

// { unread: 3 } - for the red number on the header's Messages icon.
export function getUnreadCount() {
    return authRequest('/api/messages/unread/')
}


// --- Admin Dashboard: Users page (admins only) ---

// { counts: { total, admins, authors, premium },
//   users: [ { id, username, email, avatar, role, is_verified,
//              is_premium, story_count, comment_count, date_joined } ] }
export function getAdminUsers() {
    return authRequest('/api/dashboard/users/')
}

// changes = only what changes, e.g. { role: 'admin' } or
// { is_verified: true }. Answers with the updated user row.
export function updateAdminUser(id, changes) {
    const data = new FormData()
    for (const [key, value] of Object.entries(changes)) {
        data.append(key, value)
    }
    return authRequest(`/api/dashboard/users/${id}/`, 'PATCH', data)
}

export function deleteAdminUser(id) {
    return authRequest(`/api/dashboard/users/${id}/`, 'DELETE')
}


// --- Admin Dashboard: Stories page (admins only) ---

// { counts: { total, draft, published, archived },
//   stories: [ { id, title, author, category, status, is_story_of_the_day,
//                like_count, comment_count, views, created_at } ] }
export function getAdminStories() {
    return authRequest('/api/dashboard/stories/')
}

// changes = { status: 'archived' } or { is_story_of_the_day: true }.
// Answers with the updated story row.
export function updateAdminStory(id, changes) {
    const data = new FormData()
    for (const [key, value] of Object.entries(changes)) {
        data.append(key, value)
    }
    return authRequest(`/api/dashboard/stories/${id}/`, 'PATCH', data)
}

export function deleteAdminStory(id) {
    return authRequest(`/api/dashboard/stories/${id}/`, 'DELETE')
}


// --- Reports and appeals (members) ---

// target = { story_id: 5 } or { comment_id: 12 }
// reason = one of the values in REPORT_REASONS (ReportButton.jsx)
export function sendReport(target, reason, details) {
    const data = new FormData()
    for (const [key, value] of Object.entries(target)) {
        data.append(key, value)
    }
    data.append('reason', reason)
    data.append('details', details)
    return authRequest('/api/reports/', 'POST', data)
}

// Your appeals: [ { id, story_id, story_title, status, admin_note, ... } ]
export function getMyAppeals() {
    return authRequest('/api/appeals/')
}

export function sendAppeal(storyId, message) {
    const data = new FormData()
    data.append('story_id', storyId)
    data.append('message', message)
    return authRequest('/api/appeals/', 'POST', data)
}


// --- Admin Dashboard: safety pages (admins only) ---

// A small helper: FormData from a plain object, used by the
// functions below.
function toFormData(values) {
    const data = new FormData()
    for (const [key, value] of Object.entries(values)) {
        data.append(key, value)
    }
    return data
}

// { counts: { open, resolved, dismissed }, reports: [...] }
export function getAdminReports() {
    return authRequest('/api/dashboard/reports/')
}

// action = 'remove' (hide / archive it) or 'dismiss' (it's fine)
export function actOnReport(id, action) {
    return authRequest(`/api/dashboard/reports/${id}/`, 'POST', toFormData({ action }))
}

// kind = 'comments' or 'lastwords'
export function getModerationItems(kind) {
    return authRequest(`/api/dashboard/moderation/?type=${kind}`)
}

export function setItemHidden(kind, id, isHidden) {
    return authRequest(`/api/dashboard/moderation/${kind}/${id}/`, 'PATCH', toFormData({ is_hidden: isHidden }))
}

export function deleteModerationItem(kind, id) {
    return authRequest(`/api/dashboard/moderation/${kind}/${id}/`, 'DELETE')
}

// { counts: { pending, accepted, rejected }, appeals: [...] }
export function getAdminAppeals() {
    return authRequest('/api/dashboard/appeals/')
}

// decision = 'accept' or 'reject'
export function decideAppeal(id, decision, note) {
    return authRequest(`/api/dashboard/appeals/${id}/`, 'POST', toFormData({ decision, note }))
}

// The newest 500 login attempts.
export function getLoginLogs() {
    return authRequest('/api/dashboard/login-logs/')
}

export function getSecurityOverview() {
    return authRequest('/api/dashboard/security/')
}

// what = { username: 'bob' } or { ip: '1.2.3.4' }
export function unlockLogin(what) {
    return authRequest('/api/dashboard/security/unlock/', 'POST', toFormData(what))
}


// --- Admin Dashboard: AI Generator (admins only) ---

// { configured: true/false, model: 'claude-opus-5' }
export function getAIStatus() {
    return authRequest('/api/dashboard/ai/status/')
}

// options = { idea, category_id, mood, content_rating, length }
// Answers { title, excerpt, body }. Can take a minute!
export function generateStory(options) {
    return authRequest('/api/dashboard/ai/generate/', 'POST', toFormData(options))
}

// Saves as a DRAFT. Answers { id }.
export function saveGeneratedStory(story) {
    return authRequest('/api/dashboard/ai/save/', 'POST', toFormData(story))
}



// --- Site content (public) ---

// The banner at the top of every page, or null if none is on.
export function getAnnouncement() {
    return getJSONOrNull('/api/announcement/')
}

// One random writing prompt { id, text }, or null.
export function getRandomPrompt() {
    return getJSONOrNull('/api/prompts/random/')
}

export function getChallenges() {
    return getJSON('/api/challenges/')
}

// authRequest (not getJSON): logged in, Django also sends which of
// YOUR stories could still enter.
export function getChallenge(id) {
    return authRequest(`/api/challenges/${id}/`)
}

export function enterChallenge(challengeId, storyId) {
    return authRequest(`/api/challenges/${challengeId}/enter/`, 'POST', { story_id: storyId })
}

export function getBundles() {
    return getJSON('/api/bundles/')
}

export function getBundle(slug) {
    return authRequest(`/api/bundles/${slug}/`)
}

// Like getJSON, but "204 No Content" (nothing there) gives null
// instead of crashing on the empty body.
async function getJSONOrNull(path) {
    const response = await fetch(`${API_HOST}${path}`, { credentials: 'include' })
    if (response.status === 204) return null
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    return response.json()
}


// --- Admin Dashboard: site content (admins only) ---
//
// Every admin list below works the same way, so ONE set of helpers
// covers them all. `kind` is the last part of the URL:
//   'announcements', 'prompts', 'challenges', 'bundles', 'categories'
//
//   getAdminList('prompts')                 -> GET    /api/dashboard/prompts/
//   createAdminItem('prompts', { text })    -> POST   /api/dashboard/prompts/
//   getAdminItem('challenges', 3)           -> GET    /api/dashboard/challenges/3/
//   updateAdminItem('prompts', 5, {...})    -> PATCH  /api/dashboard/prompts/5/
//   deleteAdminItem('prompts', 5)           -> DELETE /api/dashboard/prompts/5/

export function getAdminList(kind) {
    return authRequest(`/api/dashboard/${kind}/`)
}

export function createAdminItem(kind, values) {
    return authRequest(`/api/dashboard/${kind}/`, 'POST', values)
}

export function getAdminItem(kind, id) {
    return authRequest(`/api/dashboard/${kind}/${id}/`)
}

export function updateAdminItem(kind, id, values) {
    return authRequest(`/api/dashboard/${kind}/${id}/`, 'PATCH', values)
}

export function deleteAdminItem(kind, id) {
    return authRequest(`/api/dashboard/${kind}/${id}/`, 'DELETE')
}

// Every published story, short: [ { id, title, author, views,
// is_story_of_the_day, is_story_of_the_week } ]
export function getStoryPicker() {
    return authRequest('/api/dashboard/story-picker/')
}


// --- User Support (members; admins use the same ticket URLs) ---

// Your tickets: [ { id, subject, status, status_label, updated_at, ... } ]
export function getMyTickets() {
    return authRequest('/api/support/')
}

export function openTicket(subject, body) {
    return authRequest('/api/support/', 'POST', { subject, body })
}

// One ticket with its conversation: { ..., messages: [...] }
export function getTicket(id) {
    return authRequest(`/api/support/${id}/`)
}

export function replyToTicket(id, body) {
    return authRequest(`/api/support/${id}/`, 'POST', { body })
}

export function closeTicket(id) {
    return authRequest(`/api/support/${id}/close/`, 'POST')
}


// --- Admin Dashboard: inbox, support, newsletter, digest ---

// { counts: { new, handled }, messages: [...] }
export function getContactInbox() {
    return authRequest('/api/dashboard/contact/')
}

export function setContactHandled(id, isHandled) {
    return authRequest(`/api/dashboard/contact/${id}/`, 'PATCH', { is_handled: isHandled })
}

// Emails the reply to the sender. Answers with the updated message.
export function replyToContact(id, reply) {
    return authRequest(`/api/dashboard/contact/${id}/`, 'POST', { reply })
}

export function deleteContactMessage(id) {
    return authRequest(`/api/dashboard/contact/${id}/`, 'DELETE')
}

// { counts: { open, answered, closed }, tickets: [...] }
export function getAllTickets() {
    return authRequest('/api/dashboard/support/')
}

// { recipient_count, sent: [...] }
export function getNewsletters() {
    return authRequest('/api/dashboard/newsletter/')
}

// testOnly = true -> only to yourself.
export function sendNewsletter(subject, body, testOnly) {
    return authRequest('/api/dashboard/newsletter/', 'POST', { subject, body, test_only: testOnly })
}

// period = 'daily' or 'weekly'
// { subscribers, would_send, recipients, preview, history }
export function getDigestPreview(period) {
    return authRequest(`/api/dashboard/digest/?period=${period}`)
}

export function sendDigestNow(period) {
    return authRequest('/api/dashboard/digest/', 'POST', { period })
}


// --- Admin Dashboard: Conversion Funnel ---

// days = '7', '30', '90' or 'all'
// { days, steps: [ { key, label, count, percent_of_total, percent_of_previous } ] }
export function getFunnel(days) {
    return authRequest(`/api/dashboard/funnel/?days=${days}`)
}


// --- Cookie banner, verification, warnings (members / visitors) ---

// { is_enabled, message } - anyone.
export function getCookieBanner() {
    return getJSON('/api/cookie-banner/')
}

// choice = 'all' or 'essential'. Only counted, never linked to a person.
export function sendCookieChoice(choice) {
    return authRequest('/api/cookie-consent/', 'POST', { choice })
}

// { is_verified, requests: [...] }
export function getMyVerification() {
    return authRequest('/api/verification/')
}

export function requestVerification(reason, proofUrl) {
    return authRequest('/api/verification/', 'POST', { reason, proof_url: proofUrl })
}

// Your warnings you haven't confirmed yet.
export function getMyWarnings() {
    return authRequest('/api/warnings/')
}

export function acknowledgeWarning(id) {
    return authRequest(`/api/warnings/${id}/ack/`, 'POST')
}


// --- Admin Dashboard: cookie consent, verification, filter, discipline ---

export function getCookieAdmin() {
    return authRequest('/api/dashboard/cookie-consent/')
}

// changes = { is_enabled } and/or { message }
export function updateCookieBanner(changes) {
    return authRequest('/api/dashboard/cookie-consent/', 'PATCH', changes)
}

export function getVerificationRequests() {
    return authRequest('/api/dashboard/verification/')
}

// decision = 'approve' or 'reject'
export function decideVerification(id, decision, note) {
    return authRequest(`/api/dashboard/verification/${id}/`, 'POST', { decision, note })
}

// The banned words use the shared admin helpers:
//   getAdminList('banned-words'), createAdminItem('banned-words', {...}), ...
// This one is the "test a sentence" box: { action, words }
export function testContentFilter(text) {
    return authRequest('/api/dashboard/banned-words/test/', 'POST', { text })
}

// { warnings: [...], bans: [...] }
export function getDiscipline() {
    return authRequest('/api/dashboard/discipline/')
}

export function warnMember(username, message) {
    return authRequest('/api/dashboard/warnings/', 'POST', { username, message })
}

// days = number of days, or 0 for permanent.
export function banMember(username, reason, days) {
    return authRequest('/api/dashboard/bans/', 'POST', { username, reason, days })
}

export function liftBan(id) {
    return authRequest(`/api/dashboard/bans/${id}/lift/`, 'POST')
}


// --- Tags and Mood of the Day (public) ---

// Tag suggestions for the Write page: [ { name, story_count } ]
export function getTagSuggestions(start = '') {
    return getJSON(`/api/tags/?q=${encodeURIComponent(start)}`)
}

// { date, mood, mood_label, note, stories: [...] } or null.
export function getMoodOfTheDay() {
    return getJSONOrNull('/api/mood-of-the-day/')
}


// --- Admin Dashboard: premium, revenue, scheduled, tags ---

// { currency, members: [...], history: [...] }
export function getPremium() {
    return authRequest('/api/dashboard/premium/')
}

// values = { username, plan, amount, note, gift_days }
export function grantPremium(values) {
    return authRequest('/api/dashboard/premium/', 'POST', values)
}

export function cancelPremium(id) {
    return authRequest(`/api/dashboard/premium/${id}/cancel/`, 'POST')
}

// { currency, total_all_time, this_month, last_month, months: [...], by_plan: [...] }
export function getRevenue() {
    return authRequest('/api/dashboard/revenue/')
}

export function getScheduledStories() {
    return authRequest('/api/dashboard/scheduled/')
}

// action = 'now' | 'cancel' | 'move' (move also needs publishAt)
export function changeScheduledStory(id, action, publishAt = null) {
    return authRequest(`/api/dashboard/scheduled/${id}/`, 'POST', { action, publish_at: publishAt })
}

// The tag admin list, rename and delete use the shared helpers:
//   getAdminList('tags'), updateAdminItem('tags', id, { name }), deleteAdminItem('tags', id)
export function mergeTag(id, intoId) {
    return authRequest(`/api/dashboard/tags/${id}/merge/`, 'POST', { into_id: intoId })
}


// --- Admin Dashboard: search, email log, site health ---

// { users, stories, comments, reports, tickets, contact } - each a
// list of { title, detail, link }
export function adminSearch(query) {
    return authRequest(`/api/dashboard/search/?q=${encodeURIComponent(query)}`)
}

// { backend, total, last_24h, emails: [...] }
export function getEmailLog(query = '', failedOnly = false) {
    return authRequest(`/api/dashboard/email-log/?q=${encodeURIComponent(query)}&failed=${failedOnly ? 1 : 0}`)
}

// { overall, checked_at, checks: [ { group, name, status, detail, link? } ] }
export function getSiteHealth() {
    return authRequest('/api/dashboard/health/')
}


// --- Spotlight and polls (public) ---

// Both answer null when there's nothing to show (Django sends
// "204 No Content", and authRequest turns that into null).
//
// { headline, blurb, starts_on, ends_on, story: {...card} } or null
export function getSpotlight() {
    return authRequest('/api/spotlight/')
}

// { id, question, total_votes, my_vote, options: [ { id, text, votes, percent } ] } or null
// authRequest (with the login cookie) so Django can tell you my_vote.
export function getCurrentPoll() {
    return authRequest('/api/polls/current/')
}

export function votePoll(pollId, optionId) {
    return authRequest(`/api/polls/${pollId}/vote/`, 'POST', { option_id: optionId })
}


// --- Admin Dashboard: featured authors, spotlight, polls, calendar, merge ---
//
// Spotlights use the shared helpers: getAdminList('spotlights'),
// createAdminItem('spotlights', {...}), deleteAdminItem('spotlights', id)

export function getPolls() {
    return authRequest('/api/dashboard/polls/')
}

// options = ['Ghosts', 'Clowns', ...]
export function createPoll(question, options) {
    return authRequest('/api/dashboard/polls/', 'POST', { question, options })
}

export function setPollActive(id, isActive) {
    return authRequest(`/api/dashboard/polls/${id}/`, 'PATCH', { is_active: isActive })
}

export function deletePoll(id) {
    return authRequest(`/api/dashboard/polls/${id}/`, 'DELETE')
}

// Featured authors: [ { id, username, blurb, order, story_count } ]
export function getFeaturedAuthors() {
    return authRequest('/api/dashboard/featured-authors/')
}

export function addFeaturedAuthor(username, blurb) {
    return authRequest('/api/dashboard/featured-authors/', 'POST', { username, blurb })
}

// changes = { blurb } or { move: 'up' | 'down' }. Answers the new list.
export function updateFeaturedAuthor(id, changes) {
    return authRequest(`/api/dashboard/featured-authors/${id}/`, 'PATCH', changes)
}

export function removeFeaturedAuthor(id) {
    return authRequest(`/api/dashboard/featured-authors/${id}/`, 'DELETE')
}

// month = 'YYYY-MM'. { month, events: [ { date, type, title, link } ] }
export function getCalendar(month) {
    return authRequest(`/api/dashboard/calendar/?month=${month}`)
}

// source = the duplicate (deleted), target = the one that stays.
export function mergeStories(sourceId, targetId) {
    return authRequest('/api/dashboard/stories/merge/', 'POST', { source_id: sourceId, target_id: targetId })
}


// --- Site Settings, Rate Limits, IP Blocklist, Audit Log ---

// Public: { maintenance_mode, maintenance_message, signups_open, contact_email }
export function getSiteStatus() {
    return authRequest('/api/site-status/')
}

// Site Settings and Rate Limits are ONE row each - no id in the URL.
// changes = only the fields you changed, e.g. { signups_open: false }
export function getSiteSettings() {
    return authRequest('/api/dashboard/site-settings/')
}

export function updateSiteSettings(changes) {
    return authRequest('/api/dashboard/site-settings/', 'PATCH', changes)
}

export function getRateLimits() {
    return authRequest('/api/dashboard/rate-limits/')
}

export function updateRateLimits(changes) {
    return authRequest('/api/dashboard/rate-limits/', 'PATCH', changes)
}

// -> { my_ip, blocked: [ { id, ip_address, reason, blocked_by, created_at } ] }
export function getBlockedIps() {
    return authRequest('/api/dashboard/blocked-ips/')
}

export function blockIp(ipAddress, reason = '') {
    return authRequest('/api/dashboard/blocked-ips/', 'POST', { ip_address: ipAddress, reason })
}

export function unblockIp(id) {
    return authRequest(`/api/dashboard/blocked-ips/${id}/`, 'DELETE')
}

// filters = { q: 'ban', user: 'christopher' } -> { admins: [...], entries: [...] }
export function getAuditLog(filters = {}) {
    const params = new URLSearchParams(filters)
    return authRequest(`/api/dashboard/audit-log/?${params}`)
}


// --- Email Templates, SEO, Activity Heatmap, AI Toxicity Queue ---

export function getEmailTemplates() {
    return authRequest('/api/dashboard/email-templates/')
}

// key = 'contact_reply', 'support_reply', ... Answers with the template.
export function saveEmailTemplate(key, subject, body) {
    return authRequest(`/api/dashboard/email-templates/${key}/`, 'PATCH', { subject, body })
}

export function resetEmailTemplate(key) {
    return authRequest(`/api/dashboard/email-templates/${key}/`, 'DELETE')
}

// -> { settings, sitemap_count, story_count, issues, sitemap_url, robots_url }
export function getSeo() {
    return authRequest('/api/dashboard/seo/')
}

// changes = { site_title, site_description, allow_indexing } (any of them)
export function updateSeo(changes) {
    return authRequest('/api/dashboard/seo/', 'PATCH', changes)
}

// metric = 'comments' | 'likes' | 'logins' | 'reads' | 'signups', days = 7/30/90/365
export function getHeatmap(metric, days) {
    return authRequest(`/api/dashboard/heatmap/?metric=${metric}&days=${days}`)
}

// status = 'flagged' | 'hidden' | 'approved' | 'clean' | 'all'
export function getToxicityQueue(status) {
    return authRequest(`/api/dashboard/toxicity/?status=${status}`)
}

// Sends the next batch of unchecked comments to Claude.
export function scanForToxicity() {
    return authRequest('/api/dashboard/toxicity/scan/', 'POST')
}

// days = 7 / 30 / 90 / 365
// -> { geoip_installed, countries: [...], ips: [...], totals }
export function getLoginMap(days) {
    return authRequest(`/api/dashboard/login-map/?days=${days}`)
}

// -> { tiles: [...], series: { signups: [{ date, count }], ... }, top_stories, top_categories }
export function getAnalytics(days) {
    return authRequest(`/api/dashboard/analytics/?days=${days}`)
}

// action = 'hide' | 'approve'
export function reviewToxicity(id, action) {
    return authRequest(`/api/dashboard/toxicity/${id}/`, 'POST', { action })
}


// --- Notifications (the bell) ---

// -> { unread: 3, items: [ { id, kind, text, link, is_read, created_at, actor } ] }
export function getNotifications(limit = 10) {
    return authRequest(`/api/accounts/notifications/?limit=${limit}`)
}

// ids = [4, 5] marks those as read; no ids = mark ALL read. -> { unread }
export function markNotificationsRead(ids) {
    return authRequest('/api/accounts/notifications/read/', 'POST', ids ? { ids } : {})
}


// --- Forgot password ---

// Always answers with the same { detail } - whether the email exists or not.
export function requestPasswordReset(email) {
    return authRequest('/api/accounts/password-reset/', 'POST', { email })
}

// uid + token come from the link in the email (the page's URL).
export function confirmPasswordReset(uid, token, password) {
    return authRequest('/api/accounts/password-reset/confirm/', 'POST', { uid, token, password })
}


// --- Confirm email ---

// uid + token from the link in the "confirm your email" email.
export function verifyEmail(uid, token) {
    return authRequest('/api/accounts/verify-email/', 'POST', { uid, token })
}

// The "Send it again" button in the yellow banner.
export function resendVerification() {
    return authRequest('/api/accounts/verify-email/resend/', 'POST')
}


// --- Story series ---

// Your own series, for the picker on the Write page.
// -> [ { id, title, description, author, part_count } ]
export function getMySeries() {
    return authRequest('/api/series/mine/')
}

export function createSeries(title, description = '') {
    return authRequest('/api/series/mine/', 'POST', { title, description })
}

// One series with its parts (anyone can look).
// -> { id, title, description, author, part_count, parts: [...story cards] }
export function getSeries(id) {
    return getJSON(`/api/series/${id}/`)
}


// --- Error Log ---

// A crash in the browser -> Dashboard -> Error Log.
// Used by utils/errorReporting.js (not by pages directly).
export function sendErrorReport(message, details, url) {
    return authRequest('/api/errors/', 'POST', { message, details, url })
}

// Admins: source = 'all' | 'frontend' | 'backend'
export function getErrorLog(source = 'all') {
    return authRequest(`/api/dashboard/errors/${source === 'all' ? '' : `?source=${source}`}`)
}

export function markErrorFixed(id) {
    return authRequest(`/api/dashboard/errors/${id}/`, 'DELETE')
}

export function clearErrorLog() {
    return authRequest('/api/dashboard/errors/', 'DELETE')
}


// --- 18+ stories ---

// birthDate = '1998-04-23'. Only works once per account.
// -> { age_confirmed: true, is_adult: true/false }
export function confirmAge(birthDate) {
    return authRequest('/api/accounts/age/', 'POST', { birth_date: birthDate })
}


// --- Forums ---

export function getBoards() {
    return getJSON('/api/forums/')
}

// A board + its threads. authRequest (not getJSON) so the login cookie
// goes along: threads by people you blocked are left out.
export function getBoard(slug) {
    return authRequest(`/api/forums/${slug}/`)
}

export function startThread(slug, title, body) {
    return authRequest(`/api/forums/${slug}/`, 'POST', { title, body })
}

export function getThread(id) {
    return authRequest(`/api/forums/threads/${id}/`)
}

export function replyToThread(id, body) {
    return authRequest(`/api/forums/threads/${id}/`, 'POST', { body })
}

// Admins. changes = { is_pinned: true } / { is_locked: false }
export function moderateThread(id, changes) {
    return authRequest(`/api/dashboard/forums/threads/${id}/`, 'PATCH', changes)
}

export function deleteThread(id) {
    return authRequest(`/api/dashboard/forums/threads/${id}/`, 'DELETE')
}

export function setPostHidden(id, isHidden) {
    return authRequest(`/api/dashboard/forums/posts/${id}/`, 'PATCH', { is_hidden: isHidden })
}


// --- Videos ---
// Admins use the shared helpers: getAdminList('videos'), createAdminItem('videos', ...)

export function getVideos() {
    return getJSON('/api/videos/')
}


// --- Fear meter + reactions ---

// score 1-5 -> { average, votes, mine }
export function rateFear(storyId, score) {
    return authRequest(`/api/stories/${storyId}/fear/`, 'POST', { score })
}

// kind = 'got_me' | 'cant_sleep' | 'creepy' -> { counts, mine }
export function toggleReaction(storyId, kind) {
    return authRequest(`/api/stories/${storyId}/react/`, 'POST', { kind })
}


// --- Story chains ---

export function getChains() {
    return getJSON('/api/chains/')
}

export function startChain(title, opening) {
    return authRequest('/api/chains/', 'POST', { title, opening })
}

export function getChain(id) {
    return getJSON(`/api/chains/${id}/`)
}

export function addChainPart(id, body) {
    return authRequest(`/api/chains/${id}/`, 'POST', { body })
}

// Admins: close (or re-open) a chain.
export function setChainOpen(id, isOpen) {
    return authRequest(`/api/dashboard/chains/${id}/`, 'PATCH', { is_open: isOpen })
}


// --- Beta readers ---

// Writer: -> { readers: ['moth'], feedback: [{ id, reader, body, created_at }] }
export function getBetaReaders(storyId) {
    return authRequest(`/api/stories/${storyId}/beta/`)
}

export function inviteBetaReader(storyId, username) {
    return authRequest(`/api/stories/${storyId}/beta/`, 'POST', { username })
}

export function removeBetaReader(storyId, username) {
    return authRequest(`/api/stories/${storyId}/beta/${encodeURIComponent(username)}/`, 'DELETE')
}

// Beta reader: private feedback to the writer.
export function sendBetaFeedback(storyId, body) {
    return authRequest(`/api/stories/${storyId}/beta/feedback/`, 'POST', { body })
}


// --- Continue reading ---

// percent = how far down the story you are, 0-100.
export function saveReadingProgress(storyId, percent) {
    return authRequest(`/api/stories/${storyId}/progress/`, 'POST', { percent })
}

// -> [ { progress: 43, story: {...card...} } ]
export function getContinueReading() {
    return authRequest('/api/stories/continue/')
}


// --- Villain of the Week ---

// -> { week, nominations: [...], has_nominated, past_winners: [...] }
// authRequest (not getJSON): logged in, it also says which one YOU voted for.
export function getVillains() {
    return authRequest('/api/villains/')
}

export function nominateVillain(name, reason, storyId) {
    return authRequest('/api/villains/', 'POST', { name, reason, story_id: storyId || null })
}

// Voting again moves your vote (one per week).
export function voteVillain(nominationId) {
    return authRequest(`/api/villains/${nominationId}/vote/`, 'POST')
}

// Admins.
export function removeVillain(nominationId) {
    return authRequest(`/api/dashboard/villains/${nominationId}/`, 'DELETE')
}


// --- Writing Sprints ---

// -> { lengths: [10, 20, 30], leaderboard: [{ username, words, sprints }],
//      me: { sprints, best, week_words } or null for visitors }
export function getSprints() {
    return authRequest('/api/sprints/')
}

// Save a finished sprint (logged-in members). Django caps silly numbers.
export function saveSprint(words, minutes) {
    return authRequest('/api/sprints/', 'POST', { words, minutes })
}


// Author Dashboard, "Over time": 12 weeks of views / likes / read-through,
// and read-through per story. -> { weeks: [...], stories: [...], views_tracked_since }
export function getAuthorTrends() {
    return authRequest('/api/author/trends/')
}


// --- True stories (shared anonymously) ---
// Members: their own submissions. The public list is getStories({ tag: 'true-story' }).

export function getMyTrueStories() {
    return authRequest('/api/true-stories/')
}

// { title, body, where_when, category_id, confirm_true }
export function submitTrueStory(data) {
    return authRequest('/api/true-stories/', 'POST', data)
}

// Take back one that's still waiting for review.
export function withdrawTrueStory(id) {
    return authRequest(`/api/true-stories/${id}/`, 'DELETE')
}

// Admins. status: 'pending' | 'approved' | 'rejected' | 'all'
export function getAdminTrueStories(status) {
    return authRequest(`/api/dashboard/true-stories/?status=${status}`)
}

// action 'approve' ({ content_rating, category_id }) or 'reject' ({ note })
export function reviewTrueStory(id, action, data = {}) {
    return authRequest(`/api/dashboard/true-stories/${id}/${action}/`, 'POST', data)
}


// --- Reading lists (named lists of stories, public ones can be shared) ---

// My lists. With storyId, each list also says has_story: is that story in it?
export function getMyReadingLists(storyId) {
    return authRequest(`/api/reading-lists/${storyId ? `?story=${storyId}` : ''}`)
}

// Someone's PUBLIC lists (for their profile).
export function getUserReadingLists(username) {
    return getJSON(`/api/reading-lists/?user=${encodeURIComponent(username)}`)
}

// One list with its stories. authRequest: the owner can see a private one.
export function getReadingList(id) {
    return authRequest(`/api/reading-lists/${id}/`)
}

// { title, description, is_public }
export function createReadingList(data) {
    return authRequest('/api/reading-lists/', 'POST', data)
}

export function updateReadingList(id, data) {
    return authRequest(`/api/reading-lists/${id}/`, 'PATCH', data)
}

export function deleteReadingList(id) {
    return authRequest(`/api/reading-lists/${id}/`, 'DELETE')
}

export function addToReadingList(listId, storyId) {
    return authRequest(`/api/reading-lists/${listId}/stories/${storyId}/`, 'POST')
}

export function removeFromReadingList(listId, storyId) {
    return authRequest(`/api/reading-lists/${listId}/stories/${storyId}/`, 'DELETE')
}
