import { useState } from 'react'


// ---------------------------------------------------------------
// "Date of birth" with three dropdowns (month, day, year).
//
//   <BirthDateForm onSubmit={isoDate => ...} sending={false} buttonText='Confirm' />
//
// onSubmit gets the date as text Django understands: '1998-04-23'.
// Used by the lock screen on 18+ stories (StoryLock.jsx). It only
// checks the date is REAL here - how old you are is decided by
// Django (accounts/age.py), so it can't be faked in the browser.
// ---------------------------------------------------------------
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
const SELECT_STYLE = 'w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none [color-scheme:dark]'

// 7 -> '07' (Django wants two digits).
const twoDigits = number => String(number).padStart(2, '0')


function BirthDateForm({ onSubmit, sending = false, buttonText = 'Confirm' }) {
    const [month, setMonth] = useState('')
    const [day, setDay] = useState('')
    const [year, setYear] = useState('')
    const [error, setError] = useState('')

    function handleSubmit(event) {
        event.preventDefault()
        setError('')
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
        // month is 0-11 in JavaScript, 1-12 for Django: + 1.
        onSubmit(`${year}-${twoDigits(Number(month) + 1)}-${twoDigits(day)}`)
    }

    return (
        <form onSubmit={handleSubmit} className='text-left'>
            <p className='mb-2 text-sm font-medium text-gray-300'>Date of birth</p>
            {/* Three dropdowns side by side. aria-label gives each one
                a name for screen readers. */}
            <div className='grid grid-cols-3 gap-2'>
                <select aria-label='Month' value={month} onChange={event => setMonth(event.target.value)} className={SELECT_STYLE}>
                    <option value=''>Month</option>
                    {/* The value is the index (0-11), because JavaScript
                        dates count months from 0. */}
                    {MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}
                </select>
                <select aria-label='Day' value={day} onChange={event => setDay(event.target.value)} className={SELECT_STYLE}>
                    <option value=''>Day</option>
                    {DAYS.map(number => <option key={number} value={number}>{number}</option>)}
                </select>
                <select aria-label='Year' value={year} onChange={event => setYear(event.target.value)} className={SELECT_STYLE}>
                    <option value=''>Year</option>
                    {YEARS.map(number => <option key={number} value={number}>{number}</option>)}
                </select>
            </div>

            {error && <p className='mt-2 text-sm text-red-400'>{error}</p>}

            <button type='submit' disabled={sending} className='mt-4 w-full rounded-md bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50'>
                {sending ? 'Checking...' : buttonText}
            </button>
        </form>
    )
}

export default BirthDateForm
