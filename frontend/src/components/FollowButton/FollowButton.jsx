import { useState } from 'react'
import { UserPlus, UserCheck } from 'lucide-react'
import { followAuthor } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { useRequireLogin } from '../../hooks/useRequireLogin'


// ---------------------------------------------------------------
// THE FOLLOW BUTTON - one button, used wherever you can follow a
// writer (the story page, the authors row on the home page...).
//
//   [ + Follow ]   ->  tap  ->   [ ✓ Following ]   ->  tap  ->  back
//
// Usage:
//   <FollowButton username='raven' following={false} />
//
//   Smaller:
//   <FollowButton username='raven' following={false} size='small' />
//
//   Smallest, text only - for very tight spots (the phone's row of
//   round avatars, where each column is only 80px wide):
//   <FollowButton username='raven' following={false} size='compact' />
//
//   Want to know when it changes (e.g. to update a follower count)?
//   <FollowButton username='raven' following={false}
//       onChange={result => ...} />      // { following, follower_count }
//
// It looks after itself:
//   - logged out?      -> sends you to Log In (useRequireLogin)
//   - your own name?   -> draws nothing (you can't follow yourself)
//   - tapped?          -> asks Django (POST .../follow/), which
//                         follows or unfollows, and notifies the writer
// ---------------------------------------------------------------

// The looks: normal, small, and compact (no icon).
const SIZES = {
    normal: 'gap-2 px-5 py-2 text-sm',
    small: 'gap-1 px-3 py-1 text-xs',
    compact: 'px-2.5 py-0.5 text-[11px]',
}


function FollowButton({ username, following = false, size = 'normal', onChange }) {
    const { user } = useAuth()
    const requireLogin = useRequireLogin()

    // The button keeps its own "am I following?" - it starts from the
    // `following` prop, and changes when Django answers.
    const [isFollowing, setIsFollowing] = useState(following)
    // true while waiting for Django, so a double tap doesn't follow
    // AND unfollow straight away.
    const [busy, setBusy] = useState(false)

    // Your own name: no button at all.
    if (user && user.username === username) return null

    async function handleClick(event) {
        // The button may sit inside a link (a card). preventDefault
        // stops that link from opening when you tap Follow.
        event.preventDefault()
        event.stopPropagation()

        // Logged out? This sends them to Log In and stops here.
        if (!requireLogin()) return

        setBusy(true)
        try {
            const result = await followAuthor(username)
            setIsFollowing(result.following)
            // ?.() = only call onChange if the parent gave us one.
            onChange?.(result)
        } catch (error) {
            console.error('Could not follow:', error)
        } finally {
            setBusy(false)
        }
    }

    const Icon = isFollowing ? UserCheck : UserPlus
    const iconSize = size === 'small' ? 'h-3.5 w-3.5' : 'h-4 w-4'

    return (
        <button
            type='button'
            onClick={handleClick}
            disabled={busy}
            // aria-pressed = "this is an on/off button" - screen readers
            // say "Follow, pressed" when you're following.
            aria-pressed={isFollowing}
            aria-label={isFollowing ? `Unfollow ${username}` : `Follow ${username}`}
            // Following = a quiet outlined button (you've done it).
            // Not following = solid red (the thing to do).
            className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold transition-colors disabled:opacity-60 ${SIZES[size]} ${
                isFollowing
                    ? 'border border-slate-600 text-gray-200 hover:border-red-600 hover:text-white'
                    : 'bg-red-600 text-white hover:bg-red-700'
            }`}
        >
            {/* compact = text only, to save space. */}
            {size !== 'compact' && <Icon className={iconSize} />}
            {isFollowing ? 'Following' : 'Follow'}
        </button>
    )
}

export default FollowButton
