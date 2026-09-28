import { useEffect } from 'react'
import { X } from 'lucide-react'
import StoryBody from './StoryBody'


// ---------------------------------------------------------------
// FOCUS MODE: just the title and the text, on a plain dark screen.
//
// It's a layer drawn OVER the whole page (fixed + inset-0 + z-50),
// so the header, footer, likes and comments are simply covered up -
// nothing else on the page has to change or know about it.
//
// Props:
//   title, body, textSize - what to show
//   onClose               - called by the X button or the Escape key
// ---------------------------------------------------------------
function FocusView({ title, body, textSize, showScares, easyRead, onClose }) {
    // Escape closes focus mode. Listening to the keyboard is outside
    // React, so it's an effect - and the cleanup removes the listener
    // when focus mode closes. (Same pattern as useDropdown.)
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === 'Escape') onClose()
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    return (
        // fixed inset-0 = stretch over the whole window.
        // overflow-y-auto = this layer scrolls on its own.
        // overscroll-contain = scrolling past the end doesn't start
        // scrolling the page hidden underneath.
        <div className='fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-gray-950 px-4 py-20'>
            <button
                type='button'
                onClick={onClose}
                className='fixed right-6 top-6 inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 hover:text-white'
            >
                <X className='h-3.5 w-3.5' />
                Exit focus (Esc)
            </button>

            {/* max-w-2xl: a narrow column is easier on the eyes. */}
            <div className='mx-auto max-w-2xl'>
                <h1 className='mb-10 text-3xl font-extrabold text-white sm:text-4xl'>{title}</h1>
                <StoryBody body={body} size={textSize} showScares={showScares} easyRead={easyRead} />
            </div>
        </div>
    )
}

export default FocusView
