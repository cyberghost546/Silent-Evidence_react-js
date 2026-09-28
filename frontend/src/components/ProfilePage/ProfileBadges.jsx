import { Flame } from 'lucide-react'


// ---------------------------------------------------------------
// BADGES + READING STREAK on a profile.
//
//   <ProfileBadges badges={profile.badges} streak={profile.streak} isMe={profile.is_me} />
//
// From Django (accounts/badges.py):
//   badges - on someone else's profile: only the ones they EARNED.
//            On your own: all of them, each with progress / target.
//   streak - { current, longest } days in a row with a story read.
// ---------------------------------------------------------------
function ProfileBadges({ badges = [], streak, isMe }) {
    const earned = badges.filter(badge => badge.earned)
    const toEarn = badges.filter(badge => !badge.earned)

    // Someone else with no badges and no streak: show nothing at all.
    if (!isMe && earned.length === 0 && !streak?.current) return null

    return (
        <section className='rounded-2xl border border-slate-800 bg-slate-900/40 p-6'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <h2 className='text-lg font-bold text-white'>Badges</h2>
                {streak && (
                    <p className='flex items-center gap-1.5 text-sm text-gray-300' title={`Longest streak: ${streak.longest} days`}>
                        <Flame className={`h-4 w-4 ${streak.current ? 'text-orange-400' : 'text-gray-600'}`} />
                        {streak.current
                            ? <><span className='font-bold text-white'>{streak.current}-day</span> reading streak</>
                            : 'No reading streak right now'}
                        <span className='text-gray-500'>· best {streak.longest}</span>
                    </p>
                )}
            </div>

            {/* The earned badges: big and bright. */}
            {earned.length > 0 ? (
                <ul className='mt-4 flex flex-wrap gap-3'>
                    {earned.map(badge => (
                        <li key={badge.key} title={badge.description} className='flex items-center gap-2 rounded-full border border-amber-800/70 bg-amber-950/30 px-3 py-1.5 text-sm text-amber-100'>
                            <span aria-hidden='true'>{badge.emoji}</span> {badge.name}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className='mt-3 text-sm text-gray-500'>No badges yet.</p>
            )}

            {/* Your own profile: what's next, with a progress bar each. */}
            {isMe && toEarn.length > 0 && (
                <>
                    <p className='mt-6 text-xs font-semibold uppercase tracking-wider text-gray-500'>Still to earn</p>
                    <ul className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                        {toEarn.map(badge => (
                            <li key={badge.key} className='rounded-xl border border-slate-800 p-3'>
                                <p className='text-sm text-gray-300'>
                                    {/* Greyed-out emoji = not earned yet. */}
                                    <span aria-hidden='true' className='grayscale'>{badge.emoji}</span> <span className='font-semibold'>{badge.name}</span>
                                </p>
                                <p className='text-xs text-gray-500'>{badge.description}</p>
                                <div className='mt-2 flex items-center gap-2'>
                                    <span className='h-1.5 flex-1 rounded-full bg-slate-800'>
                                        <span className='block h-full rounded-full bg-amber-500' style={{ width: `${(badge.progress / badge.target) * 100}%` }} />
                                    </span>
                                    <span className='text-xs tabular-nums text-gray-400'>{badge.progress}/{badge.target}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    )
}

export default ProfileBadges
