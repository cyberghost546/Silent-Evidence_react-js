import { Link } from 'react-router-dom'
import { Flame, Plus, Crown } from 'lucide-react'
import { getVillains } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import SidebarBox from './SidebarBox'


// ---------------------------------------------------------------
// "VILLAIN OF THE WEEK" on the homepage.
//
// Members nominate the scariest villain from the site's stories and
// vote (/villains). This box shows this week's race: the leader with
// a crown, then the next two. Every Monday it starts again.
// The data comes from Django (sitecontent/villain_views.py).
// ---------------------------------------------------------------
function VillainOfTheWeek() {
    const { data } = useApi(() => getVillains())
    const top = data?.nominations.slice(0, 3) ?? []
    const lastWinner = data?.past_winners[0]

    return (
        <SidebarBox>
            <div className='flex items-center gap-2'>
                <span className='h-4 w-1 rounded-full bg-red-600' />
                <h2 className='font-bold text-white'>Villain of the Week</h2>
                <Flame className='h-4 w-4 text-red-500' />
            </div>

            <Link
                to='/villains/nominate'
                className='mt-3 inline-flex items-center gap-1 rounded-full border border-red-600 px-3 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-600 hover:text-white'
            >
                <Plus className='h-3.5 w-3.5' />
                Nominate a Villain
            </Link>

            {top.length === 0 ? (
                <p className='mt-4 py-4 text-center text-sm text-gray-500'>
                    No villains nominated yet this week. Be the first!
                </p>
            ) : (
                <ol className='mt-4 space-y-2'>
                    {top.map((villain, index) => (
                        <li key={villain.id}>
                            <Link to='/villains' className='flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-800/60'>
                                {/* The leader gets a crown; the others their place. */}
                                {index === 0
                                    ? <Crown className='h-4 w-4 shrink-0 text-amber-400' aria-label='Leading' />
                                    : <span className='w-4 shrink-0 text-center text-xs text-gray-500'>{index + 1}</span>}
                                <span className='min-w-0 flex-1'>
                                    <span className={`block truncate text-sm ${index === 0 ? 'font-bold text-white' : 'text-gray-200'}`}>{villain.name}</span>
                                    {villain.story && <span className='block truncate text-xs text-gray-500'>from {villain.story.title}</span>}
                                </span>
                                <span className='shrink-0 text-xs tabular-nums text-gray-400'>{villain.votes} {villain.votes === 1 ? 'vote' : 'votes'}</span>
                            </Link>
                        </li>
                    ))}
                </ol>
            )}

            {lastWinner && (
                <p className='mt-3 border-t border-slate-800 pt-3 text-xs text-gray-500'>
                    Last week: <span className='text-gray-300'>{lastWinner.name}</span>
                </p>
            )}
        </SidebarBox>
    )
}

export default VillainOfTheWeek
