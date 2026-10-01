import { useAuth } from './useAuth'


// ---------------------------------------------------------------
// useMatureBlur(story) -> a class for the story's cover picture.
//
//   const blur = useMatureBlur(story)
//   <img className={`h-full w-full object-cover ${blur}`} />
//
// An 18+ story's cover is blurred for anyone who hasn't confirmed
// they're 18 or older (user.is_adult comes from Django). Confirmed
// adults see it normally. Goes with <MatureBadge /> on the cards.
// ---------------------------------------------------------------
export function useMatureBlur(story) {
    const { user } = useAuth()
    const locked = story.content_rating === 'mature' && !user?.is_adult
    // scale-110: blurring makes soft edges - zooming in a little hides them.
    return locked ? 'blur-md scale-110' : ''
}
