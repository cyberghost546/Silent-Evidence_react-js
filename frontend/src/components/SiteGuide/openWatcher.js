// ---------------------------------------------------------------
// Open the Ask The Watcher pop-up from ANYWHERE on the site.
//
// The pop-up lives in Header.jsx (like the Site Guide tour), but the
// buttons that open it are all over the place: the user menu, the
// footer, the Site Guide page, the Support page...
//
// Instead of passing a callback down through every component, those
// buttons just call openWatcher(). It sends a small "event" on the
// window, and Header listens for it:
//
//   anywhere:  openWatcher()  ──►  window event  ──►  Header opens it
// ---------------------------------------------------------------

export const OPEN_WATCHER_EVENT = 'open-watcher'

export function openWatcher() {
    window.dispatchEvent(new Event(OPEN_WATCHER_EVENT))
}
