import { Skull, Ghost, Flame, Moon, Flower2, Snowflake } from 'lucide-react'
import SidebarBox from './SidebarBox'


// ---------------------------------------------------------------
// The spooky days that come back every year.
// month is 0-11 like JavaScript dates (January = 0, October = 9).
// To add one: one more line here. Nothing else changes.
// ---------------------------------------------------------------
const YEARLY_DAYS = [
    { name: 'Walpurgis Night', month: 3, day: 30, icon: Flame },
    { name: 'Halloween', month: 9, day: 31, icon: Ghost },
    { name: "All Saints' Day", month: 10, day: 1, icon: Flower2 },
    { name: 'Day of the Dead', month: 10, day: 2, icon: Flower2 },
    { name: 'Krampusnacht', month: 11, day: 5, icon: Snowflake },
    { name: 'Winter Solstice — Longest Night', month: 11, day: 21, icon: Moon },
]

// One day in milliseconds (JavaScript dates count in milliseconds).
const ONE_DAY = 24 * 60 * 60 * 1000


// ---------------------------------------------------------------
// Works out the next `count` spooky dates from today.
// A plain function (no React) - easy to test or reuse.
//
// Returns: [ { name, date, icon }, ... ] soonest first.
// ---------------------------------------------------------------
function getUpcomingDays(count) {
    // Today at midnight, so "today" counts as 0 days away, not -0.4.
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const events = []

    // The yearly days, for this year AND next year - so in December
    // we still find next Halloween.
    for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
        for (const event of YEARLY_DAYS) {
            events.push({ name: event.name, date: new Date(year, event.month, event.day), icon: event.icon })
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
            events.push({ name: 'Friday the 13th', date: date, icon: Skull })
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

// 0 -> "Today", 1 -> "1 day", 12 -> "12d"
function daysLeftLabel(days) {
    if (days === 0) return 'Today'
    if (days === 1) return '1 day'
    return `${days}d`
}


// ---------------------------------------------------------------
// "HORROR CALENDAR" - the next spooky days and how long until each.
// Nothing comes from Django: the dates are worked out in the browser.
//
// Usage:
//   <HorrorCalendar />           -> next 5
//   <HorrorCalendar count={3} /> -> next 3
// ---------------------------------------------------------------
function HorrorCalendar({ count = 5 }) {
    const days = getUpcomingDays(count)

    return (
        <SidebarBox title='Horror Calendar'>
            <ul className='space-y-3'>
                {days.map(event => {
                    const Icon = event.icon

                    return (
                        // name + time together make a unique key (there
                        // can be two "Friday the 13th"s in the list).
                        <li key={event.name + event.date.getTime()} className='flex items-center gap-3'>
                            <Icon className='h-4 w-4 shrink-0 text-red-500' />

                            <div className='min-w-0 flex-1'>
                                <p className='truncate text-sm font-semibold text-white'>{event.name}</p>
                                <p className='text-xs text-gray-500'>
                                    {event.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>

                            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                                event.daysLeft <= 7 ? 'bg-red-600 text-white' : 'bg-slate-700 text-gray-300'
                            }`}>
                                {daysLeftLabel(event.daysLeft)}
                            </span>
                        </li>
                    )
                })}
            </ul>
        </SidebarBox>
    )
}

export default HorrorCalendar
