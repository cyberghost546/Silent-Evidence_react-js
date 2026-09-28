// ---------------------------------------------------------------
// COMMUNITY: forums, chains, challenges, villains, sprints, read-alongs, support...
//
// Part of the API "client" - components import from api/client.js,
// which passes everything on from these files. The shared plumbing
// (getJSON, authRequest...) is in core.js.
// ---------------------------------------------------------------
import { getJSONOrNull, getJSON, authRequest } from './core'


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


// --- Tags and Mood of the Day (public) ---

// Tag suggestions for the Write page: [ { name, story_count } ]
export function getTagSuggestions(start = '') {
    return getJSON(`/api/tags/?q=${encodeURIComponent(start)}`)
}

// { date, mood, mood_label, note, stories: [...] } or null.
export function getMoodOfTheDay() {
    return getJSONOrNull('/api/mood-of-the-day/')
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


// --- Read-alongs (stories/readalong_views.py) ---

export function getReadAlongs() {
    return getJSON('/api/read-alongs/')
}

// startsAt = an ISO date/time in UTC
export function createReadAlong(storyId, startsAt) {
    return authRequest('/api/read-alongs/', 'POST', { story_id: storyId, starts_at: startsAt })
}

// after = the newest message id we already have (0 = all of them)
export function getReadAlong(id, after = 0) {
    return authRequest(`/api/read-alongs/${id}/?after=${after}`)
}

export function joinReadAlong(id) {
    return authRequest(`/api/read-alongs/${id}/join/`, 'POST')
}

export function sendReadAlongMessage(id, body) {
    return authRequest(`/api/read-alongs/${id}/messages/`, 'POST', { body })
}


// --- Judged challenges (sitecontent/judging_views.py) ---

// Judges: the entries + my scores.
export function getJudging(challengeId) {
    return authRequest(`/api/challenges/${challengeId}/judging/`)
}

export function scoreEntry(challengeId, entryId, score, note) {
    return authRequest(`/api/challenges/${challengeId}/judging/${entryId}/`, 'POST', { score, note })
}

// Admins: judges + ranked results.
export function getChallengeJudging(challengeId) {
    return authRequest(`/api/dashboard/challenges/${challengeId}/judges/`)
}

export function addJudge(challengeId, username) {
    return authRequest(`/api/dashboard/challenges/${challengeId}/judges/`, 'POST', { username })
}

export function removeJudge(challengeId, username) {
    return authRequest(`/api/dashboard/challenges/${challengeId}/judges/${encodeURIComponent(username)}/`, 'DELETE')
}

export function announceWinner(challengeId, storyId) {
    return authRequest(`/api/dashboard/challenges/${challengeId}/announce/`, 'POST', { story_id: storyId })
}

// The Haunted Map: every story with a place -> [{ id, title, author, location, lat, lng, is_true }]
export function getStoryMap() {
    return getJSON('/api/stories/map/')
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
