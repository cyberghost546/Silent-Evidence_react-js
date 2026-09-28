// ---------------------------------------------------------------
// THE SERVICE WORKER - a small script the browser keeps running in
// the background for our site. It sits BETWEEN the page and the
// internet: every request passes through the 'fetch' listener below,
// and we decide where the answer comes from.
//
// It's what makes Silent Evidence an installable app:
//   - the app's files (JS, CSS, icons) are kept in a cache, so it
//     opens fast - even on a bad connection
//   - no internet at all -> the offline page instead of the
//     browser's dinosaur
//
// What it NEVER caches: anything from Django (/api/, /admin/, /media/...).
// Stories, logins and comments always come fresh from the server -
// an old copy of "who is logged in" would be a real bug.
//
// Registered in src/main.jsx - only in the built site (npm run
// build), never while developing, so `npm run dev` always shows
// your latest code.
//
// CHANGED THIS FILE? Bump VERSION. The browser then installs the new
// worker, and 'activate' below throws the old caches away.
// ---------------------------------------------------------------
const VERSION = 'v1'
const CACHE = `silent-evidence-${VERSION}`

// Saved as soon as the worker is installed.
const START_FILES = ['/offline.html', '/icons/icon-192.png', '/manifest.webmanifest']

// Requests we always leave to the network (Django's addresses).
const NEVER_CACHE = ['/api/', '/admin/', '/media/', '/static/', '/sitemap.xml', '/robots.txt']


self.addEventListener('install', event => {
    // waitUntil = "don't finish installing until this is done".
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(START_FILES)))
    // Take over straight away instead of waiting for every tab to close.
    self.skipWaiting()
})


self.addEventListener('activate', event => {
    // Delete caches from older versions of this file.
    event.waitUntil(
        caches.keys().then(names => Promise.all(
            names.filter(name => name !== CACHE).map(name => caches.delete(name))
        ))
    )
    self.clients.claim()
})


self.addEventListener('fetch', event => {
    const request = event.request
    const url = new URL(request.url)

    // Only GETs from our own site. POSTs (logging in, commenting...)
    // and other sites (YouTube, fonts) go straight through, untouched.
    if (request.method !== 'GET' || url.origin !== self.location.origin) return
    if (NEVER_CACHE.some(path => url.pathname.startsWith(path))) return

    // 1. PAGES (you opened /stories/12): always try the internet first,
    //    so you get the newest version. Offline -> the offline page.
    if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
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
