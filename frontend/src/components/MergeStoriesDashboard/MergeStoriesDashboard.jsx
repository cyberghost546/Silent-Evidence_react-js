import { useState, useEffect } from 'react'
import { GitMerge, ArrowRight } from 'lucide-react'
import { getAdminStories, mergeStories } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE, LABEL_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> MERGE STORIES (/dashboard/merge).
//
// Someone published the same story twice? Merge the duplicate INTO
// the original:
//   - likes, saves, comments, reports, reading history, challenge
//     entries and spotlights move to the original
//   - tags are combined, views are added up
//   - the duplicate is deleted
// (Likes/saves from people who already liked BOTH are counted once.)
// ---------------------------------------------------------------

// One of the two boxes: pick a story, see its numbers.
// `id` links the <label> to its <select> (click the label = focus the box).
function StoryPick({ id, label, stories, value, onChange, exclude }) {
    const picked = stories.find(story => String(story.id) === String(value))
    return (
        <div className='flex-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-5'>
            <label htmlFor={id} className={LABEL_STYLE}>{label}</label>
            <select id={id} value={value} onChange={event => onChange(event.target.value)} className={`${INPUT_STYLE} [color-scheme:dark]`}>
                <option value=''>Pick a story...</option>
                {stories.filter(story => String(story.id) !== String(exclude)).map(story => (
                    <option key={story.id} value={story.id}>#{story.id} {story.title} - {story.author}</option>
                ))}
            </select>
            {picked && (
                <p className='mt-3 text-sm text-gray-400'>
                    {picked.status} · {picked.views} views · {picked.like_count} likes · {picked.comment_count} comments
                </p>
            )}
        </div>
    )
}


function MergeStoriesDashboard() {
    const [stories, setStories] = useState([])
    const [sourceId, setSourceId] = useState('')
    const [targetId, setTargetId] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        // The Stories page's list: every story, drafts too.
        getAdminStories()
            .then(data => setStories(data.stories))
            .catch(() => setError('Could not load the stories.'))
    }, [reloadKey])

    async function handleMerge() {
        const source = stories.find(story => String(story.id) === sourceId)
        const target = stories.find(story => String(story.id) === targetId)
        if (!window.confirm(`Merge "${source.title}" INTO "${target.title}"?\n\n"${source.title}" will be deleted. This can't be undone.`)) return

        setError('')
        try {
            const answer = await mergeStories(sourceId, targetId)
            setNotice(`${answer.detail} Moved: ${answer.moved.likes} likes, ${answer.moved.comments} comments, ${answer.moved.saves} saves.`)
            setSourceId('')
            setTargetId('')
            setReloadKey(current => current + 1)
        } catch (err) {
            setError(err.data?.detail || 'Could not merge.')
        }
    }

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <GitMerge className='h-7 w-7 text-red-500' />
                Merge Stories
            </h1>
            <p className='mt-1 text-gray-400'>Combine a duplicate into the original. Everything moves over, the duplicate is deleted.</p>

            <PageMessages error={error} notice={notice} />

            {/* Two boxes with an arrow between them: duplicate -> original. */}
            <div className='mt-6 flex flex-col items-stretch gap-4 md:flex-row md:items-center'>
                <StoryPick id='merge-source' label='The duplicate (will be deleted)' stories={stories} value={sourceId} onChange={setSourceId} exclude={targetId} />
                <ArrowRight className='mx-auto h-6 w-6 shrink-0 rotate-90 text-red-500 md:rotate-0' />
                <StoryPick id='merge-target' label='The original (stays)' stories={stories} value={targetId} onChange={setTargetId} exclude={sourceId} />
            </div>

            <button
                type='button'
                onClick={handleMerge}
                disabled={!sourceId || !targetId}
                className='mt-6 rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50'
            >
                Merge
            </button>
        </div>
    )
}

export default MergeStoriesDashboard
