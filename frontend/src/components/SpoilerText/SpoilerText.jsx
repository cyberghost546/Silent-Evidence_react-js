import { useState } from 'react'
import { splitSpoilers } from '../../utils/spoilers'


// ---------------------------------------------------------------
// Text where ||this part|| is a SPOILER: blurred until you tap it.
// Used for comments and forum posts.
//
// Usage:
//   <SpoilerText text={comment.body} />
//
// Like the story text, it's never turned into HTML - the pieces are
// plain text in <span>s, so nobody can sneak a <script> in.
// ---------------------------------------------------------------

// One hidden part. A <button>, so keyboard users can open it too.
function Spoiler({ text }) {
    const [shown, setShown] = useState(false)

    if (shown) return <span className='rounded bg-slate-800 px-1'>{text}</span>

    return (
        <button
            type='button'
            onClick={() => setShown(true)}
            aria-label='Spoiler - click to show'
            title='Spoiler - click to show'
            // blur-sm makes the letters unreadable; select-none stops
            // "select all + copy" from revealing it.
            className='cursor-pointer select-none rounded bg-slate-700 px-1 text-transparent blur-[3px] transition hover:blur-[2px]'
        >
            {text}
        </button>
    )
}

function SpoilerText({ text }) {
    return splitSpoilers(text).map((piece, index) => (
        piece.spoiler ? <Spoiler key={index} text={piece.text} /> : <span key={index}>{piece.text}</span>
    ))
}

export default SpoilerText
