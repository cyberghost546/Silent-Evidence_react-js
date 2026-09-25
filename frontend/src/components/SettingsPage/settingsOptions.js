import {
    Clock, BookOpen, Zap,
    Droplet, Ghost, CircleSlash, Skull, Moon, Radiation,
    Square, Sparkle, Orbit, ZapOff,
} from 'lucide-react'


// ---------------------------------------------------------------
// Everything the Settings page shows as a CHOICE, kept out of the
// components so they stay about layout and behaviour.
// (Same idea as WriteStory/storyOptions.js.)
//
// The `value`s must match the ones Django accepts - the choices on
// the Profile model in backend/accounts/models.py.
// Add a choice there -> add it here too.
// ---------------------------------------------------------------


// The links in the left sidebar. `id` is the id of the section it
// scrolls to - each section is <SettingsSection id='...'>.
export const SIDEBAR_LINKS = [
    { id: 'profile', label: 'Profile' },
    { id: 'age', label: 'Age & Content' },
    { id: 'fear', label: 'Fear Profile' },
    { id: 'reading', label: 'Reading Speed' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'blocked', label: 'Blocked Users' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'discord', label: 'Discord' },
    { id: 'account', label: 'Account' },
]


// "Age & Content Access". The same three levels as a story's
// content rating on the Write page.
export const ACCESS_LEVELS = [
    { value: 'all', label: 'All Ages Only', hint: 'Only stories rated for everyone' },
    { value: 'teen', label: 'Up to 13+', hint: 'Hides 18+ Mature stories' },
    { value: 'mature', label: 'Full Access', hint: 'Unrestricted access to all content' },
]


// "Fear Profile". `dot` is the Tailwind colour of the little dot.
export const FEAR_MOODS = [
    { value: 'creepy', label: 'Creepy', hint: 'The slow crawl of something not quite right.', dot: 'bg-lime-500' },
    { value: 'paranoid', label: 'Paranoid', hint: 'Someone is watching, and you cannot prove it.', dot: 'bg-orange-500' },
    { value: 'disturbing', label: 'Disturbing', hint: 'Images that refuse to leave once you have read them.', dot: 'bg-red-500' },
    { value: 'atmospheric', label: 'Atmospheric', hint: 'Dread built slowly out of place and silence.', dot: 'bg-slate-400' },
    { value: 'psychological', label: 'Psychological', hint: 'The horror is inside the narrator, not the house.', dot: 'bg-purple-500' },
    { value: 'supernatural', label: 'Supernatural', hint: 'Spirits, curses, and things that break the rules.', dot: 'bg-cyan-500' },
    { value: 'gore', label: 'Gore', hint: 'Visceral, bloody, and not looking away.', dot: 'bg-rose-500' },
    { value: 'jumpscare', label: 'Jumpscare', hint: 'Quiet, quiet, quiet — then not.', dot: 'bg-yellow-500' },
    { value: 'dark', label: 'Dark', hint: 'Grim themes and moral ambiguity.', dot: 'bg-gray-500' },
]

// How many moods you may pick. Django checks the same number
// (validate_fear_moods in accounts/serializers.py).
export const MAX_MOODS = 3


// "Reading Speed". wpm = words per minute.
export const READING_SPEEDS = [
    { value: 'slow', label: 'Slow', hint: '~150 wpm — savour every word', icon: Clock },
    { value: 'average', label: 'Average', hint: '~238 wpm — standard pace', icon: BookOpen },
    { value: 'fast', label: 'Fast', hint: '~350 wpm — quick reader', icon: Zap },
]


// "Comment Digest Emails" - the three radio buttons.
export const DIGEST_OPTIONS = [
    { value: 'daily', label: 'Daily', hint: 'Receive a summary of new comments every morning.' },
    { value: 'weekly', label: 'Weekly', hint: 'A roundup of activity from the past week, every Monday.' },
    { value: 'never', label: 'Never', hint: 'No digest emails. You can still see comments in the app.' },
]


// "Profile Theme". `color` is a real CSS colour (not a Tailwind
// class) because the preview uses it in a style={{ }} for the glow.
export const THEMES = [
    { value: 'blood-red', label: 'Blood Red', icon: Droplet, color: '#dc2626' },
    { value: 'ghost-blue', label: 'Ghost Blue', icon: Ghost, color: '#60a5fa' },
    { value: 'void', label: 'Void', icon: CircleSlash, color: '#a855f7' },
    { value: 'crimson', label: 'Crimson', icon: Skull, color: '#be123c' },
    { value: 'shadow', label: 'Shadow', icon: Moon, color: '#9ca3af' },
    { value: 'toxic', label: 'Toxic', icon: Radiation, color: '#84cc16' },
]

// "Avatar Border Animation". The animation classes themselves are in
// AppearanceSettings.jsx / SettingsPage.module.css.
export const BORDERS = [
    { value: 'none', label: 'None', icon: Square },
    { value: 'pulse', label: 'Pulse Glow', icon: Sparkle },
    { value: 'orbit', label: 'Orbit Ring', icon: Orbit },
    { value: 'flicker', label: 'Flicker', icon: ZapOff },
]
