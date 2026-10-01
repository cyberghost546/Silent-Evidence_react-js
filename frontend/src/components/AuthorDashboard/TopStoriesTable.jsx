import { Link } from 'react-router-dom'
import { Eye, Heart, MessageSquare } from 'lucide-react'


// The little coloured label after each title. Written out in full
// so Tailwind can see the class names.
const STATUS_STYLES = {
    published: 'border-green-800 bg-green-950/40 text-green-400',
    draft: 'border-slate-600 bg-slate-800 text-gray-400',
    scheduled: 'border-amber-800 bg-amber-950/40 text-amber-400',
}


// ---------------------------------------------------------------
// A table of stories with their numbers:
//
//   Story                    👁 Views   ♥ Likes   💬 Comments
//   The Old Way [Published]      1,204        57            12
//
// Usage:
//   <TopStoriesTable stories={[ { id, title, views, likes, comments, status }, ... ]} />
//
// A real <table>, because this IS table data (rows and columns) -
// screen readers can then read "Views: 1,204" for each cell.
// ---------------------------------------------------------------
function TopStoriesTable({ stories }) {
    if (stories.length === 0) {
        return <p className='py-6 text-center text-sm text-gray-500'>No stories yet.</p>
    }

    return (
        // overflow-x-auto: on a phone the table scrolls sideways
        // instead of squashing the columns.
        <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
                <thead>
                    <tr className='border-b border-gray-800 text-left text-xs text-gray-500'>
                        <th className='pb-2 font-medium'>Story</th>
                        {/* text-right: numbers line up nicely on the right. */}
                        <th className='pb-2 text-right font-medium'><Eye className='ml-auto h-4 w-4' aria-label='Views' /></th>
                        <th className='pb-2 text-right font-medium'><Heart className='ml-auto h-4 w-4' aria-label='Likes' /></th>
                        <th className='pb-2 text-right font-medium'><MessageSquare className='ml-auto h-4 w-4' aria-label='Comments' /></th>
                    </tr>
                </thead>

                <tbody>
                    {stories.map(story => (
                        <tr key={story.id} className='border-b border-gray-800/60 last:border-0'>
                            <td className='py-3 pr-4'>
                                {/* Drafts and scheduled stories aren't public
                                    yet - their page would say "not found" - so
                                    only published ones are links. */}
                                {story.status === 'published' ? (
                                    <Link to={`/stories/${story.id}`} className='font-medium text-white hover:text-red-400'>{story.title}</Link>
                                ) : (
                                    <span className='font-medium text-gray-300'>{story.title}</span>
                                )}

                                <span className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] capitalize ${STATUS_STYLES[story.status]}`}>
                                    {story.status}
                                </span>
                            </td>
                            <td className='py-3 text-right text-gray-300'>{story.views.toLocaleString()}</td>
                            <td className='py-3 text-right text-gray-300'>{story.likes.toLocaleString()}</td>
                            <td className='py-3 text-right text-gray-300'>{story.comments.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default TopStoriesTable
