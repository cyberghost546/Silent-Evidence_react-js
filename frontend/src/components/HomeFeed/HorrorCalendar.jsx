import SidebarBox from './SidebarBox'
import { getUpcomingDays } from '../../utils/horrorDays'


// The spooky days themselves (and how the next ones are worked out)
// live in utils/horrorDays.js - the homepage's seasonal banner
// uses the same list.

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
