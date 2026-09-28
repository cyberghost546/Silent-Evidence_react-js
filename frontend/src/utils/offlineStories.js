import { API_HOST } from '../api/client'


// ---------------------------------------------------------------
// STORIES SAVED FOR OFFLINE READING ("Save for offline" in a story's
// Actions menu, the list at /offline-library).
//
// Two places:
//   - the story itself (Django's answer) goes in the browser's Cache
//     Storage, in the cache the service worker reads when there's no
//     internet (public/sw.js, STORIES_CACHE - same name!)
//   - a small list { id, title, author, savedAt } in localStorage, so
//     the library page can show what you downloaded
//
// Works only where the browser has Cache Storage (every modern one).
// ---------------------------------------------------------------
const CACHE_NAME = 'silent-evidence-offline-stories'
const LIST_KEY = 'offlineStories'

// Can this browser keep stories? (A function, so it's checked when asked.)
export function offlineSupported() {
    return typeof window !== 'undefined' && 'caches' in window
}

function storyUrl(id) {
    return `${API_HOST}/api/stories/${id}/`
}

export function listOffline() {
    try {
        return JSON.parse(localStorage.getItem(LIST_KEY)) || []
    } catch {
        return []
    }
}

function saveList(list) {
    try {
        localStorage.setItem(LIST_KEY, JSON.stringify(list))
    } catch {
        // Storage full / blocked - the story is still in the cache.
    }
}

export function isSavedOffline(id) {
    return listOffline().some(item => item.id === id)
}

// Download the story NOW (fresh, with your login, so 18+ stories you
// may read are included) and keep it.
export async function saveOffline(story) {
    const response = await fetch(storyUrl(story.id), { credentials: 'include' })
    if (!response.ok) throw new Error('Could not download the story.')
    const cache = await caches.open(CACHE_NAME)
    await cache.put(storyUrl(story.id), response)
    const list = listOffline().filter(item => item.id !== story.id)
    saveList([{ id: story.id, title: story.title, author: story.author, savedAt: new Date().toISOString() }, ...list])
}

export async function removeOffline(id) {
    const cache = await caches.open(CACHE_NAME)
    await cache.delete(storyUrl(id))
    saveList(listOffline().filter(item => item.id !== id))
}
