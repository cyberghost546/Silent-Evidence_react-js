import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { getReadersStop } from '../../api/client'
import Panel from '../Dashboard/Panel'
import BarChart from '../Dashboard/BarChart'


// ---------------------------------------------------------------
// WHERE READERS STOP (Pro) on the Author Dashboard.
//
// Pick one of your stories -> a bar for every 10% of the story:
// "how many of your readers got at least this far?" The bars only
// go down (nobody reaches 50% without passing 40%). A BIG step down
// between two bars = that part of the story loses people - worth
// rereading.
//
// Two requests: first the list of your stories (for the drop-down),
// then the numbers for the one you pick.
//
// Not Pro? Django answers 403 + pro_required, and we show a short
// "this is a Pro feature" box instead.
// ---------------------------------------------------------------
function AuthorReadersStop() {
    // null = still loading, 'pro' = not Pro, otherwise the list.
    const [stories, setStories] = useState(null)
    const [storyId, setStoryId] = useState('')
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    // 1. The list of stories (once).
    useEffect(() => {
        getReadersStop()
            .then(answer => {
                setStories(answer.stories)
                // Start with the most-read story.
                if (answer.stories.length > 0) setStoryId(String(answer.stories[0].id))
            })
            .catch(err => {
                if (err.data?.pro_required) setStories('pro')
                else setError('Could not load your stories.')
            })
    }, [])

    // 2. The numbers - again every time you pick another story.
    useEffect(() => {
        if (!storyId) return
        // ignore = "this answer is for a story you've already switched
        // away from" - don't show it. (Answers can arrive out of order.)
        let ignore = false
        getReadersStop(storyId)
            .then(answer => { if (!ignore) setResult(answer) })
            .catch(() => { if (!ignore) setError('Could not load the numbers.') })
        return () => { ignore = true }
    }, [storyId])

    // --- Not Pro: a teaser ---
    if (stories === 'pro') {
        return (
            <Panel title='Where readers stop' subtitle='How far readers get in each story'>
                <div className='flex items-start gap-3 rounded-lg border border-yellow-800/50 bg-yellow-950/20 p-4'>
                    <Crown className='mt-0.5 h-5 w-5 shrink-0 text-yellow-400' aria-hidden='true' />
                    <p className='text-sm text-gray-300'>
                        See the exact part of each story where readers give up - so you know what to fix.
                        This comes with <Link to='/premium' className='font-semibold text-yellow-400 underline'>Silent Evidence Pro</Link>.
                    </p>
                </div>
            </Panel>
        )
    }

    if (error) {
        return (
            <Panel title='Where readers stop'>
                <p className='text-sm text-red-400'>{error}</p>
            </Panel>
        )
    }

    if (stories === null) return null   // still loading

    return (
        <Panel title='Where readers stop' subtitle='Of your readers, how many got this far into the story'>
            {stories.length === 0 ? (
                <p className='py-6 text-center text-sm text-gray-500'>Publish a story first - then you'll see how far readers get.</p>
            ) : (
                <>
                    <label htmlFor='readers-stop-story' className='sr-only'>Story</label>
                    <select
                        id='readers-stop-story'
                        value={storyId}
                        onChange={event => setStoryId(event.target.value)}
                        className='mb-4 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white sm:w-auto'
                    >
                        {stories.map(story => (
                            <option key={story.id} value={story.id}>
                                {story.title} ({story.readers} {story.readers === 1 ? 'reader' : 'readers'})
                            </option>
                        ))}
                    </select>

                    {result && result.readers === 0 && (
                        <p className='py-6 text-center text-sm text-gray-500'>Nobody has read this one yet.</p>
                    )}

                    {result && result.readers > 0 && (
                        <>
                            {/* The labels say how far into the story ("50%");
                                the bar height + number = how many readers got there. */}
                            <BarChart
                                data={result.marks.map(row => ({ label: `${row.mark}%`, value: row.percent }))}
                                color='bg-amber-500'
                                unit='%'
                            />
                            <p className='mt-3 text-xs text-gray-500'>
                                Based on {result.readers} {result.readers === 1 ? 'reader' : 'readers'} (logged-in readers only).
                                {' '}{result.marks[result.marks.length - 1].percent}% read to the very end.
                            </p>
                        </>
                    )}
                </>
            )}
        </Panel>
    )
}

export default AuthorReadersStop
