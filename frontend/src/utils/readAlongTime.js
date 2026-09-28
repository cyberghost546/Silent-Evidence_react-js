// For the read-along pages (components/ReadAlongs/).

// "Fri 3 Oct, 23:30" in the reader's own time zone.
export function whenLabel(iso) {
    return new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
