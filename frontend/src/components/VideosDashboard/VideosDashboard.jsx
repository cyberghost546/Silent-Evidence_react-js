import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clapperboard, Trash2 } from 'lucide-react'
import { getAdminList, createAdminItem, deleteAdminItem, getStoryPicker } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> VIDEOS (/dashboard/videos).
// Paste a YouTube link, give it a title, optionally pick the story
// it reads - it appears on the public /videos page right away.
// Django pulls the video id out of the link (sitecontent/video_views.py).
// ---------------------------------------------------------------
const EMPTY_FORM = { url: '', title: '', description: '', story_id: '' }


function VideosDashboard() {
    const { data: videos, error: loadError, reload } = useApi(() => getAdminList('videos'))
    const { data: stories } = useApi(() => getStoryPicker())
    const [form, setForm] = useState(EMPTY_FORM)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    function update(name, value) {
        setForm(current => ({ ...current, [name]: value }))
    }

    async function handleAdd(event) {
        event.preventDefault()
        setError('')
        setNotice('')
        try {
            // story_id '' -> null (no story).
            await createAdminItem('videos', { ...form, story_id: form.story_id || null })
            setForm(EMPTY_FORM)
            setNotice('Video added.')
            reload()
        } catch (err) {
            setError(err.data ? Object.values(err.data).flat().join(' ') : 'Could not add the video.')
        }
    }

    async function handleDelete(video) {
        if (!window.confirm(`Remove "${video.title}"?`)) return
        await deleteAdminItem('videos', video.id)
        reload()
    }

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Clapperboard className='h-7 w-7 text-red-500' />
                Videos
            </h1>
            <p className='mt-1 text-gray-400'>Story readings from YouTube, shown on the <Link to='/videos' className='text-red-400 hover:text-red-300'>Videos page</Link>.</p>

            <PageMessages error={error || loadError} notice={notice} />

            <form onSubmit={handleAdd} className='mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <div>
                    <label htmlFor='video-url' className={LABEL_STYLE}>YouTube link</label>
                    <input id='video-url' value={form.url} onChange={event => update('url', event.target.value)} placeholder='https://www.youtube.com/watch?v=...' className={INPUT_STYLE} />
                </div>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <div>
                        <label htmlFor='video-title' className={LABEL_STYLE}>Title</label>
                        <input id='video-title' value={form.title} onChange={event => update('title', event.target.value)} maxLength={150} className={INPUT_STYLE} />
                    </div>
                    <div>
                        <label htmlFor='video-story' className={LABEL_STYLE}>Story it reads <span className='font-normal text-gray-500'>(optional)</span></label>
                        <select id='video-story' value={form.story_id} onChange={event => update('story_id', event.target.value)} className={`${INPUT_STYLE} [color-scheme:dark]`}>
                            <option value=''>- none -</option>
                            {stories?.map(story => <option key={story.id} value={story.id}>{story.title}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor='video-description' className={LABEL_STYLE}>Short description <span className='font-normal text-gray-500'>(optional)</span></label>
                    <input id='video-description' value={form.description} onChange={event => update('description', event.target.value)} maxLength={300} className={INPUT_STYLE} />
                </div>
                <button type='submit' disabled={!form.url.trim() || !form.title.trim()} className={BUTTON_STYLE}>Add video</button>
            </form>

            <ul className='mt-8 space-y-3'>
                {videos?.length === 0 && <li className='text-sm text-gray-500'>No videos yet.</li>}
                {videos?.map(video => (
                    <li key={video.id} className='flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3'>
                        <img src={`https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`} alt='' className='h-14 w-24 shrink-0 rounded object-cover' />
                        <div className='min-w-0 flex-1'>
                            <p className='truncate font-semibold text-white'>{video.title}</p>
                            <p className='truncate text-xs text-gray-500'>{video.story_title ? `Reads "${video.story_title}"` : 'No story linked'}</p>
                        </div>
                        <button type='button' onClick={() => handleDelete(video)} aria-label={`Remove ${video.title}`} className='text-gray-500 hover:text-red-400'>
                            <Trash2 className='h-4 w-4' />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default VideosDashboard
