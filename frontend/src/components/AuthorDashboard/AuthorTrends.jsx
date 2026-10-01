import { Link } from 'react-router-dom'
import { getAuthorTrends } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { formatLongDate } from '../../utils/format'
import Panel from '../Dashboard/Panel'
import BarChart from '../Dashboard/BarChart'


// ---------------------------------------------------------------
// "OVER TIME" on the Author Dashboard: the last 12 weeks.
//
//   Views per week          Read-through per week
//   Who finishes your stories (a table, one row per story)
//
// READ-THROUGH = of the people who started a story, how many read
// to the end. The numbers come from GET /api/author/trends/
// (stories/trend_views.py explains how they're counted).
// ---------------------------------------------------------------

// '2026-09-21' (a Monday) -> 'Sep 21'
function weekLabel(isoDate) {
    return new Date(`${isoDate}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// A colour for a read-through %, so good and bad stand out in the
// table. Always WITH the number - never colour alone.
function readThroughColor(percent) {
    if (percent >= 60) return 'text-green-400'
    if (percent >= 30) return 'text-amber-300'
    return 'text-red-400'
}

function AuthorTrends() {
    const { data, error } = useApi(() => getAuthorTrends())

    if (error) return <p className='text-sm text-red-400'>Could not load the weekly numbers.</p>
    if (!data) return null

    const views = data.weeks.map(week => ({ label: weekLabel(week.week), value: week.views }))
    const readThrough = data.weeks.map(week => ({ label: weekLabel(week.week), value: week.read_through }))

    return (
        <section id='over-time' className='space-y-4 scroll-mt-20'>
            <div className='pt-2'>
                <h2 className='text-sm font-semibold text-gray-400'>Over time · last 12 weeks</h2>
                {/* Views per day only started being recorded recently -
                    say so, so an empty start doesn't look like a flop. */}
                {data.views_tracked_since && (
                    <p className='text-xs text-gray-500'>Views are counted per week from {formatLongDate(data.views_tracked_since)}.</p>
                )}
            </div>

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <Panel title='Views per week' subtitle={`${data.total_views_12_weeks} in 12 weeks`}>
                    <BarChart data={views} color='bg-sky-500' />
                </Panel>
                <Panel title='Read-through per week' subtitle='Readers who got to the end (– = no readers that week)'>
                    <BarChart data={readThrough} color='bg-amber-500' unit='%' />
                </Panel>
            </div>

            <Panel title='Who finishes your stories' subtitle='All-time, for each published story'>
                {data.stories.length === 0 ? (
                    <p className='py-6 text-center text-sm text-gray-500'>Nobody has read your stories yet - share one!</p>
                ) : (
                    // A real <table> - it IS rows and columns. Scrolls
                    // sideways on a small phone instead of squashing.
                    <div className='overflow-x-auto'>
                        <table className='w-full text-sm'>
                            <thead>
                                <tr className='border-b border-gray-800 text-left text-xs text-gray-500'>
                                    <th className='pb-2 font-medium'>Story</th>
                                    <th className='pb-2 text-right font-medium'>Readers</th>
                                    <th className='pb-2 text-right font-medium'>Finished</th>
                                    <th className='pb-2 text-right font-medium'>Read-through</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.stories.map(story => (
                                    <tr key={story.id} className='border-b border-gray-800/60 last:border-0'>
                                        <td className='py-3 pr-4'>
                                            <Link to={`/stories/${story.id}`} className='text-gray-200 hover:text-white'>{story.title}</Link>
                                        </td>
                                        <td className='py-3 text-right tabular-nums text-gray-300'>{story.readers}</td>
                                        <td className='py-3 text-right tabular-nums text-gray-300'>{story.finished}</td>
                                        <td className={`py-3 text-right font-semibold tabular-nums ${readThroughColor(story.read_through)}`}>
                                            {story.read_through}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </section>
    )
}

export default AuthorTrends
