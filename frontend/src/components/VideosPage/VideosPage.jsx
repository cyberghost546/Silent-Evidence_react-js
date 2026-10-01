import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { getVideos } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { usePageTitle } from '../../hooks/usePageTitle'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'


// ---------------------------------------------------------------
// VIDEOS (/videos) - horror story readings from YouTube.
// Admins add them on Dashboard -> Videos.
//
// "Click to play": at first each card is just the video's picture.
// The real YouTube player loads only after a click - so the page
// stays fast (no 12 players loading at once), and YouTube can't
// track visitors who never press play. youtube-nocookie.com is
// YouTube's own "no cookies until you play" address.
// ---------------------------------------------------------------
function VideoCard({ video }) {
    const [playing, setPlaying] = useState(false)

    return (
        <article className='overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60'>
            {/* aspect-video = always 16:9, like a YouTube player. */}
            <div className='relative aspect-video bg-black'>
                {playing ? (
                    <iframe
                        src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}?autoplay=1`}
                        title={video.title}
                        allow='autoplay; encrypted-media; picture-in-picture'
                        allowFullScreen
                        className='h-full w-full'
                    />
                ) : (
                    <button type='button' onClick={() => setPlaying(true)} aria-label={`Play ${video.title}`} className='group h-full w-full'>
                        {/* YouTube makes a picture for every video at this address. */}
                        <img src={`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`} alt='' loading='lazy' className='h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100' />
                        <span className='absolute inset-0 flex items-center justify-center'>
                            <span className='flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform group-hover:scale-110'>
                                <Play className='ml-1 h-6 w-6 fill-white text-white' />
                            </span>
                        </span>
                    </button>
                )}
            </div>
            <div className='p-4'>
                <h2 className='font-bold text-white'>{video.title}</h2>
                {video.description && <p className='mt-1 text-sm text-gray-400'>{video.description}</p>}
                {video.story_id && (
                    <Link to={`/stories/${video.story_id}`} className='mt-2 inline-block text-sm font-semibold text-red-400 hover:text-red-300'>
                        Read "{video.story_title}" →
                    </Link>
                )}
            </div>
        </article>
    )
}


function VideosPage() {
    usePageTitle('Videos')
    const { data: videos, error } = useApi(() => getVideos())

    return (
        <PageLayout title='Videos' subtitle='Stories from the site, read aloud. Headphones recommended.'>
            {error && <PageMessage title='Could not load the videos' text={error} />}
            {videos?.length === 0 && <PageMessage title='No videos yet' text='The first readings are being recorded.' />}
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                {videos?.map(video => <VideoCard key={video.id} video={video} />)}
            </div>
        </PageLayout>
    )
}

export default VideosPage
