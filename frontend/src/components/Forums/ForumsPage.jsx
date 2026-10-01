import { Link } from 'react-router-dom'
import { MessagesSquare, FolderSearch, Lightbulb, ChevronRight } from 'lucide-react'
import { getBoards } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { usePageTitle } from '../../hooks/usePageTitle'
import { pluralize } from '../../utils/format'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'


// ---------------------------------------------------------------
// FORUMS (/forums) - the list of boards.
// The boards themselves are made by a Django migration
// (forums/migrations/0002_the_three_boards.py); the menu in
// Header.jsx links straight to them.
// ---------------------------------------------------------------

// An icon per board. Unknown boards (added later) get the first one.
const BOARD_ICONS = {
    general: MessagesSquare,
    'cold-cases': FolderSearch,
    theories: Lightbulb,
}


function ForumsPage() {
    usePageTitle('Forums')
    const { data: boards, error } = useApi(() => getBoards())

    return (
        <PageLayout title='Forums' subtitle='Talk horror with the community.' width='narrow'>
            {error && <PageMessage title='Could not load the forums' text={error} />}
            <ul className='space-y-3'>
                {boards?.map(board => {
                    const Icon = BOARD_ICONS[board.slug] || MessagesSquare
                    return (
                        <li key={board.slug}>
                            <Link to={`/forums/${board.slug}`} className='flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-red-800'>
                                <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-950/60 text-red-400'>
                                    <Icon className='h-6 w-6' />
                                </span>
                                <span className='min-w-0 flex-1'>
                                    <span className='block text-lg font-bold text-white'>{board.name}</span>
                                    <span className='block text-sm text-gray-400'>{board.description}</span>
                                    <span className='mt-1 block text-xs text-gray-500'>
                                        {pluralize(board.thread_count, 'thread', 'threads')} · {pluralize(board.post_count, 'reply', 'replies')}
                                    </span>
                                </span>
                                <ChevronRight className='h-5 w-5 shrink-0 text-gray-500' />
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </PageLayout>
    )
}

export default ForumsPage
