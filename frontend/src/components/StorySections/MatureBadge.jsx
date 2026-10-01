// ---------------------------------------------------------------
// The red "18+" label on story cards (only for 18+ stories).
//
//   <MatureBadge story={story} />
//
// Put it inside the picture's box (which has `relative`). The blurred
// cover that goes with it: useMatureBlur() in hooks/useMatureBlur.js.
// ---------------------------------------------------------------
function MatureBadge({ story }) {
    if (story.content_rating !== 'mature') return null
    return (
        <span className='absolute right-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-extrabold text-white shadow' title='For readers 18 and over'>
            18+
        </span>
    )
}


export default MatureBadge
