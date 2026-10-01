import { mediaUrl } from '../../api/client'


// ---------------------------------------------------------------
// A round avatar: the user's photo if they uploaded one, otherwise
// the first two letters of their name on a red circle.
//
// Usage:
//   <Avatar username='christopher' image={user.avatar} />         -> small (40px)
//   <Avatar username='christopher' image={user.avatar} size='md' /> -> medium (48px)
//   <Avatar username='christopher' image={user.avatar} size='lg' /> -> big (80px)
//
// `image` can be:
//   - ''                         -> no photo, show the letters
//   - '/media/avatars/me.jpg'    -> a photo from Django
//   - 'blob:http://...'          -> a photo just picked on this computer
//                                   (the Settings page preview)
// ---------------------------------------------------------------

// The Tailwind classes for each size, in one place.
const SIZES = {
    // header = the same height as the icon pill next to it in the
    // header (40px on phones, 44px from "sm" up).
    header: 'h-10 w-10 text-sm sm:h-11 sm:w-11',
    sm: 'h-10 w-10 text-sm',
    md: 'h-12 w-12 text-lg',
    lg: 'h-20 w-20 text-3xl',
}

function Avatar({ username, image = '', size = 'sm', className = '' }) {
    // 'christopher' -> 'CH'
    const initials = username.slice(0, 2).toUpperCase()

    // A blob: address already works as it is. Only Django paths need
    // the backend's address in front (mediaUrl in api/client.js).
    const src = image.startsWith('blob:') ? image : mediaUrl(image)

    if (image) {
        // object-cover = fill the circle without stretching the photo.
        return (
            <img
                src={src}
                alt={`${username}'s avatar`}
                className={`${SIZES[size]} shrink-0 rounded-full object-cover ring-2 ring-red-900 ${className}`}
            />
        )
    }

    return (
        <span className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full bg-red-600 font-bold text-white ring-2 ring-red-900 ${className}`}>
            {initials}
        </span>
    )
}

export default Avatar
