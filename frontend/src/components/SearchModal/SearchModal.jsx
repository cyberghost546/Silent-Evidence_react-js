import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBox from '../SearchBox/SearchBox'


// ---------------------------------------------------------------
// The pop-up search ("modal") that opens from the header's
// magnifying glass:
//
//   ░░░░░░░░░░░░░ the page, darkened + blurred ░░░░░░░░░░░░░
//   ░░   ╭──────────────────────────────────────────╮     ░░
//   ░░   │ 🔍 Search stories, authors...  [Search] │     ░░
//   ░░   │ TRY (Paranormal) (Creepy) ...           │     ░░
//   ░░   ╰──────────────────────────────────────────╯     ░░
//   ░░               [ESC] to close                       ░░
//
// Usage (the parent decides WHEN it's open):
//   const [searchOpen, setSearchOpen] = useState(false)
//   ...
//   {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
//
// It closes when you:
//   - press Escape
//   - click the dark area around the box
//   - search (it then goes to /search?q=...)
//
// The box itself is our SearchBox component - the same one as on the
// Search page. This file only adds the "pop-up" part around it.
// ---------------------------------------------------------------
function SearchModal({ onClose }) {
    const navigate = useNavigate()

    // While the modal is open:
    //   1. listen for the Escape key
    //   2. stop the page BEHIND it from scrolling
    // The cleanup (return) undoes both when it closes.
    useEffect(() => {
        function handleKey(event) {
            if (event.key === 'Escape') onClose()
        }
        // 'keydown' on the whole document, so it works wherever the
        // cursor is.
        document.addEventListener('keydown', handleKey)

        // overflow hidden on <body> = no scrollbar, no scrolling.
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', handleKey)
            document.body.style.overflow = ''
        }
    }, [onClose])

    // SearchBox calls this with the words.
    function handleSearch(words) {
        onClose()
        // encodeURIComponent: spaces and symbols become URL-safe text
        // ("red house" -> "red%20house").
        navigate(`/search?q=${encodeURIComponent(words)}`)
    }

    return (
        // ---------- THE DARK BACKGROUND ----------
        // fixed inset-0 = covers the whole window (top/right/bottom/left 0).
        // z-[60] = on top of everything - the header, the tab bar AND
        // the cookie box (those are z-50 or lower).
        // bg-black/70 = black at 70%, so the page shows through a bit.
        // backdrop-blur-sm = blurs the page behind it.
        //
        // onClick={onClose}: clicking the dark area closes it.
        // role='dialog' + aria-modal tell screen readers "this is a
        // pop-up; ignore the page behind it".
        <div
            role='dialog'
            aria-modal='true'
            aria-label='Search the site'
            onClick={onClose}
            //
            // PHONES: a full screen of its own (bg-slate-950, not
            // see-through), like the search page in a phone app. The box
            // sits at the TOP (pt-3), and env(safe-area-inset-top) keeps
            // it below an iPhone's notch. Closed with the Cancel button
            // (onCancel below) - a phone has no Esc key.
            // From "sm" up: the dark see-through background with the box
            // floating in it (pt-24), like before.
            // overflow-y-auto: a long list of recent searches can scroll.
            className='fixed inset-0 z-[60] overflow-y-auto bg-slate-950 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:bg-black/70 sm:pt-24 sm:backdrop-blur-sm'
        >

            {/* ---------- THE BOX ---------- */}
            {/* event.stopPropagation(): a click INSIDE the box would
                otherwise "bubble up" to the dark background and close
                the modal. This stops it at the box.
                styles: max-w-3xl = not wider than the page content,
                mx-auto = centred. */}
            <div onClick={event => event.stopPropagation()} className='mx-auto max-w-3xl'>
                {/* autoFocus: the cursor is in the input right away,
                    so you can start typing without clicking. */}
                {/* onCancel: SearchBox shows a "Cancel" button on phones. */}
                <SearchBox onSearch={handleSearch} onCancel={onClose} autoFocus />
            </div>

            {/* ---------- "ESC to close" ---------- */}
            {/* <kbd> is the HTML tag for "a key on the keyboard".
                hidden sm:block: phones have no Esc key, so no hint there. */}
            <p className='mt-4 hidden text-center text-sm text-gray-400 sm:block'>
                <kbd className='rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs font-semibold text-gray-300'>
                    ESC
                </kbd>{' '}
                to close
            </p>
        </div>
    )
}

export default SearchModal
