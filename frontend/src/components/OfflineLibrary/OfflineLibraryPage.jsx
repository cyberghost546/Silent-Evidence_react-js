import { useState } from 'react'
import { Link } from 'react-router-dom'
import { WifiOff, Trash2 } from 'lucide-react'
import { listOffline, removeOffline, offlineSupported } from '../../utils/offlineStories'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatShortDate } from '../../utils/format'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'


// ---------------------------------------------------------------
// DOWNLOADED STORIES (/offline-library) - the stories you saved with
// "Save for offline". They open even without internet (the service
// worker, public/sw.js, keeps this page and those stories working).
// The list lives in THIS browser (utils/offlineStories.js).
// ---------------------------------------------------------------
function OfflineLibraryPage() {
    usePageTitle('Downloaded stories')
    const [stories, setStories] = useState(listOffline)

    async function handleRemove(id) {
        await removeOffline(id)
        setStories(listOffline())
    }

    return (
        <PageLayout title='Downloaded stories' subtitle='Saved on this device - you can read them without internet.' width='narrow'>
            {!offlineSupported() && <PageMessage title='Not possible in this browser' text='Your browser cannot keep stories for offline reading.' />}
            {offlineSupported() && stories.length === 0 && (
                <PageMessage title='Nothing downloaded yet' text='On any story, open Actions and choose "Save for offline". Handy for flights, tunnels and haunted houses with no signal.' />
            )}
            <ul className='space-y-3'>
                {stories.map(story => (
                    <li key={story.id} className='flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4'>
                        <WifiOff className='h-5 w-5 shrink-0 text-gray-400' aria-hidden='true' />
                        <Link to={`/stories/${story.id}`} className='min-w-0 flex-1'>
                            <p className='truncate font-semibold text-white hover:text-red-300'>{story.title}</p>
                            <p className='text-xs text-gray-400'>by {story.author} · saved {formatShortDate(story.savedAt)}</p>
                        </Link>
                        <button type='button' onClick={() => handleRemove(story.id)} aria-label={`Remove ${story.title}`} className='text-gray-400 hover:text-red-400'>
                            <Trash2 className='h-4 w-4' />
                        </button>
                    </li>
                ))}
            </ul>
        </PageLayout>
    )
}

export default OfflineLibraryPage
