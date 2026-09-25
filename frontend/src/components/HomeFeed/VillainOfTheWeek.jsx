import { Link } from 'react-router-dom'
import { Flame, Plus } from 'lucide-react'
import SidebarBox from './SidebarBox'


// ---------------------------------------------------------------
// "VILLAIN OF THE WEEK"
//
// Not built in Django yet - there's no Villain model - so for now
// it always shows the empty message, and "Nominate a Villain" goes
// to a page that doesn't exist yet ("Page not found").
//
// When it's built: fetch the villain here (like TrendingList does)
// and show it instead of the empty message.
// ---------------------------------------------------------------
function VillainOfTheWeek() {
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

            <p className='mt-4 py-4 text-center text-sm text-gray-500'>
                No villains nominated yet this week. Be the first!
            </p>
        </SidebarBox>
    )
}

export default VillainOfTheWeek
