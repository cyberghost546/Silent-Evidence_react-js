import { sendErrorReport } from '../api/client'


// ---------------------------------------------------------------
// SEND A CRASH TO THE ERROR LOG (Dashboard -> Error Log).
//
//   reportError(error)                  - any JavaScript error
//   setupErrorReporting()               - once, in main.jsx: also
//                                         catch errors nobody caught
//
// Crashes inside React components are caught by ErrorBoundary.jsx,
// which calls reportError too.
//
// It must NEVER cause a new error itself (that could loop forever),
// so everything is wrapped in try/catch and failures are ignored.
// ---------------------------------------------------------------
export function reportError(error, details = '') {
    try {
        sendErrorReport(
            String(error?.message || error).slice(0, 300),
            // error.stack = where in the code it happened.
            `${error?.stack || ''}\n${details}`.trim().slice(0, 10000),
            window.location.pathname,
        ).catch(() => {})
    } catch {
        // ignore - reporting is a bonus, not a must
    }
}


// Two browser events for errors that happened OUTSIDE React's drawing:
//   'error'              - e.g. a crash inside a setTimeout
//   'unhandledrejection' - a Promise failed and nobody had a .catch()
export function setupErrorReporting() {
    window.addEventListener('error', event => reportError(event.error || event.message))
    window.addEventListener('unhandledrejection', event => reportError(event.reason))
}
