// ---------------------------------------------------------------
// Small text helpers used all over the site.
// Plain functions - no React - so any file can import them.
// ---------------------------------------------------------------


// pluralize(1, 'story', 'stories') -> "1 story"
// pluralize(5, 'story', 'stories') -> "5 stories"
// pluralize(0, 'story', 'stories') -> "0 stories"
export function pluralize(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`
}


// "2026-09-24T12:30:00Z" (what Django sends) -> "Sep 24"
//
// toLocaleDateString formats a date the way the visitor's computer
// is set up. `undefined` = "use their language", and the options
// object picks which parts to show.
export function formatShortDate(isoString) {
    return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    })
}


// "2026-09-27T12:00:00Z" -> "just now" / "5m ago" / "3h ago" / "2d ago",
// and the plain date ("Sep 3") once it's older than a week.
export function timeAgo(isoString) {
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return formatShortDate(isoString)
}


// Plain text -> a list of paragraphs. A blank line = a new paragraph.
//
// /\n\s*\n/ is a "regular expression" meaning: a line break, maybe
// some spaces, another line break. .filter() drops empty pieces
// (e.g. from extra blank lines at the end).
export function splitParagraphs(text) {
    return text.split(/\n\s*\n/).filter(paragraph => paragraph.trim() !== '')
}


// "2026-09-24T12:30:00Z" -> "September 24, 2026"
// Same idea, just asking for more parts of the date.
export function formatLongDate(isoString) {
    return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}


// Money in the right currency and the visitor's own number style:
//   formatMoney('4.99', 'EUR') -> "€4.99" (or "4,99 €" in Dutch)
// Intl.NumberFormat is built into JavaScript.
export function formatMoney(amount, currency) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount))
}
