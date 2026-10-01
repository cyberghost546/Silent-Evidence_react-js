import { Link } from 'react-router-dom'
import { getChains } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import SidebarBox from './SidebarBox'


// ---------------------------------------------------------------
// The homepage's "Story chain" box: the most active OPEN chain,
// with a button to join in. No open chain -> an invitation to start
// one. (Django sorts open chains first, most recently active first.)
// ---------------------------------------------------------------
function ChainBox() {
    const { data: chains } = useApi(() => getChains())
    if (!chains) return null
    const chain = chains.find(item => item.is_open)

    return (
        <SidebarBox title='Story chain' badge='Join in'>
            {chain ? (
                <>
                    <p className='font-semibold text-white'>{chain.title}</p>
                    <p className='mt-1 text-xs text-gray-500'>{chain.part_count} of {chain.max_parts} parts written so far</p>
                    <Link to={`/chains/${chain.id}`} className='mt-3 block rounded-lg bg-red-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-red-700'>
                        Read & write the next part
                    </Link>
                </>
            ) : (
                <>
                    <p className='text-sm text-gray-400'>Write a story together: start it, and others continue.</p>
                    <Link to='/chains' className='mt-3 block text-sm font-semibold text-red-400 hover:text-red-300'>Start a story chain →</Link>
                </>
            )}
        </SidebarBox>
    )
}

export default ChainBox
