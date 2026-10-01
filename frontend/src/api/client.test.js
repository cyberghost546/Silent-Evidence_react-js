import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getStories, getStory, nominateVillain, removeVillain, getRandomPrompt } from './client'


// ---------------------------------------------------------------
// client.js - EVERY request to Django goes through here, so these
// tests check the plumbing: the login cookie, the CSRF token, JSON
// bodies, and what happens when Django says no.
//
// fetch is replaced with a fake (vi.fn) that answers what we tell it
// and remembers how it was called.
// ---------------------------------------------------------------
function answer(status, body) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    }
}

beforeEach(() => {
    globalThis.fetch = vi.fn()
    document.cookie = 'csrftoken=abc123'
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('public requests (getJSON)', () => {
    it('build the query string and send the cookie', async () => {
        fetch.mockResolvedValue(answer(200, []))
        await getStories({ tag: 'halloween', limit: 4 })
        const [url, options] = fetch.mock.calls[0]
        expect(url).toMatch(/\/api\/stories\/\?tag=halloween&limit=4$/)
        expect(options.credentials).toBe('include')
    })

    it('throw with the status on a 404, so pages can show "not found"', async () => {
        fetch.mockResolvedValue(answer(404, { detail: 'Not found.' }))
        await expect(getStory(99)).rejects.toMatchObject({ status: 404 })
    })

    it('"nothing" (204) becomes null for getJSONOrNull', async () => {
        fetch.mockResolvedValue(answer(204, null))
        expect(await getRandomPrompt()).toBeNull()
    })
})

describe('logged-in requests (authRequest)', () => {
    it('send the CSRF token, the cookie and a JSON body', async () => {
        fetch.mockResolvedValue(answer(201, { id: 3 }))
        const result = await nominateVillain('The Keeper', 'Never blinks.', 5)
        const [url, options] = fetch.mock.calls[0]

        expect(url).toMatch(/\/api\/villains\/$/)
        expect(options.method).toBe('POST')
        expect(options.credentials).toBe('include')
        expect(options.headers['X-CSRFToken']).toBe('abc123')
        expect(options.headers['Content-Type']).toBe('application/json')
        expect(JSON.parse(options.body)).toEqual({ name: 'The Keeper', reason: 'Never blinks.', story_id: 5 })
        expect(result).toEqual({ id: 3 })
    })

    it("put Django's field errors on error.data", async () => {
        fetch.mockResolvedValue(answer(400, { name: ['This field is required.'] }))
        await expect(nominateVillain('', '', null)).rejects.toMatchObject({
            status: 400,
            data: { name: ['This field is required.'] },
        })
    })

    it('survive a crash page (HTML instead of JSON)', async () => {
        fetch.mockResolvedValue(answer(500, '<h1>Server Error</h1>'))
        await expect(removeVillain(1)).rejects.toMatchObject({ status: 500, data: { detail: 'Server error (500)' } })
    })

    it('a DELETE answered with 204 gives null', async () => {
        fetch.mockResolvedValue(answer(204, ''))
        expect(await removeVillain(1)).toBeNull()
    })
})
