import styles from './Dashboard.module.css'


// ---------------------------------------------------------------
// A simple bar chart made of plain <div>s - no chart library.
//
// Usage:
//   <BarChart
//       data={[ { label: 'Mon', value: 3 }, { label: 'Tue', value: 7 } ]}
//       color='bg-blue-500'
//       legend='New users'
//   />
//
// The trick: every bar's height is a PERCENTAGE of the tallest
// value. The biggest bar is always (nearly) full height, the others
// are sized relative to it. So it works for 5 sign-ups or 5,000.
//
// LOTS OF BARS (more than 14, e.g. 30 days): there's no room for a
// number on every bar or a label under every bar. So the chart goes
// "compact" by itself: thinner gaps, no numbers (hover a bar to see
// it), and only every 5th label.
// ---------------------------------------------------------------
function BarChart({ data, color = 'bg-green-500', legend }) {
    // The biggest value in the list.
    // ...data.map(...) "spreads" the array into separate arguments:
    // Math.max(3, 7, 0) -> 7.
    // The extra 1 stops us dividing by zero when every value is 0.
    const max = Math.max(...data.map(item => item.value), 1)

    const compact = data.length > 14
    const gap = compact ? 'gap-1' : 'gap-3'

    return (
        <div>
            {/* ---------- THE BARS ---------- */}
            {/* items-end lines every column up along the bottom. */}
            <div className={`${styles.chartGrid} flex h-48 items-end ${gap} px-2`}>
                {data.map(item => {
                    // 85 instead of 100 leaves room for the number
                    // sitting on top of the tallest bar.
                    const heightPercent = (item.value / max) * 85

                    return (
                        // title = the little tooltip when you hover the bar.
                        <div key={item.label} title={`${item.label}: ${item.value}`} className='flex h-full flex-1 flex-col items-center justify-end'>
                            {!compact && <span className='mb-1 text-xs text-gray-400'>{item.value}</span>}

                            {/* The height changes per bar, so it can't be a
                                Tailwind class - it goes in style={{ }}.
                                (Tailwind classes have to be written out in
                                full in the code; they can't be built from
                                numbers while the app runs.) */}
                            <div
                                className={`${styles.bar} w-full max-w-12 rounded-t ${color}`}
                                style={{ height: `${heightPercent}%` }}
                            />
                        </div>
                    )
                })}
            </div>

            {/* ---------- THE LABELS UNDER THE BARS ---------- */}
            {/* Same gap and flex-1 as the bars above, so each label
                lines up under its own bar. */}
            <div className={`mt-2 flex ${gap} px-2`}>
                {/* In compact mode only every 5th label is written;
                    the others are empty but still take up their space,
                    so the written ones stay under the right bar.
                    whitespace-nowrap stops "Sep 24" breaking in two. */}
                {data.map((item, index) => (
                    <span key={item.label} className='flex-1 whitespace-nowrap text-center text-xs text-gray-500'>
                        {!compact || index % 5 === 0 ? item.label : ''}
                    </span>
                ))}
            </div>

            {/* ---------- THE LEGEND ---------- */}
            {legend && (
                <div className='mt-4 flex items-center justify-center gap-2 text-xs text-gray-400'>
                    <span className={`h-3 w-3 rounded-sm ${color}`} />
                    {legend}
                </div>
            )}
        </div>
    )
}

export default BarChart
