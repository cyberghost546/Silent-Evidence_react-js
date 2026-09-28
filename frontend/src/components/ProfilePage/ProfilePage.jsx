import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarDays, PenLine, Settings, Lock, MessageCircle, Link as LinkIcon } from 'lucide-react'
import { getProfile, getStories, followAuthor, mediaUrl } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { useRequireLogin } from '../../hooks/useRequireLogin'
import SectionHeading from '../StorySections/SectionHeading'
import StoryGridCard from '../StorySections/StoryGridCard'
import EmptyState from '../StorySections/EmptyState'
import PublicationMap from './PublicationMap'
import { usePageTitle } from '../../hooks/usePageTitle'
import ProfileBadges from './ProfileBadges'


// ---------------------------------------------------------------
// One number box: big number on top, small label under it.
//
// Usage:
//   <ProfileStat value={12} label='Stories' />
//   <ProfileStat value={3} label='Likes' highlight />   <- red number
// ---------------------------------------------------------------
function ProfileStat({ value, label, highlight = false }) {
    return (
        <div className='rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-center'>
            {/* toLocaleString() adds commas: 12345 -> "12,345". */}
            <p className={`text-2xl font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>
                {value.toLocaleString()}
            </p>
            <p className='mt-1 text-xs text-gray-500'>{label}</p>
        </div>
    )
}


// ---------------------------------------------------------------
// THE PROFILE PAGE
//
//   /profile              -> YOUR profile (logged in only, App.jsx)
//   /profile/christopher  -> anyone's profile (public)
//
// Two requests, both sent at the same time:
//   getProfile()  -> name, join date, the 5 numbers, follow info
//   getStories()  -> their published stories (?author=...)
// ---------------------------------------------------------------
function ProfilePage() {
    const { user } = useAuth()
    const requireLogin = useRequireLogin()

    // /profile/:username -> the name in the URL. On plain /profile
    // there's no :username, so we use the logged-in user's name.
    const params = useParams()
    const username = params.username || user.username
    usePageTitle(username)

    // null = still loading. 'not-found' = no such user.
    const [profile, setProfile] = useState(null)
    const [stories, setStories] = useState([])

    // Changing this number makes the page load again (see useEffect).
    const [reloadKey, setReloadKey] = useState(0)

    // Runs again when the username changes - e.g. clicking from one
    // profile to another. React keeps the same component, so without
    // [username] here it would keep showing the first person.
    useEffect(() => {
        // Same "ignore" trick as LatestStories: if you click to
        // another profile before this one finished loading, the old
        // answer is thrown away instead of showing the wrong person.
        let ignore = false

        // Promise.all = start BOTH requests now, wait for both.
        // Faster than waiting for one, then starting the other.
        Promise.all([getProfile(username), getStories({ author: username })])
            .then(([profileData, storyList]) => {
                if (ignore) return
                setProfile(profileData)
                setStories(storyList)
            })
            .catch(error => {
                if (ignore) return
                setProfile(error.status === 404 ? 'not-found' : 'error')
            })

        return () => { ignore = true }

        // reloadKey is in the list so we can ask for a reload: after
        // you follow a PRIVATE profile it unlocks, and we need the
        // full details that Django hid before.
    }, [username, reloadKey])

    async function handleFollow() {
        if (!requireLogin()) return

        try {
            const result = await followAuthor(profile.username)

            // Followed a locked (private) profile -> load it again, now
            // with everything visible. +1 changes reloadKey, and that
            // re-runs the useEffect above.
            if (profile.is_locked && result.following) {
                setReloadKey(reloadKey + 1)
                return
            }
            // Copy the profile, change just these two values.
            setProfile({ ...profile, is_following: result.following, follower_count: result.follower_count })
        } catch (error) {
            console.error('Could not follow:', error)
        }
    }


    // ---------- LOADING / NOT FOUND / ERROR ----------
    if (profile === null) {
        return <p className='py-24 text-center text-gray-500'>Loading profile...</p>
    }

    if (profile === 'not-found' || profile === 'error') {
        return (
            <div className='mx-auto max-w-lg px-4 py-24'>
                <EmptyState
                    title={profile === 'not-found' ? `There's nobody called "${username}" here` : 'Could not load this profile'}
                    message={profile === 'not-found' ? 'Check the spelling, or go back to the homepage.' : 'Is the Django server running?'}
                />
            </div>
        )
    }


    // ---------- THE PAGE ----------
    const initials = profile.username.slice(0, 2).toUpperCase()

    // "2026-09-25T22:13:34Z" -> "September 2026"
    const memberSince = new Date(profile.date_joined).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

    return (
        <div className='bg-slate-900'>

            {/* ========== TOP: dark band with a red tint ========== */}
            {/* bg-linear-to-b = a gradient from top to bottom. */}
            <div className='bg-linear-to-b from-red-950/50 via-slate-950 to-slate-950 px-4 pb-12 pt-12'>
                <div className='mx-auto max-w-5xl'>

                    {/* ----- Avatar + name + buttons ----- */}
                    {/* flex-wrap: on a phone the buttons drop under the name. */}
                    <div className='flex flex-wrap items-center gap-6'>
                        {/* shadow-[...] = a custom red glow around the circle.
                            Their photo if they uploaded one (Settings page),
                            otherwise their initials. */}
                        {profile.avatar ? (
                            <img
                                src={mediaUrl(profile.avatar)}
                                alt={`${profile.username}'s avatar`}
                                className='h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-red-900 shadow-[0_0_40px_rgba(220,38,38,0.45)]'
                            />
                        ) : (
                            <span className='flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-red-600 text-3xl text-white ring-4 ring-red-900 shadow-[0_0_40px_rgba(220,38,38,0.45)]'>
                                {initials}
                            </span>
                        )}

                        <div className='min-w-0 flex-1'>
                            <h1 className='truncate text-3xl font-bold text-white'>{profile.username}</h1>

                            <div className='mt-2 flex flex-wrap items-center gap-2'>
                                <p className='inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-gray-400'>
                                    <CalendarDays className='h-3.5 w-3.5' />
                                    Member since {memberSince}
                                </p>

                                {/* A small "Private" chip if they switched
                                    on Private Profile in Settings. */}
                                {profile.is_private && (
                                    <p className='inline-flex items-center gap-1.5 rounded-full border border-amber-800 bg-amber-950/40 px-3 py-1 text-xs text-amber-300'>
                                        <Lock className='h-3.5 w-3.5' />
                                        Private
                                    </p>
                                )}
                            </div>

                            {/* Bio and website from the Settings page.
                                Only drawn when they filled them in. */}
                            {profile.bio && <p className='mt-3 max-w-xl text-sm text-gray-300'>{profile.bio}</p>}
                            {profile.website && (
                                // target='_blank' opens a new tab.
                                // rel='noopener noreferrer' stops that other
                                // site from controlling our tab - always add
                                // it together with target='_blank'.
                                <a
                                    href={profile.website}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='mt-2 inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300'
                                >
                                    <LinkIcon className='h-3.5 w-3.5' />
                                    {/* "https://mysite.com/" -> "mysite.com" */}
                                    {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                </a>
                            )}
                        </div>

                        {/* YOUR profile: shortcuts. SOMEONE ELSE'S: Follow. */}
                        {profile.is_me ? (
                            <div className='flex gap-3'>
                                <Link to='/write' className='flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700'>
                                    <PenLine className='h-4 w-4' />
                                    Write a Story
                                </Link>
                                <Link to='/settings' className='flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-slate-500 hover:text-white'>
                                    <Settings className='h-4 w-4' />
                                    Settings
                                </Link>
                            </div>
                        ) : (
                            <div className='flex gap-3'>
                            {/* Only logged-in visitors can send messages. */}
                            {user && (
                                <Link
                                    to={`/messages/${profile.username}`}
                                    className='flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-slate-500 hover:text-white'
                                >
                                    <MessageCircle className='h-4 w-4' />
                                    Message
                                </Link>
                            )}
                            <button
                                type='button'
                                onClick={handleFollow}
                                className={`rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${
                                    profile.is_following
                                        ? 'border border-slate-600 text-gray-300 hover:border-red-600 hover:text-white'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                            >
                                {profile.is_following ? 'Following' : 'Follow'}
                            </button>
                            </div>
                        )}
                    </div>

                    {/* ----- The 5 numbers ----- */}
                    {/* 2 per row on phones, 3 on tablets, all 5 on big screens.
                        Not shown on a locked (private) profile - Django
                        doesn't even send them. */}
                    {!profile.is_locked && (
                    <div className='mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'>
                        <ProfileStat value={profile.story_count} label='Stories' />
                        <ProfileStat value={profile.follower_count} label='Followers' />
                        <ProfileStat value={profile.following_count} label='Following' />
                        <ProfileStat value={profile.total_views} label='Views' />
                        <ProfileStat value={profile.total_likes} label='Likes' highlight />
                    </div>
                    )}
                </div>
            </div>

            {/* ========== BOTTOM: map + stories ========== */}
            {/* Same set-up as the top half: padding on the OUTSIDE,
                max-w-5xl on the inside - so both halves line up. */}
            <div className='px-4 py-12'>
            <div className='mx-auto max-w-5xl space-y-12'>
                {/* A PRIVATE profile you don't follow: a lock message
                    instead of the map and the stories. */}
                {profile.is_locked ? (
                    <div className='rounded-xl border border-slate-800 bg-slate-950 px-6 py-16 text-center'>
                        <Lock className='mx-auto h-8 w-8 text-gray-500' />
                        <p className='mt-4 font-semibold text-gray-200'>This profile is private</p>
                        <p className='mt-2 text-sm text-gray-500'>Follow {profile.username} to see their stories.</p>
                    </div>
                ) : (
                <>
                {/* Badges + reading streak (ProfileBadges.jsx). */}
                <ProfileBadges badges={profile.badges} streak={profile.streak} isMe={profile.is_me} />

                <PublicationMap stories={stories} />

                <section>
                    <SectionHeading title={`Stories by ${profile.username}`} accent='red' />

                    {stories.length === 0 ? (
                        profile.is_me ? (
                            // Your own empty profile: nudge towards writing.
                            <div className='rounded-xl border border-gray-800 bg-gray-950 px-6 py-12 text-center'>
                                <p className='font-semibold text-gray-400'>You haven't published a story yet</p>
                                <Link to='/write' className='mt-4 inline-block text-sm font-semibold text-red-400 hover:text-red-300'>
                                    Write your first story →
                                </Link>
                            </div>
                        ) : (
                            <EmptyState title='No published stories yet.' />
                        )
                    ) : (
                        // The same cards as the homepage and category pages.
                        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                            {stories.map(story => (
                                <StoryGridCard key={story.id} story={story} />
                            ))}
                        </div>
                    )}
                </section>
                </>
                )}
            </div>
            </div>
        </div>
    )
}

export default ProfilePage
