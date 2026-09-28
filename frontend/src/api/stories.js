// ---------------------------------------------------------------
// STORIES: reading, writing, liking, lists, series, the map...
//
// Part of the API "client" - components import from api/client.js,
// which passes everything on from these files. The shared plumbing
// (getJSON, authRequest...) is in core.js.
// ---------------------------------------------------------------
import { getJSON, authRequest } from './core'


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
// "Import from Word": a .docx -> { title, body } (not saved - the
// Write page fills its form with it).
export function importDocx(file) {
    const data = new FormData()
    data.append('file', file)
    return authRequest('/api/stories/import-docx/', 'POST', data)
}

export function createStory(formData) {
    return authRequest('/api/stories/new/', 'POST', formData)
}


// --- Author Dashboard (logged in) ---

// All the numbers for YOUR stories. days = 7 or 30 (the charts and
// the "last X days" boxes). See AuthorStatsView in stories/views.py.
export function getAuthorStats(days = 30) {
    return authRequest(`/api/author/stats/?days=${days}`)
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


// --- Fear meter + reactions ---

// score 1-5 -> { average, votes, mine }
export function rateFear(storyId, score) {
    return authRequest(`/api/stories/${storyId}/fear/`, 'POST', { score })
}

// kind = 'got_me' | 'cant_sleep' | 'creepy' -> { counts, mine }
export function toggleReaction(storyId, kind) {
    return authRequest(`/api/stories/${storyId}/react/`, 'POST', { kind })
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


// --- Editing your story + version history (stories/edit_views.py) ---

export function getStoryForEdit(id) {
    return authRequest(`/api/stories/${id}/edit/`)
}

// { title, excerpt, body } - the old text goes into the history first.
export function saveStoryEdit(id, data) {
    return authRequest(`/api/stories/${id}/edit/`, 'PATCH', data)
}

// Private feedback from Claude on your own story.
// -> { configured, remaining_today (null = no limit), history: [{ id, created_at, feedback }] }
export function getStoryFeedback(id) {
    return authRequest(`/api/stories/${id}/feedback/`)
}

export function askStoryFeedback(id) {
    return authRequest(`/api/stories/${id}/feedback/`, 'POST')
}

export function getStoryVersions(id) {
    return authRequest(`/api/stories/${id}/versions/`)
}

export function restoreStoryVersion(id, versionId) {
    return authRequest(`/api/stories/${id}/versions/${versionId}/restore/`, 'POST')
}

// "Picked for you" on the homepage: story cards, each with a `reason`.
export function getRecommendedStories() {
    return authRequest('/api/stories/recommended/')
}

export function getAuthorTrends() {
    return authRequest('/api/author/trends/')
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
