import { Signpost } from 'lucide-react'


// "Choose your path" on a story card - for stories with sections and
// choices (utils/storyPaths.js). Top-left of the picture; the 18+
// badge (MatureBadge) sits top-right, so both can show.
function PathBadge({ story }) {
    if (!story.is_interactive) return null
    return (
        <span className='absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold text-black shadow'>
            <Signpost className='h-3 w-3' /> Choose your path
        </span>
    )
}

export default PathBadge
