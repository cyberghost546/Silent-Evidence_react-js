import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getSettings, updateSettings } from '../../api/client'
import { SIDEBAR_LINKS } from './settingsOptions'
import ProfileSettings from './ProfileSettings'
import ReadingSettings from './ReadingSettings'
import NotificationSettings from './NotificationSettings'
import BlockedUsers from './BlockedUsers'
import AppearanceSettings from './AppearanceSettings'
import DiscordSettings from './DiscordSettings'
import AccountSettings from './AccountSettings'


// ---------------------------------------------------------------
// THE SETTINGS PAGE (/settings) - logged-in users only (App.jsx).
//
// How it works:
//   1. When the page opens we ask Django for ALL your settings once
//      (getSettings) and keep them in the `settings` state.
//   2. Each section is its own component in this folder. They all
//      get the same two props:
//        settings - the current values, to show
//        onSave   - a function to call with ONLY what changed:
//                   onSave({ bio: 'Hi' })
//   3. onSave (saveSettings below) sends that to Django, puts the
//      answer back into `settings`, and shows a "Saved" message.
//
// So the sections never talk to Django about settings themselves -
// this page does it for all of them, in one place.
//
// The sidebar on the left is a list of links that scroll down to
// each section.
// ---------------------------------------------------------------
function SettingsPage() {
    const { refreshUser } = useAuth()

    // null = still loading.
    const [settings, setSettings] = useState(null)
    const [loadError, setLoadError] = useState('')

    // The little message at the bottom: "Profile saved." etc.
    // null = no message. Otherwise { text: '...', isError: true/false }.
    const [message, setMessage] = useState(null)

    // Load everything once, when the page opens ([] = only once).
    useEffect(() => {
        getSettings()
            .then(data => setSettings(data))
            .catch(() => setLoadError('Could not load your settings. Is the Django server running?'))
    }, [])

    // Hide the message again 3 seconds after it appears.
    useEffect(() => {
        if (!message) return

        const timer = setTimeout(() => setMessage(null), 3000)

        // Cleanup: if a NEW message comes before the 3 seconds are
        // over, cancel the old timer so it doesn't hide the new one.
        return () => clearTimeout(timer)
    }, [message])


    // Show a message: showMessage('Saved.') or
    // showMessage('Something broke.', true) for a red one.
    // Sections that save on their own (Blocked Users, Account) get
    // this as their onMessage prop.
    function showMessage(text, isError = false) {
        setMessage({ text, isError })
    }

    // Every section calls this to save.
    //   changes     - only the fields that changed: { bio: 'Hi' }
    //   doneMessage - what to show when it worked
    //
    // It answers with:
    //   null         -> saved, all good
    //   an object    -> Django's error messages, e.g.
    //                   { username: ['That username is already taken.'] }
    //                   so the section can show them under its inputs.
    async function saveSettings(changes, doneMessage = 'Settings saved.') {
        try {
            const updated = await updateSettings(changes)
            setSettings(updated)
            showMessage(doneMessage)

            // The Header shows your name and avatar. If either changed,
            // ask for the logged-in user again so the Header updates too.
            if ('username' in changes || 'avatar' in changes) {
                refreshUser()
            }
            return null
        } catch (err) {
            showMessage('Could not save. Check the section for details.', true)
            // err.data = Django's answer (authRequest in api/client.js).
            return err.data || { detail: 'Could not save.' }
        }
    }

    // Clicking a sidebar link. scrollIntoView = "scroll the page
    // until this element is on screen"; behavior 'smooth' animates it
    // instead of jumping.
    function scrollToSection(id) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }


    return (
        // Dark navy background, same as the Write page (see the
        // comment in WriteStory.jsx for why this outer div is needed).
        <div className='min-h-screen bg-[#020617]'>
        <div className='mx-auto max-w-6xl px-4 py-10'>

            {/* ---------- PAGE TITLE ---------- */}
            <h1 className='text-3xl font-bold text-white'>Settings</h1>
            <p className='mt-1 text-sm text-gray-400'>Manage your profile, preferences, and account.</p>

            {loadError && (
                <p className='mt-8 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300'>{loadError}</p>
            )}

            {!settings && !loadError && (
                <p className='mt-8 text-gray-400'>Loading your settings...</p>
            )}

            {settings && (
                // Two columns from the "md" size up: the sidebar (a
                // fixed 12rem) and the sections (all the rest, 1fr).
                // On phones it's one column and the sidebar is hidden.
                <div className='mt-10 grid gap-10 md:grid-cols-[12rem_1fr]'>

                    {/* ---------- SIDEBAR ---------- */}
                    {/* self-start + sticky top-6 = the sidebar stays on
                        screen while you scroll down the sections.
                        (Without self-start it would stretch to the
                        full height of the grid and never "stick".) */}
                    <nav className='hidden self-start md:sticky md:top-6 md:block' aria-label='Settings sections'>
                        <ul className='space-y-1'>
                            {SIDEBAR_LINKS.map(link => (
                                <li key={link.id}>
                                    <button
                                        type='button'
                                        onClick={() => scrollToSection(link.id)}
                                        className='w-full rounded-lg px-3 py-2 text-left text-sm text-gray-400 transition-colors hover:bg-slate-900 hover:text-white'
                                    >
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* ---------- ALL THE SECTIONS ---------- */}
                    {/* min-w-0 stops long content from making the grid
                        column wider than the screen. */}
                    <div className='min-w-0 max-w-3xl space-y-12'>
                        <ProfileSettings settings={settings} onSave={saveSettings} />

                        {/* One component, three sections: Age & Content,
                            Fear Profile and Reading Speed. */}
                        <ReadingSettings settings={settings} onSave={saveSettings} />

                        <NotificationSettings settings={settings} onSave={saveSettings} />

                        {/* Blocked users are their own list in Django,
                            not a setting - so this one loads and saves
                            by itself. It only needs the message. */}
                        <BlockedUsers onMessage={showMessage} />

                        <AppearanceSettings settings={settings} onSave={saveSettings} />
                        <DiscordSettings />
                        <AccountSettings settings={settings} onSave={saveSettings} onMessage={showMessage} />
                    </div>
                </div>
            )}

            {/* ---------- THE "SAVED" MESSAGE ---------- */}
            {/* fixed = stuck to the window, not the page, so it's
                visible wherever you've scrolled to.
                left-1/2 + -translate-x-1/2 = centred at the bottom
                (the bottom-right corner has the "back to top" button).
                role='status' makes screen readers read it out. */}
            {message && (
                // Green for "saved", red for errors - two complete
                // class lists, picked with ? :
                <div
                    role='status'
                    className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-3 text-sm shadow-xl ${
                        message.isError
                            ? 'border-red-800 bg-red-950 text-red-300'
                            : 'border-green-800 bg-green-950 text-green-300'
                    }`}
                >
                    {message.text}
                </div>
            )}
        </div>
        </div>
    )
}

export default SettingsPage
