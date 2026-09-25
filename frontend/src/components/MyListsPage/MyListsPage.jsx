import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookmarkX } from 'lucide-react'
import { getSavedStories, saveStory } from '../../api/client'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import StoryGridCard from '../StorySections/StoryGridCard'
import { BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// MY LISTS (/lists) - logged-in users only (App.jsx).
//
// The stories you saved with the "Save" button on a story page.
// Django: SavedStoriesView in backend/stories/views.py.
// ---------------------------------------------------------------
function MyListsPage() {
    // null = still loading. After that, a list of story cards.
    const [stories, setStories] = useState(null)
    const [error, setError] = useState('')

    // Load once, when the page opens.
    useEffect(() => {
        getSavedStories()
            .then(data => setStories(data))
            .catch(() => setError('Could not load your saved stories.'))
    }, [])

    // "Remove from list". saveStory() is a toggle (click once = save,
    // again = unsave) - on a saved story it un-saves it.
    async function handleRemove(id) {
        try {
            await saveStory(id)
            // Take it off the screen too. .filter keeps every story
            // EXCEPT the one we removed.
            setStories(stories.filter(story => story.id !== id))
        } catch {
            setError('Could not remove that story. Try again.')
        }
    }

    // "1 story" / "5 stories" under the title, once loaded.
    let subtitle = 'Stories you saved to read later.'
    if (stories && stories.length > 0) {
        subtitle = `${stories.length} saved ${stories.length === 1 ? 'story' : 'stories'} to read later.`
    }

    return (
        <PageLayout title='My Lists' subtitle={subtitle}>
            {error && <p className='mb-6 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300'>{error}</p>}

            {stories === null && !error && <p className='py-20 text-center text-gray-400'>Loading your list...</p>}

            {stories?.length === 0 && (
                <PageMessage
                    title='Your list is empty.'
                    text='Press "Save" on any story and it shows up here, ready for later.'
                >
                    <Link to='/' className={BUTTON_STYLE}>Discover stories</Link>
                </PageMessage>
            )}

            {stories?.length > 0 && (
                <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                    {stories.map(story => (
                        // The card + a small button under it.
                        <div key={story.id}>
                            <StoryGridCard story={story} />
                            <button
                                type='button'
                                onClick={() => handleRemove(story.id)}
                                className='mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400'
                            >
                                <BookmarkX className='h-3.5 w-3.5' />
                                Remove from list
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </PageLayout>
    )
}

export default MyListsPage
