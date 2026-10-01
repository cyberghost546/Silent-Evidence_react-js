import { TriangleAlert } from 'lucide-react'


// ---------------------------------------------------------------
// "This story has 2 jump scares.  [x] Warn me before each one"
//
// Only shows when the writer marked jump scares (!!scare lines -
// see utils/storyFormat.js). The choice is remembered in this
// browser, for every story.
//
// Usage (the parent keeps the on/off value, because StoryBody and
// Focus mode both need it - hooks/useScareWarnings.js):
//   const [warn, setWarn] = useScareWarnings()
//   <JumpScareNotice count={2} warn={warn} onChange={setWarn} />
// ---------------------------------------------------------------
function JumpScareNotice({ count, warn, onChange }) {
    if (count === 0) return null

    return (
        <div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-amber-900/60 bg-amber-950/20 px-4 py-2.5 text-sm'>
            <span className='flex items-center gap-2 text-amber-200'>
                <TriangleAlert className='h-4 w-4' />
                This story has {count} jump {count === 1 ? 'scare' : 'scares'}.
            </span>
            <label className='flex cursor-pointer items-center gap-2 text-gray-300'>
                <input
                    type='checkbox'
                    checked={warn}
                    onChange={event => onChange(event.target.checked)}
                    className='h-4 w-4 accent-amber-500'
                />
                Warn me before each one
            </label>
        </div>
    )
}

export default JumpScareNotice
