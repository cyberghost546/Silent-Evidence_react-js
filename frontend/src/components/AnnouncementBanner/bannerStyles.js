// ---------------------------------------------------------------
// The colours of the announcement banner, one per `style` value.
// The values must match Announcement.STYLES in
// backend/sitecontent/models.py.
//
// Used by the banner itself (AnnouncementBanner.jsx) AND by the
// admin page's colour buttons and previews - one list, so they
// always look the same.
// ---------------------------------------------------------------
export const BANNER_STYLES = {
    info: { label: 'Information', classes: 'border-blue-800 bg-blue-950/80 text-blue-100' },
    warning: { label: 'Warning', classes: 'border-amber-700 bg-amber-950/80 text-amber-100' },
    event: { label: 'Event', classes: 'border-red-800 bg-red-950/80 text-red-100' },
}
