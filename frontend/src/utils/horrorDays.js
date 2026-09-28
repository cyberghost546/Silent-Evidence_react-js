import { Skull, Ghost, Flame, Moon, Flower2, Snowflake } from 'lucide-react'


// ---------------------------------------------------------------
// THE SPOOKY DAYS that come back every year - used by:
//   - the Horror Calendar box (HomeFeed/HorrorCalendar.jsx)
//   - the seasonal banner on the homepage (HomeFeed/SeasonalTakeover.jsx)
//
// month is 0-11 like JavaScript dates (January = 0, October = 9).
//
// `season` = what the homepage banner shows in the run-up:
//   lead     - how many days BEFORE the day the banner appears
//              (0 = only on the day itself)
//   tag      - stories with this tag are shown (?tag= on /api/stories/)
//   headline, text - the words on the banner
//
// To add a day: one more line here. Nothing else changes.
// ---------------------------------------------------------------
export const YEARLY_DAYS = [
    {
        key: 'walpurgis', name: 'Walpurgis Night', month: 3, day: 30, icon: Flame,
        season: { lead: 1, tag: 'witches', headline: 'Walpurgis Night', text: 'Bonfires on the hills. The witches are out tonight.' },
    },
    {
        key: 'halloween', name: 'Halloween', month: 9, day: 31, icon: Ghost,
        season: { lead: 7, tag: 'halloween', headline: 'Halloween is coming', text: 'Carve the pumpkin, lock the door, and read these by candlelight.' },
    },
    { key: 'all-saints', name: "All Saints' Day", month: 10, day: 1, icon: Flower2 },
    {
        key: 'day-of-the-dead', name: 'Day of the Dead', month: 10, day: 2, icon: Flower2,
        season: { lead: 1, tag: 'ghosts', headline: 'Day of the Dead', text: 'The dead come home tonight. Leave a light on for them.' },
    },
    {
        key: 'krampusnacht', name: 'Krampusnacht', month: 11, day: 5, icon: Snowflake,
        season: { lead: 2, tag: 'krampus', headline: 'Krampusnacht', text: 'Hear the chains in the snow? Better have been good this year.' },
    },
    {
        key: 'solstice', name: 'Winter Solstice — Longest Night', month: 11, day: 21, icon: Moon,
        season: { lead: 0, tag: 'winter', headline: 'The Longest Night', text: 'More dark than any other night of the year. Plenty of time to read.' },
    },
]

// Friday the 13th isn't on a fixed date, so it's worked out below.
export const FRIDAY_13TH = {
    key: 'friday-13th', name: 'Friday the 13th', icon: Skull,
    season: { lead: 0, tag: 'cursed', headline: 'Friday the 13th', text: "Don't walk under ladders. Don't break mirrors. Do read these." },
}

// One day in milliseconds (JavaScript dates count in milliseconds).
const ONE_DAY = 24 * 60 * 60 * 1000


// ---------------------------------------------------------------
// The next `count` spooky dates from `now` (default: right now).
// Plain functions (no React) - easy to test or reuse.
//
// Returns: [ { key, name, date, icon, season, daysLeft }, ... ] soonest first.
// ---------------------------------------------------------------
export function getUpcomingDays(count, now = new Date()) {
    // Today at midnight, so "today" counts as 0 days away, not -0.4.
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const events = []

    // The yearly days, for this year AND next year - so in December
    // we still find next Halloween.
    for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
        for (const event of YEARLY_DAYS) {
            events.push({ ...event, date: new Date(year, event.month, event.day) })
        }
    }

    // Friday the 13ths: look at the 13th of each of the next 24
    // months, and keep the ones that are a Friday.
    // getDay() gives the weekday: 0 = Sunday ... 5 = Friday.
    // (new Date(2026, 13, 13) is fine - JavaScript rolls month 13
    // over into February of the next year by itself.)
    for (let i = 0; i < 24; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() + i, 13)
        if (date.getDay() === 5) {
            events.push({ ...FRIDAY_13TH, date: date })
        }
    }

    return events
        .filter(event => event.date >= today)      // not in the past
        .sort((a, b) => a.date - b.date)          // soonest first
        .slice(0, count)                           // only the first few
        .map(event => ({
            ...event,
            // Math.round, because days with a clock change (summer
            // time) are 23 or 25 hours long.
            daysLeft: Math.round((event.date - today) / ONE_DAY),
        }))
}


// The season running NOW (its banner should show), or null.
// = the next spooky day, if we're inside its `lead` days.
export function getCurrentSeason(now = new Date()) {
    const upcoming = getUpcomingDays(3, now)
    return upcoming.find(event => event.season && event.daysLeft <= event.season.lead) ?? null
}


// One season by its key, whatever the date - for previewing the
// banner (/?season=halloween). null if there's no such season.
export function getSeasonByKey(key, now = new Date()) {
    return getUpcomingDays(40, now).find(event => event.key === key && event.season) ?? null
}
