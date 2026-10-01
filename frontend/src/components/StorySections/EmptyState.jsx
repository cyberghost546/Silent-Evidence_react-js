// ---------------------------------------------------------------
// The dark "nothing here yet" box.
//
// Usage:
//   <EmptyState
//       title='No battle active right now'
//       message='Check back soon — the next showdown is coming.'
//   />
//
// Use it anywhere a list or card can be empty - it's much nicer
// for visitors than a blank gap on the page.
// ---------------------------------------------------------------
function EmptyState({ title, message }) {
    return (
        <div className='rounded-xl border border-gray-800 bg-gray-950 px-6 py-12 text-center'>
            <p className='font-semibold text-gray-400'>{title}</p>
            {message && <p className='mt-2 text-sm text-gray-500'>{message}</p>}
        </div>
    )
}

export default EmptyState
