// ---------------------------------------------------------------
// THE SERVICE WORKER - a small script the browser keeps running in
// the background for our site. It sits BETWEEN the page and the
// internet: every request passes through the 'fetch' listener below,
// and we decide where the answer comes from.
//
// It's what makes Silent Evidence an installable app:
//   - the app's files (JS, CSS, icons) are kept in a cache, so it
//     opens fast - even on a bad connection
//   - no internet: the app still opens, and stories you DOWNLOADED
//     ("Save for offline", utils/offlineStories.js) can be read.
//     Any other page -> the offline page instead of the browser's error.
//
// What it never caches by itself: Django's answers (/api/, /admin/,
// /media/...). Stories, logins and comments always come fresh from
// the server. The ONLY exception: a story you downloaded on purpose
// is read from the 'offline stories' cache when there's no internet.
//
// Registered in src/main.jsx - only in the built site (npm run
// build), never while developing, so `npm run dev` always shows
// your latest code.
//
// CHANGED THIS FILE? Bump VERSION. The browser then installs the new
// worker, and 'activate' below throws the old caches away.
// ---------------------------------------------------------------
const VERSION = 'v3'
const CACHE = `silent-evidence-${VERSION}`
// Downloaded stories live in their own cache, which is NOT thrown
// away when VERSION changes (the same name as in utils/offlineStories.js).
const STORIES_CACHE = 'silent-evidence-offline-stories'

// Saved as soon as the worker is installed.
const START_FILES = ['/offline.html', '/icons/icon-192.png', '/manifest.webmanifest']

// Requests we always leave to the network (Django's addresses).
const NEVER_CACHE = ['/api/', '/admin/', '/media/', '/static/', '/sitemap.xml', '/robots.txt']

// "/api/stories/12/" - one story (the only Django answer we may
// serve from the downloaded-stories cache).
const ONE_STORY = /\/api\/stories\/\d+\/$/

// Pages that still work offline (the app itself + downloaded stories).
const WORKS_OFFLINE = [/^\/stories\/\d+$/, /^\/offline-library$/]


self.addEventListener('install', event => {
    // waitUntil = "don't finish installing until this is done".
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(START_FILES)))
    // Take over straight away instead of waiting for every tab to close.
    self.skipWaiting()
})


self.addEventListener('activate', event => {
    // Delete caches from older versions of this file (never the stories).
    event.waitUntil(
        caches.keys().then(names => Promise.all(
            names.filter(name => name !== CACHE && name !== STORIES_CACHE).map(name => caches.delete(name))
        ))
    )
    self.clients.claim()
})


self.addEventListener('fetch', event => {
    const request = event.request
    const url = new URL(request.url)
    if (request.method !== 'GET') return

    // A downloaded story: the internet first (so it's fresh), the saved
    // copy when there's no connection. (Django can be on another
    // address while developing - that's why this comes before the
    // "our own site only" check below.)
    if (ONE_STORY.test(url.pathname)) {
        event.respondWith(
            fetch(request).catch(() => caches.open(STORIES_CACHE)
                .then(cache => cache.match(request.url))
                .then(saved => saved || Response.error()))
        )
        return
    }

    // Only GETs from our own site. Other sites (YouTube, fonts) go
    // straight through, untouched.
    if (url.origin !== self.location.origin) return
    if (NEVER_CACHE.some(path => url.pathname.startsWith(path))) return

    // 1. PAGES (you opened /stories/12): always try the internet first,
    //    so you get the newest version - and keep a copy of the app's
    //    page (index.html) for when there's no internet.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const copy = response.clone()
                    caches.open(CACHE).then(cache => cache.put('/index.html', copy))
                    return response
                })
                .catch(async () => {
                    // Offline. A page that works offline -> the app itself;
                    // anything else -> the offline page.
                    const works = WORKS_OFFLINE.some(pattern => pattern.test(url.pathname))
                    const app = works && await caches.match('/index.html')
                    return app || caches.match('/offline.html')
                })
        )
        return
    }

    // 2. THE APP'S FILES (/assets/index-B31QH0Nj.js, icons...): the
    //    cache first - they never change (a new build gets new names,
    //    that's what the random part is for), so a saved copy is
    //    always right. Not saved yet -> download it and save it.
    event.respondWith(
        caches.match(request).then(saved => saved || fetch(request).then(response => {
            if (response.ok) {
                // .clone(): an answer can only be read once - one copy
                // for the cache, one for the page.
                const copy = response.clone()
                caches.open(CACHE).then(cache => cache.put(request, copy))
            }
            return response
        }))
    )
})


// ---------------------------------------------------------------
// PHONE NOTIFICATIONS. Django sends { title, body, link }
// (accounts/push.py), the phone's push service delivers it here, and
// we show it - even when no Silent Evidence tab is open.
// ---------------------------------------------------------------
self.addEventListener('push', event => {
    let data = {}
    try {
        data = event.data ? event.data.json() : {}
    } catch {
        data = { body: event.data ? event.data.text() : '' }
    }
    event.waitUntil(self.registration.showNotification(data.title || 'Silent Evidence', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { link: data.link || '/notifications' },
    }))
})

// Tapping the notification: open the page it's about - in a tab we
// already have if there is one, otherwise a new window.
self.addEventListener('notificationclick', event => {
    event.notification.close()
    const link = event.notification.data?.link || '/notifications'
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(tabs => {
            const tab = tabs.find(client => new URL(client.url).origin === self.location.origin)
            if (tab) {
                tab.navigate(link)
                return tab.focus()
            }
            return self.clients.openWindow(link)
        })
    )
})
