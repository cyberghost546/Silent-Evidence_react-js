import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Link as LinkIcon, Check, Lock, Trash2, Flag } from 'lucide-react'
import { getReadingList, updateReadingList, deleteReadingList, removeFromReadingList } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { usePageTitle } from '../../hooks/usePageTitle'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import StoryGridCard from '../StorySections/StoryGridCard'
import ReportDialog from '../ReportDialog/ReportDialog'
import { useAuth } from '../../hooks/useAuth'


// ---------------------------------------------------------------
// ONE READING LIST (/reading-lists/:id) - the page you share.
//
// Everyone sees the title, who made it and the stories (only the
// ones THEY may read - Django filters them). The owner also gets:
// public/private switch, remove a story, delete the list.
// A private list is "not found" for everyone but its owner.
// ---------------------------------------------------------------
function ReadingListPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { data: list, setData: setList, error } = useApi(() => getReadingList(id), [id])
    const [copied, setCopied] = useState(false)
    const [reporting, setReporting] = useState(false)
    const { user } = useAuth()
    usePageTitle(list?.title || 'Reading list')

    if (error) {
        return <PageLayout title='Reading list'><PageMessage title='List not found' text='It may be private, or it was deleted.' /></PageLayout>
    }
    if (!list) return <PageLayout title='Reading list'><PageMessage title='Loading...' /></PageLayout>

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(window.location.href)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Clipboard blocked - the address bar still works.
        }
    }

    async function togglePublic() {
        const updated = await updateReadingList(list.id, { is_public: !list.is_public })
        setList({ ...list, is_public: updated.is_public })
    }

    async function removeStory(story) {
        await removeFromReadingList(list.id, story.id)
        setList({ ...list, stories: list.stories.filter(item => item.id !== story.id), story_count: list.story_count - 1 })
    }

    async function handleDelete() {
        if (!window.confirm(`Delete the list "${list.title}"? The stories stay on the site.`)) return
        await deleteReadingList(list.id)
        navigate('/lists')
    }

    return (
        <PageLayout
            title={list.title}
            subtitle={`A reading list by ${list.owner} · ${list.story_count} ${list.story_count === 1 ? 'story' : 'stories'}`}
            action={list.is_public && (
                <button type='button' onClick={copyLink} className='inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-gray-200 hover:border-slate-500'>
                    {copied ? <Check className='h-4 w-4 text-green-400' /> : <LinkIcon className='h-4 w-4' />}
                    {copied ? 'Link copied!' : 'Copy link to share'}
                </button>
            )}
        >
            {list.description && <p className='-mt-4 mb-8 max-w-2xl text-gray-300'>{list.description}</p>}

            {/* ---------- OWNER TOOLS ---------- */}
            {list.is_mine && (
                <div className='mb-8 flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm'>
                    <label className='flex cursor-pointer items-center gap-2 text-gray-200'>
                        <input type='checkbox' checked={list.is_public} onChange={togglePublic} className='h-4 w-4 accent-red-600' />
                        Public - anyone with the link can see it
                    </label>
                    {!list.is_public && <span className='flex items-center gap-1 text-xs text-gray-400'><Lock className='h-3.5 w-3.5' /> Only you can see this list</span>}
                    <button type='button' onClick={handleDelete} className='ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-400'>
                        <Trash2 className='h-3.5 w-3.5' /> Delete list
                    </button>
                </div>
            )}

            {/* Someone else's public list: report it (spam, hateful title...). */}
            {user && !list.is_mine && (
                <button type='button' onClick={() => setReporting(true)} className='-mt-4 mb-6 flex items-center gap-1 text-xs text-gray-400 hover:text-red-400'>
                    <Flag className='h-3.5 w-3.5' /> Report this list
                </button>
            )}
            {reporting && <ReportDialog target={{ reading_list_id: list.id }} what='reading list' onClose={() => setReporting(false)} />}

            {list.stories.length === 0 ? (
                <PageMessage title='No stories here yet' text={list.is_mine ? 'Open any story, press Actions, then "Add to reading list".' : 'Check back later.'}>
                    <Link to='/explore/latest' className='text-red-400 hover:text-red-300'>Find stories</Link>
                </PageMessage>
            ) : (
                <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                    {list.stories.map(story => (
                        <div key={story.id}>
                            <StoryGridCard story={story} />
                            {list.is_mine && (
                                <button type='button' onClick={() => removeStory(story)} className='mt-2 text-xs text-gray-400 hover:text-red-400'>
                                    Remove from this list
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </PageLayout>
    )
}

export default ReadingListPage
