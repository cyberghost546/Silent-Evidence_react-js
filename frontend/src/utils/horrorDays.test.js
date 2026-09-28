import { describe, it, expect } from 'vitest'
import { getUpcomingDays, getCurrentSeason, getSeasonByKey } from './horrorDays'


// Dates are passed in, so these tests work on any day of the year.
// Remember: months are 0-11 (October = 9).
describe('horrorDays', () => {
    it('counts the days to Halloween', () => {
        const next = getUpcomingDays(1, new Date(2026, 9, 28))
        expect(next[0].name).toBe('Halloween')
        expect(next[0].daysLeft).toBe(3)
    })

    it('finds Friday the 13ths', () => {
        // 13 November 2026 is a Friday.
        const days = getUpcomingDays(5, new Date(2026, 10, 3))
        expect(days.some(day => day.key === 'friday-13th' && day.date.getMonth() === 10)).toBe(true)
    })

    it('the Halloween season starts a week before', () => {
        expect(getCurrentSeason(new Date(2026, 9, 23))).toBeNull()               // 8 days before
        expect(getCurrentSeason(new Date(2026, 9, 24)).key).toBe('halloween')   // 7 days before
        expect(getCurrentSeason(new Date(2026, 9, 31)).daysLeft).toBe(0)        // the day itself
    })

    it('a quiet day has no season, but any season can be previewed', () => {
        expect(getCurrentSeason(new Date(2026, 6, 1))).toBeNull()
        expect(getSeasonByKey('krampusnacht', new Date(2026, 6, 1)).season.tag).toBe('krampus')
        expect(getSeasonByKey('no-such-thing')).toBeNull()
    })
})
