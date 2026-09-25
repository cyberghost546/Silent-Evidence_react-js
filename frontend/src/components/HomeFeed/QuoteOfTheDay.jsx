import SidebarBox from './SidebarBox'


// ---------------------------------------------------------------
// The quotes. Add as many as you like - a new one shows up
// automatically when its day comes around.
// ---------------------------------------------------------------
const QUOTES = [
    { text: 'A good scare is worth more to a man than good advice.', author: 'Edgar Watson Howe' },
    { text: 'The oldest and strongest emotion of mankind is fear, and the oldest and strongest kind of fear is fear of the unknown.', author: 'H. P. Lovecraft' },
    { text: 'We make up horrors to help us cope with the real ones.', author: 'Stephen King' },
    { text: 'Deep into that darkness peering, long I stood there, wondering, fearing.', author: 'Edgar Allan Poe' },
    { text: 'The most terrifying fact about the universe is not that it is hostile but that it is indifferent.', author: 'Stanley Kubrick' },
    { text: 'Monsters are real, and ghosts are real too. They live inside us, and sometimes, they win.', author: 'Stephen King' },
]


// Picks the same quote all day, and a different one tomorrow.
//
// Date.now() / ONE_DAY = how many whole days since 1970. That number
// goes up by 1 every day, and % QUOTES.length (the remainder) turns
// it into 0, 1, 2 ... 5, 0, 1 ... - so we walk through the list and
// start again at the end.
function getTodaysQuote() {
    const ONE_DAY = 24 * 60 * 60 * 1000
    const dayNumber = Math.floor(Date.now() / ONE_DAY)
    return QUOTES[dayNumber % QUOTES.length]
}


// ---------------------------------------------------------------
// "QUOTE OF THE DAY" - no Django needed.
//
// Usage:
//   <QuoteOfTheDay />
// ---------------------------------------------------------------
function QuoteOfTheDay() {
    const quote = getTodaysQuote()

    return (
        <SidebarBox>
            <p className='text-xs font-bold uppercase tracking-widest text-gray-400'>Quote of the Day</p>

            {/* <blockquote> + <cite> are the "proper" tags for a quote
                and who said it - screen readers understand them. */}
            <blockquote className='mt-3 border-l-2 border-red-600 pl-3 text-sm italic leading-6 text-gray-200'>
                “{quote.text}”
            </blockquote>
            <cite className='mt-3 block text-xs not-italic text-red-400'>— {quote.author}</cite>
        </SidebarBox>
    )
}

export default QuoteOfTheDay
