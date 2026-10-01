import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { getCalendar } from '../../api/client'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> CONTENT CALENDAR (/dashboard/calendar).
//
// One month at a glance: what goes live when, and what's planned.
// Django collects the events from several tables (ContentCalendarView):
// scheduled + published stories, challenge deadlines, moods,
// spotlights and newsletters. Click an event to go to its page.
//
// Building a month grid by hand:
//   1. find the weekday of the 1st (Monday = first column)
//   2. put that many empty boxes before it
//   3. then one box per day of the month
// ---------------------------------------------------------------

// Each event type: a label and colour, used in the grid AND the legend.
const TYPES = {
    scheduled: { label: 'Scheduled', dot: 'bg-blue-400' },
    published: { label: 'Published', dot: 'bg-green-500' },
    challenge: { label: 'Challenge deadline', dot: 'bg-red-500' },
    mood: { label: 'Mood of the day', dot: 'bg-purple-400' },
    spotlight: { label: 'Spotlight', dot: 'bg-amber-400' },
    newsletter: { label: 'Newsletter', dot: 'bg-slate-300' },
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// 'YYYY-MM' for a year and a month number (1-12).
function monthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`
}


function CalendarDashboard() {
    const now = new Date()
    // { year, month } - month is 1-12 (people-style, not JavaScript's 0-11).
    const [shown, setShown] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
    const [data, setData] = useState(null)

    const key = monthKey(shown.year, shown.month)

    useEffect(() => {
        let ignore = false
        getCalendar(key)
            .then(result => {
                if (!ignore) setData(result)
            })
            .catch(() => {})
        return () => {
            ignore = true
        }
    }, [key])

    // Previous / next month (December + 1 = January of next year).
    function step(change) {
        const index = shown.year * 12 + (shown.month - 1) + change
        setShown({ year: Math.floor(index / 12), month: (index % 12) + 1 })
    }

    // ---------- THE GRID ----------
    // new Date(year, monthIndex, 0) = the LAST day of the month before
    // - a handy trick to get "how many days has this month".
    const daysInMonth = new Date(shown.year, shown.month, 0).getDate()
    // getDay(): Sunday = 0 ... Saturday = 6. We want Monday first, so
    // (getDay() + 6) % 7 turns Monday into 0 and Sunday into 6.
    const firstWeekday = (new Date(shown.year, shown.month - 1, 1).getDay() + 6) % 7
    const cells = [
        ...Array(firstWeekday).fill(null),                          // empty boxes before the 1st
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),    // 1, 2, 3 ... 30
    ]
    // 4. fill the last week with empty boxes too, so the grid is a
    //    full rectangle (otherwise you'd see a grey gap).
    while (cells.length % 7 !== 0) cells.push(null)

    // Group the events by date: { '2026-09-27': [ ... ], ... }
    const byDate = {}
    if (data?.month === key) {
        for (const event of data.events) {
            byDate[event.date] = [...(byDate[event.date] || []), event]
        }
    }

    const todayKey = `${monthKey(now.getFullYear(), now.getMonth() + 1)}-${String(now.getDate()).padStart(2, '0')}`
    const monthName = new Date(shown.year, shown.month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

    return (
        <div className='max-w-6xl'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                    <CalendarDays className='h-7 w-7 text-red-500' />
                    Content Calendar
                </h1>
                <div className='flex items-center gap-2'>
                    <button type='button' onClick={() => step(-1)} aria-label='Previous month' className='rounded-lg border border-slate-700 p-2 text-gray-300 hover:border-slate-500'><ChevronLeft className='h-4 w-4' /></button>
                    <span className='w-40 text-center font-semibold capitalize text-white'>{monthName}</span>
                    <button type='button' onClick={() => step(1)} aria-label='Next month' className='rounded-lg border border-slate-700 p-2 text-gray-300 hover:border-slate-500'><ChevronRight className='h-4 w-4' /></button>
                </div>
            </div>

            {/* The legend: every type with its colour. */}
            <ul className='mt-4 flex flex-wrap gap-4 text-xs text-gray-400'>
                {Object.entries(TYPES).map(([type, look]) => (
                    <li key={type} className='flex items-center gap-1.5'><span className={`h-2 w-2 rounded-full ${look.dot}`} />{look.label}</li>
                ))}
            </ul>

            {/* 7 columns = one week per row. overflow-x-auto: on a
                phone the calendar scrolls sideways instead of squashing. */}
            <div className='mt-4 overflow-x-auto'>
                <div className='grid min-w-[48rem] grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800'>
                    {WEEKDAYS.map(day => (
                        <div key={day} className='bg-slate-900 px-2 py-2 text-center text-xs font-semibold uppercase text-gray-500'>{day}</div>
                    ))}
                    {cells.map((day, index) => {
                        if (day === null) return <div key={`empty-${index}`} className='min-h-28 bg-slate-950/60' />
                        const dateKey = `${key}-${String(day).padStart(2, '0')}`
                        const events = byDate[dateKey] || []
                        return (
                            <div key={dateKey} className={`min-h-28 bg-slate-950 p-1.5 ${dateKey === todayKey ? 'ring-1 ring-inset ring-red-600' : ''}`}>
                                <p className={`text-xs ${dateKey === todayKey ? 'font-bold text-red-400' : 'text-gray-500'}`}>{day}</p>
                                <ul className='mt-1 space-y-1'>
                                    {/* Max 3 per day, then "+2 more". */}
                                    {events.slice(0, 3).map((event, i) => (
                                        <li key={i}>
                                            <Link to={event.link} title={event.title} className='flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] text-gray-200 hover:bg-slate-800'>
                                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPES[event.type].dot}`} />
                                                <span className='truncate'>{event.title}</span>
                                            </Link>
                                        </li>
                                    ))}
                                    {events.length > 3 && <li className='px-1 text-[10px] text-gray-500'>+{events.length - 3} more</li>}
                                </ul>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default CalendarDashboard
