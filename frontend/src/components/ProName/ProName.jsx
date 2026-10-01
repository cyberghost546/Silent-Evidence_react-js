import { nameColorClass } from './nameColors'


// ---------------------------------------------------------------
// A member's name, with their Pro look: the colour they picked and
// a small gold PRO badge.
//
//   <ProName name='raven' look={comment.author_look} />
//   <ProName name='raven' look={story.author_look} className='text-red-400' />
//   <ProName name='raven' look={profile} big />   -> a bigger PRO badge (page titles)
//
// look = { is_pro, name_color } from Django (pro_look() in
// accounts/premium.py). No look, or not Pro -> just the name, in
// whatever colour `className` gives (the page's normal style).
//
// It's only the TEXT - wrap it in a <Link> yourself if the name
// should go to their profile.
// ---------------------------------------------------------------
function ProName({ name, look, className = '', big = false }) {
    const isPro = Boolean(look?.is_pro)
    // A picked colour wins over the page's normal colour.
    const colorClass = (isPro && nameColorClass(look.name_color)) || className

    return (
        <span className='inline-flex items-center gap-1.5'>
            <span className={colorClass}>{name}</span>
            {isPro && (
                <span
                    className={`rounded bg-yellow-400 font-extrabold leading-tight text-black ${big ? 'px-1.5 py-0.5 text-xs' : 'px-1 py-px text-[9px]'}`}
                    title='Silent Evidence Pro member'
                >
                    PRO
                </span>
            )}
        </span>
    )
}

export default ProName
