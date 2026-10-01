// ---------------------------------------------------------------
// Open the Messages pop-up from ANYWHERE on the site.
//
// The same idea as openWatcher() (SiteGuide/openWatcher.js): the
// pop-up lives in Header.jsx, but the buttons that open it are all
// over the place - the header icon, the phone menu, the user menu,
// the "Message" button on a profile...
//
//   anywhere:  openMessages('raven')  ──►  window event  ──►  Header opens it
//
//   openMessages()         -> the list of your conversations
//   openMessages('raven')  -> straight into your chat with raven
//
// A CustomEvent can carry extra information in `detail` - here, who
// to open the chat with.
// ---------------------------------------------------------------

export const OPEN_MESSAGES_EVENT = 'open-messages'

export function openMessages(username = '') {
    window.dispatchEvent(new CustomEvent(OPEN_MESSAGES_EVENT, { detail: { username } }))
}
