// ---------------------------------------------------------------
// ACCOUNTS: logging in, profiles, settings, notifications, messages
//
// Part of the API "client" - components import from api/client.js,
// which passes everything on from these files. The shared plumbing
// (getJSON, authRequest...) is in core.js.
// ---------------------------------------------------------------
import { getJSON, authRequest } from './core'


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


// --- 18+ stories ---

// birthDate = '1998-04-23'. Only works once per account.
// -> { age_confirmed: true, is_adult: true/false }
export function confirmAge(birthDate) {
    return authRequest('/api/accounts/age/', 'POST', { birth_date: birthDate })
}


// --- Phone notifications (web push, accounts/push_views.py) ---

// -> { public_key ('' = not set up on this site), subscribed (this device) }
export function getPushStatus(endpoint) {
    return authRequest(`/api/accounts/push/${endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : ''}`)
}

// subscription = { endpoint, keys: { p256dh, auth } } from the browser
export function savePushSubscription(subscription) {
    return authRequest('/api/accounts/push/', 'POST', subscription)
}

export function removePushSubscription(endpoint) {
    return authRequest('/api/accounts/push/unsubscribe/', 'POST', { endpoint })
}
