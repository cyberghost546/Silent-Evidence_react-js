// ---------------------------------------------------------------
// ADMIN DASHBOARD (admins only)
//
// Part of the API "client" - components import from api/client.js,
// which passes everything on from these files. The shared plumbing
// (getJSON, authRequest...) is in core.js.
// ---------------------------------------------------------------
import { authRequest, toFormData } from './core'


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


// --- Admin Dashboard: safety pages (admins only) ---


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

// "Top of the week": preview it ({ subject, body, recipient_count } or { empty: true }) / send it now.
export function getWeeklyTop() {
    return authRequest('/api/dashboard/weekly-top/')
}

export function sendWeeklyTop() {
    return authRequest('/api/dashboard/weekly-top/', 'POST')
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
