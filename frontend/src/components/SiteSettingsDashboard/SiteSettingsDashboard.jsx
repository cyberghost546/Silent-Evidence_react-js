import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { getSiteSettings, updateSiteSettings } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { SettingsSection, SettingRow, Toggle } from '../SettingsPage/SettingsParts'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> SITE SETTINGS (/dashboard/site-settings).
//
// Switches for the whole site:
//   - Maintenance mode: members + visitors see a "back soon" screen,
//     admins can still use everything (so they can switch it off!).
//     Django blocks the API too (dashboard/middleware.py), so it's
//     not just a screen you could get around.
//   - Sign-ups open or closed.
//   - The contact email shown on the Contact page.
//
// The toggles save straight away; the text boxes have a Save button.
// Reuses the pieces from the member Settings page (SettingsParts).
// ---------------------------------------------------------------
function SiteSettingsDashboard() {
    const [site, setSite] = useState(null)
    // The two text boxes, kept apart from `site` so typing doesn't
    // save anything until you press Save.
    const [message, setMessage] = useState('')
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    useEffect(() => {
        getSiteSettings()
            .then(data => {
                setSite(data)
                setMessage(data.maintenance_message)
                setEmail(data.contact_email)
            })
            .catch(() => setError('Could not load the settings.'))
    }, [])

    // Send only what changed; Django answers with the whole row.
    async function save(changes, doneText) {
        setError('')
        setNotice('')
        try {
            setSite(await updateSiteSettings(changes))
            setNotice(doneText)
        } catch (err) {
            // e.g. { contact_email: ['Enter a valid email address.'] }
            setError(err.data ? Object.values(err.data).flat().join(' ') : 'Could not save.')
        }
    }

    if (!site) return <p className='text-gray-400'>{error || 'Loading settings...'}</p>

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Settings className='h-7 w-7 text-red-500' />
                Site Settings
            </h1>
            <p className='mt-1 text-gray-400'>Switches for the whole site. Last changed {new Date(site.updated_at).toLocaleString()}.</p>

            <PageMessages error={error} notice={notice} />

            {/* A loud warning while maintenance is on - easy to forget! */}
            {site.maintenance_mode && (
                <p className='mt-4 rounded-lg border border-amber-700 bg-amber-950/40 px-4 py-3 text-sm text-amber-200'>
                    ⚠ Maintenance mode is ON - only admins can use the site right now.
                </p>
            )}

            <div className='mt-8 space-y-10'>
                <SettingsSection title='Maintenance' description='Take the site offline for everyone except admins.'>
                    <div className='space-y-4'>
                        <SettingRow title='Maintenance mode' text='Members and visitors see a "back soon" screen. Admins can still log in and use everything.'>
                            <Toggle
                                on={site.maintenance_mode}
                                label='Maintenance mode'
                                onChange={on => save({ maintenance_mode: on }, on ? 'Maintenance mode is on.' : 'The site is open again.')}
                            />
                        </SettingRow>
                        <div>
                            <label htmlFor='maintenance-message' className={LABEL_STYLE}>Message on the maintenance screen</label>
                            <textarea id='maintenance-message' rows={2} maxLength={300} value={message} onChange={event => setMessage(event.target.value)} className={INPUT_STYLE} />
                            <button
                                type='button'
                                onClick={() => save({ maintenance_message: message.trim() }, 'Message saved.')}
                                disabled={!message.trim() || message === site.maintenance_message}
                                className={`${BUTTON_STYLE} mt-3`}
                            >
                                Save message
                            </button>
                        </div>
                    </div>
                </SettingsSection>

                <SettingsSection title='Accounts' description='Who can join.'>
                    <SettingRow title='Allow new sign-ups' text='When off, the Sign Up page says sign-ups are closed. Existing members can still log in.'>
                        <Toggle
                            on={site.signups_open}
                            label='Allow new sign-ups'
                            onChange={on => save({ signups_open: on }, on ? 'Sign-ups are open.' : 'Sign-ups are closed.')}
                        />
                    </SettingRow>
                </SettingsSection>

                <SettingsSection title='Contact' description='Shown on the Contact page. Leave empty to use the default address.'>
                    <label htmlFor='contact-email' className={LABEL_STYLE}>Contact email</label>
                    <div className='flex flex-col gap-3 sm:flex-row'>
                        <input id='contact-email' type='email' value={email} onChange={event => setEmail(event.target.value)} placeholder='hello@example.com' className={INPUT_STYLE} />
                        <button
                            type='button'
                            onClick={() => save({ contact_email: email.trim() }, 'Contact email saved.')}
                            disabled={email === site.contact_email}
                            className={`${BUTTON_STYLE} shrink-0`}
                        >
                            Save
                        </button>
                    </div>
                </SettingsSection>
            </div>
        </div>
    )
}

export default SiteSettingsDashboard
