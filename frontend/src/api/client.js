// ---------------------------------------------------------------
// THE API CLIENT - every request to Django goes through here.
//
// Components always import from THIS file:
//   import { getStory, likeStory } from '../../api/client'
//
// It used to be one 1,600-line file. Now the functions live in files
// by topic, and this file just passes them all on ("re-exports"):
//
//   core.js       API_HOST, getJSON, authRequest (+ CSRF), toFormData...
//   accounts.js   log in, profiles, settings, notifications, messages
//   stories.js    reading, writing, likes, lists, series, the map
//   community.js  forums, chains, challenges, villains, read-alongs...
//   admin.js      the Admin Dashboard
//   payments.js   Pro + tips (candles)
//
// Adding a function: put it in the file for its topic - nothing to
// change here. A new topic file: add one "export *" line below.
// ---------------------------------------------------------------
export { API_HOST, mediaUrl } from './core'
export * from './accounts'
export * from './stories'
export * from './community'
export * from './admin'
export * from './payments'
