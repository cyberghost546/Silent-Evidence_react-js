import { describe, it, expect, vi, afterEach } from 'vitest'
import { pluralize, timeAgo } from './format'


// ---------------------------------------------------------------
// THE SIMPLEST KIND OF TEST: a plain function, no React.
// Give it an input, check the output. Run all tests with:  npm test
//
//   describe('name', ...)  groups related tests
//   it('does X', ...)      one test - the text says what it checks
//   expect(a).toBe(b)      fails the test if a isn't b
// ---------------------------------------------------------------

describe('pluralize', () => {
    it('uses the singular word for exactly 1', () => {
        expect(pluralize(1, 'story', 'stories')).toBe('1 story')
    })

    it('uses the plural word for 0 and for more than 1', () => {
        expect(pluralize(0, 'story', 'stories')).toBe('0 stories')
        expect(pluralize(5, 'story', 'stories')).toBe('5 stories')
    })
})


describe('timeAgo', () => {
    // vi.useFakeTimers + setSystemTime = pretend "now" is a fixed
    // moment, so the answers don't change depending on when you run it.
    const NOW = new Date('2026-09-27T12:00:00Z')

    afterEach(() => {
        vi.useRealTimers()
    })

    function ago(milliseconds) {
        vi.useFakeTimers()
        vi.setSystemTime(NOW)
        return timeAgo(new Date(NOW.getTime() - milliseconds).toISOString())
    }

    it('says "just now" under a minute', () => {
        expect(ago(30 * 1000)).toBe('just now')
    })

    it('counts minutes, hours and days', () => {
        expect(ago(5 * 60 * 1000)).toBe('5m ago')
        expect(ago(3 * 60 * 60 * 1000)).toBe('3h ago')
        expect(ago(2 * 24 * 60 * 60 * 1000)).toBe('2d ago')
    })

    it('shows a date once it is older than a week', () => {
        // Not "9d ago" - just no "ago" at all.
        expect(ago(9 * 24 * 60 * 60 * 1000)).not.toContain('ago')
    })
})
