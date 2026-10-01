import { Clock, Sparkles, Palette, MessageSquareText, ChartBar, ImagePlus } from 'lucide-react'


// ---------------------------------------------------------------
// WHAT PRO GIVES YOU - the lists on the Pro page (/premium).
//
// Just data: adding a perk = adding one line here. (Remember to build
// the perk itself too!)
// ---------------------------------------------------------------
export const READER_PERKS = [
    {
        icon: Clock,
        title: 'Read new stories 48 hours early',
        text: 'Writers can open a new story to Pro readers first. You read it before everyone else.',
    },
    {
        icon: Sparkles,
        title: 'A PRO badge',
        text: 'Next to your name on your profile, your stories and your comments.',
    },
    {
        icon: Palette,
        title: 'Your name in colour, and a Gold Crown avatar border',
        text: 'Pick them in Settings -> Profile Appearance.',
    },
]

export const WRITER_PERKS = [
    {
        icon: MessageSquareText,
        title: 'More feedback from Claude',
        text: 'Up to 5 reviews a day, instead of 3 a month.',
    },
    {
        icon: ChartBar,
        title: 'Where readers stop',
        text: 'See how far readers get in each story, on your Author Dashboard.',
    },
    {
        icon: ImagePlus,
        title: 'Cover maker',
        text: 'Make a spooky cover for your story in one click, on the Write page.',
    },
]

// Free for everyone, always - shown on the page so nobody worries.
export const ALWAYS_FREE = [
    'Reading every story (except the first 48 hours of early-access ones)',
    'Writing, comments, reading lists, Listen (read aloud), Easy read',
    'Reporting, blocking and every safety feature',
]
