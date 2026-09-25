import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'


// ---------------------------------------------------------------
// AGE GATE
//
// Wraps the whole app (see App.jsx). Until the visitor enters a
// date of birth that makes them old enough, they only see this
// screen - the real pages ({children}) are not rendered at all.
//
// The answer is saved in localStorage so they only get asked once
// per browser. To test it again: DevTools -> Application ->
// Local Storage -> delete the "ageGate" key.
//
// To reuse on another site: change MIN_AGE and the text below.
// ---------------------------------------------------------------
const MIN_AGE = 18
const STORAGE_KEY = 'ageGate'   // saved value is 'passed' or 'denied'

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

// Years for the dropdown: this year back to 100 years ago.
// Array.from({ length: 101 }, (_, i) => ...) = "make 101 items,
// and build each one from its index i".
const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 101 }, (_, i) => THIS_YEAR - i)

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

// Same look for all three dropdowns - written once.
const SELECT_STYLE = 'w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none'


// ---------------------------------------------------------------
// Works out someone's age from their birthday.
// Just doing thisYear - birthYear is WRONG if their birthday hasn't
// happened yet this year, so we take 1 off in that case.
// ---------------------------------------------------------------
function getAge(year, month, day) {
    const today = new Date()
    let age = today.getFullYear() - year

    // month is 0-11 here (January = 0), same as JavaScript dates.
    const birthdayNotYet =
        today.getMonth() < month ||
        (today.getMonth() === month && today.getDate() < day)

    if (birthdayNotYet) age = age - 1
    return age
}

// Reading localStorage can throw in some private-browsing modes,
// so it's wrapped in try/catch. If it fails we just ask again.
function loadStatus() {
    try {
        return localStorage.getItem(STORAGE_KEY)
    } catch {
        return null
    }
}

function saveStatus(value) {
    try {
        localStorage.setItem(STORAGE_KEY, value)
    } catch {
        // Can't save - they'll just be asked again next visit.
    }
}


function AgeGate({ children }) {
    // null = not asked yet, 'passed' = old enough, 'denied' = too young.
    // The function form means localStorage is only read once, on the
    // first render (same trick as CategoryPage uses).
    const [status, setStatus] = useState(loadStatus)

    // What's picked in the three dropdowns. '' = nothing picked yet.
    const [month, setMonth] = useState('')
    const [day, setDay] = useState('')
    const [year, setYear] = useState('')
    const [error, setError] = useState('')

    // Already passed? Show the real site and stop here.
    if (status === 'passed') return children

    function handleSubmit(event) {
        // Stop the form from reloading the page.
        event.preventDefault()

        if (month === '' || day === '' || year === '') {
            setError('Please enter your full date of birth.')
            return
        }

        // Catch fake dates like February 31st. new Date() "rolls over"
        // bad dates (Feb 31 becomes Mar 3), so if the month changed,
        // the date didn't exist.
        const date = new Date(Number(year), Number(month), Number(day))
        if (date.getMonth() !== Number(month)) {
            setError('That date does not exist.')
            return
        }

        const age = getAge(Number(year), Number(month), Number(day))
        const result = age >= MIN_AGE ? 'passed' : 'denied'

        saveStatus(result)
        setStatus(result)
    }

    return (
        // fixed inset-0 = covers the whole window.
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 px-4'>
            <div className='w-full max-w-md rounded-xl border border-gray-700/60 bg-gray-900 p-8 text-center shadow-2xl'>

                <h1 className='text-2xl font-bold text-red-600'>Silent Evidence</h1>

                <ShieldAlert className='mx-auto mt-6 h-12 w-12 text-red-500' />

                {status === 'denied' ? (
                    // ---------- TOO YOUNG ----------
                    // No "try again" button on purpose - otherwise they
                    // could just pick an older year.
                    <>
                        <h2 className='mt-4 text-xl font-bold text-white'>Sorry, you can't enter</h2>
                        <p className='mt-2 text-sm text-gray-400'>
                            You must be {MIN_AGE} or older to view this website.
                        </p>
                    </>
                ) : (
                    // ---------- THE QUESTION ----------
                    <>
                        <h2 className='mt-4 text-xl font-bold text-white'>Age verification</h2>
                        <p className='mt-2 text-sm text-gray-400'>
                            This site contains true crime stories with mature and
                            disturbing content. You must be {MIN_AGE} or older to enter.
                        </p>

                        <form onSubmit={handleSubmit} className='mt-6 text-left'>
                            <label className='mb-2 block text-sm font-medium text-gray-300'>
                                Date of birth
                            </label>

                            {/* Three dropdowns side by side. aria-label gives
                                each one a name for screen readers. */}
                            <div className='grid grid-cols-3 gap-2'>
                                <select aria-label='Month' value={month} onChange={e => setMonth(e.target.value)} className={SELECT_STYLE}>
                                    <option value=''>Month</option>
                                    {/* The value is the index (0-11), because
                                        JavaScript dates count months from 0. */}
                                    {MONTHS.map((name, index) => (
                                        <option key={name} value={index}>{name}</option>
                                    ))}
                                </select>

                                <select aria-label='Day' value={day} onChange={e => setDay(e.target.value)} className={SELECT_STYLE}>
                                    <option value=''>Day</option>
                                    {DAYS.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>

                                <select aria-label='Year' value={year} onChange={e => setYear(e.target.value)} className={SELECT_STYLE}>
                                    <option value=''>Year</option>
                                    {YEARS.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Only shows when there's a problem. */}
                            {error && <p className='mt-2 text-sm text-red-400'>{error}</p>}

                            <button
                                type='submit'
                                className='mt-6 w-full rounded-md bg-red-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700'
                            >
                                Enter site
                            </button>
                        </form>

                        <p className='mt-4 text-xs text-gray-500'>
                            By entering you confirm the date above is correct.
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}

export default AgeGate
