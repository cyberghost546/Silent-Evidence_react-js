import { Users, ShieldAlert, Skull } from 'lucide-react'


// ---------------------------------------------------------------
// Everything the Write a Story page shows as a CHOICE, kept out of
// the component so the page file stays about layout and behaviour.
//
// The `value`s must match the ones Django accepts
// (CONTENT_RATINGS and MOODS in backend/stories/models.py).
// Add a choice there -> add it here too.
// ---------------------------------------------------------------

// value = the code saved in the database, label = what people read.
export const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español — Spanish' },
    { value: 'fr', label: 'Français — French' },
    { value: 'de', label: 'Deutsch — German' },
    { value: 'pt', label: 'Português — Portuguese' },
    { value: 'it', label: 'Italiano — Italian' },
]

export const MOODS = [
    { value: 'creepy', label: 'Creepy' },
    { value: 'sad', label: 'Sad' },
    { value: 'mysterious', label: 'Mysterious' },
    { value: 'terrifying', label: 'Terrifying' },
    { value: 'unsettling', label: 'Unsettling' },
    { value: 'shocking', label: 'Shocking' },
]

// The three big buttons under "Content Rating". The icon is stored
// as a component, same idea as the menu items in UserMenu.
export const CONTENT_RATINGS = [
    { value: 'all', label: 'All Ages', hint: 'Suitable for everyone', icon: Users },
    { value: 'teen', label: '13+ Teen', hint: 'Mild violence / themes', icon: ShieldAlert },
    { value: 'mature', label: '18+ Mature', hint: 'Graphic / disturbing content', icon: Skull },
]

// The little tick-on / tick-off chips. Saved as "Violence,Gore".
export const CONTENT_WARNINGS = [
    'Violence',
    'Gore',
    'Dark Themes',
    'Mature Language',
    'Spoilers',
    'Character Death',
    'Abuse',
    'Self-harm',
    'Psychological Horror',
    'Real Events',
]


// ---------------------------------------------------------------
// TEMPLATES for "Use a Template". Picking one fills the story box
// with this text. The ## and ** marks are the same ones the toolbar
// adds - see utils/storyFormat.js.
// ---------------------------------------------------------------
export const TEMPLATES = [
    {
        name: 'Personal Encounter',
        description: 'Something strange that happened to you.',
        body: `## Where it happened

Describe the place. What did it look, sound and smell like?

## What I saw

Tell it step by step. Stick to what you remember - **small details** make it real.

## What happened after

How did it end? Did anything else happen later?`,
    },
    {
        name: 'Cold Case',
        description: 'An unsolved case, laid out clearly.',
        body: `## The case

Who, when and where - the basic facts.

## The timeline

1. First event
2. Second event
3. Last known sighting

## The evidence

- Evidence one
- Evidence two

## Theories

> What do the investigators think?

What do **you** think happened?`,
    },
    {
        name: 'Urban Legend',
        description: 'A local story people tell.',
        body: `## The legend

How do people usually tell this story?

## Where it comes from

Is any of it based on something real?

---

## My take

Do you believe it? Why or why not?`,
    },
]
