import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'


// ---------------------------------------------------------------
// Tests for the SERVICE WORKER's notification parts (public/sw.js).
//
// A service worker runs in the browser's background, not in a page -
// so here we run the file with a FAKE `self` that remembers the
// listeners, then fire pretend 'push' / 'notificationclick' events.
// ---------------------------------------------------------------
function loadWorker() {
    const listeners = {}
    const fakeSelf = {
        location: { origin: 'https://site.example' },
        addEventListener: (type, handler) => { listeners[type] = handler },
        skipWaiting: vi.fn(),
        registration: { showNotification: vi.fn(() => Promise.resolve()) },
        clients: { claim: vi.fn(), matchAll: vi.fn(), openWindow: vi.fn() },
    }
    // Tests run from the frontend folder, so this path starts there.
    const code = readFileSync('public/sw.js', 'utf8')
    // new Function(...) runs the file's code with our fake `self` and `caches`.
    new Function('self', 'caches', code)(fakeSelf, {})
    return { listeners, fakeSelf }
}

// An event with waitUntil, like the browser gives. We keep the promise.
function event(extra) {
    const promises = []
    return { ...extra, waitUntil: promise => promises.push(promise), done: () => Promise.all(promises) }
}

describe('service worker: phone notifications', () => {
    let worker
    beforeEach(() => {
        worker = loadWorker()
    })

    it('shows what Django sent', async () => {
        const push = event({ data: { json: () => ({ title: 'Silent Evidence', body: 'moth replied to you', link: '/stories/11' }) } })
        worker.listeners.push(push)
        await push.done()
        expect(worker.fakeSelf.registration.showNotification).toHaveBeenCalledWith('Silent Evidence', expect.objectContaining({
            body: 'moth replied to you',
            icon: '/icons/icon-192.png',
            data: { link: '/stories/11' },
        }))
    })

    it('tapping it opens the page it is about', async () => {
        worker.fakeSelf.clients.matchAll.mockResolvedValue([])   // no tab open
        const click = event({ notification: { close: vi.fn(), data: { link: '/stories/11' } } })
        worker.listeners.notificationclick(click)
        await click.done()
        expect(click.notification.close).toHaveBeenCalled()
        expect(worker.fakeSelf.clients.openWindow).toHaveBeenCalledWith('/stories/11')
    })

    it('uses a tab that is already open instead of a new window', async () => {
        const tab = { url: 'https://site.example/', navigate: vi.fn(), focus: vi.fn() }
        worker.fakeSelf.clients.matchAll.mockResolvedValue([tab])
        const click = event({ notification: { close: vi.fn(), data: { link: '/profile/moth' } } })
        worker.listeners.notificationclick(click)
        await click.done()
        expect(tab.navigate).toHaveBeenCalledWith('/profile/moth')
        expect(worker.fakeSelf.clients.openWindow).not.toHaveBeenCalled()
    })
})
