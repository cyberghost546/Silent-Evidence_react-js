import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { changePassword, deleteAccount, exportMyData } from '../../api/client'
import PasswordInput from '../PasswordInput/PasswordInput'
import PasswordStrength from '../PasswordStrength/PasswordStrength'
import VerificationRow from './VerificationRow'
import { SettingsSection, SettingRow, Toggle, ComingSoon } from './SettingsParts'
import { LABEL_STYLE, BUTTON_STYLE, FIELD_ERROR_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// "Account" - privacy, password, your data, and deleting it all.
//
//   Private Profile       works (saved in your settings)
//   Get verified          works (request the blue check mark)
//   Change Password       works (opens a small form)
//   Download Your Data    works (saves a .json file)
//   Delete Account        works (asks for your password first)
//   Two-Factor, Backup Codes, Log Out All Devices
//                         shown but switched off - "Coming soon"
// ---------------------------------------------------------------

// The small dark buttons on the right of each row.
const SMALL_BUTTON = 'rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50'

function AccountSettings({ settings, onSave, onMessage }) {
    return (
        <SettingsSection id='account' title='Account' description='Manage your password, privacy, and account deletion.'>
            <div className='space-y-4'>
                <SettingRow title='Private Profile' text='When on, only your followers can see your stories and profile details.'>
                    <Toggle
                        label='Private Profile'
                        on={settings.is_private}
                        onChange={newValue => onSave({ is_private: newValue }, newValue ? 'Your profile is now private.' : 'Your profile is now public.')}
                    />
                </SettingRow>

                <SettingRow title='Two-Factor Authentication' badge={<ComingSoon />} text="When on, you'll need to enter an emailed code on each login.">
                    <Toggle label='Two-Factor Authentication' on={false} onChange={() => {}} disabled />
                </SettingRow>

                <SettingRow title='Backup Recovery Codes' badge={<ComingSoon />} text='Single-use codes to sign in if you lose access to your email. Store them somewhere safe and offline.'>
                    <button type='button' disabled className={SMALL_BUTTON}>Generate new codes</button>
                </SettingRow>

                <VerificationRow onMessage={onMessage} />

                <ChangePassword onMessage={onMessage} />

                <SettingRow title='Log Out All Devices' badge={<ComingSoon />} text='Immediately ends every active session, including this one. Tip: changing your password already does this.'>
                    <button type='button' disabled className={SMALL_BUTTON}>Log out all</button>
                </SettingRow>

                <DownloadData onMessage={onMessage} />

                <DeleteAccount />
            </div>
        </SettingsSection>
    )
}


// ---------------------------------------------------------------
// CHANGE PASSWORD - a row with a "Change" link. Clicking it opens
// a small form right inside the row.
// ---------------------------------------------------------------
function ChangePassword({ onMessage }) {
    const [open, setOpen] = useState(false)
    const [current, setCurrent] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)

    // Close the form and empty it (after saving, or on Cancel).
    function reset() {
        setOpen(false)
        setCurrent('')
        setNewPassword('')
        setErrors({})
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setSaving(true)
        setErrors({})
        try {
            await changePassword(current, newPassword)
            reset()
            onMessage('Password changed.')
        } catch (err) {
            // { current_password: [...] } or { new_password: [...] }
            setErrors(err.data || { detail: 'Could not change the password.' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className='rounded-xl border border-slate-800 bg-slate-900 p-5'>
            <div className='flex items-center justify-between gap-4'>
                <div>
                    <p className='font-semibold text-white'>Change Password</p>
                    <p className='mt-1 text-xs text-gray-400'>Update your account password.</p>
                </div>
                <button type='button' onClick={open ? reset : () => setOpen(true)} className='text-xs font-semibold text-red-400 hover:text-red-300'>
                    {open ? 'Cancel' : 'Change'}
                </button>
            </div>

            {open && (
                <form onSubmit={handleSubmit} noValidate className='mt-5 space-y-4 border-t border-slate-800 pt-5'>
                    <div>
                        <label htmlFor='current_password' className={LABEL_STYLE}>Current password</label>
                        {/* autoComplete helps password managers fill in
                            the right box. */}
                        <PasswordInput
                            id='current_password'
                            value={current}
                            onChange={event => setCurrent(event.target.value)}
                            autoComplete='current-password'
                        />
                        {errors.current_password && <p className={FIELD_ERROR_STYLE}>{errors.current_password.join(' ')}</p>}
                    </div>

                    <div>
                        <label htmlFor='new_password' className={LABEL_STYLE}>New password</label>
                        <PasswordInput
                            id='new_password'
                            value={newPassword}
                            onChange={event => setNewPassword(event.target.value)}
                            autoComplete='new-password'
                        />
                        {/* The same strength bar as on Sign Up. */}
                        <PasswordStrength password={newPassword} />
                        {errors.new_password && <p className={FIELD_ERROR_STYLE}>{errors.new_password.join(' ')}</p>}
                    </div>

                    {errors.detail && <p className={FIELD_ERROR_STYLE}>{errors.detail}</p>}

                    <button type='submit' disabled={saving || !current || !newPassword} className={BUTTON_STYLE}>
                        {saving ? 'Saving...' : 'Save new password'}
                    </button>
                </form>
            )}
        </div>
    )
}


// ---------------------------------------------------------------
// DOWNLOAD YOUR DATA - asks Django for everything, then makes the
// browser save it as a file.
// ---------------------------------------------------------------
function DownloadData({ onMessage }) {
    const [busy, setBusy] = useState(false)

    async function handleDownload() {
        setBusy(true)
        try {
            const data = await exportMyData()

            // How to save a file from JavaScript:
            //   1. Turn the data into text. JSON.stringify(data, null, 2)
            //      = nicely indented, so people can read the file.
            //   2. Wrap the text in a Blob (a "file in memory").
            //   3. Make a temporary address for it, put that on an
            //      invisible <a download>, and click it from code.
            //   4. Free the temporary address again.
            const text = JSON.stringify(data, null, 2)
            const blob = new Blob([text], { type: 'application/json' })
            const url = URL.createObjectURL(blob)

            const link = document.createElement('a')
            link.href = url
            link.download = `silent-evidence-${data.account.username}.json`
            link.click()

            URL.revokeObjectURL(url)
            onMessage('Your data is downloading.')
        } catch {
            onMessage('Could not download your data.', true)
        } finally {
            setBusy(false)
        }
    }

    return (
        <SettingRow
            title='Download Your Data'
            text='Get a copy of everything we hold about you — profile, stories, comments, likes, saves and follows — as a JSON file. Passwords are not included.'
        >
            <button type='button' onClick={handleDownload} disabled={busy} className={SMALL_BUTTON}>
                {busy ? 'Preparing...' : 'Download'}
            </button>
        </SettingRow>
    )
}


// ---------------------------------------------------------------
// DELETE ACCOUNT - the red box. Two steps on purpose, so nobody
// deletes everything with one accidental click:
//   1. "Delete my account" opens the confirm form
//   2. type your password and confirm
// ---------------------------------------------------------------
function DeleteAccount() {
    const { refreshUser } = useAuth()
    const navigate = useNavigate()

    const [confirming, setConfirming] = useState(false)
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [deleting, setDeleting] = useState(false)

    async function handleDelete(event) {
        event.preventDefault()
        setDeleting(true)
        setError('')
        try {
            await deleteAccount(password)

            // Go to the homepage FIRST. If we updated the user first,
            // this page (logged-in only) would send us to /login.
            navigate('/')

            // Django has logged us out, so this sets user to null and
            // the Header shows "Log In" again.
            refreshUser()
        } catch (err) {
            setError(err.data?.password?.join(' ') || 'Could not delete the account.')
            setDeleting(false)
        }
    }

    return (
        <SettingRow danger title='Delete Account' text='Permanently delete your account and all your stories. This cannot be undone.'>
            {!confirming ? (
                <button
                    type='button'
                    onClick={() => setConfirming(true)}
                    className='rounded-lg border border-red-800 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-950'
                >
                    Delete my account
                </button>
            ) : (
                <form onSubmit={handleDelete} className='w-full space-y-2 sm:w-64'>
                    <PasswordInput
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        placeholder='Your password'
                        aria-label='Your password'
                        autoComplete='current-password'
                    />
                    {error && <p className={FIELD_ERROR_STYLE}>{error}</p>}
                    <div className='flex gap-2'>
                        <button type='button' onClick={() => setConfirming(false)} className={`${SMALL_BUTTON} flex-1`}>
                            Cancel
                        </button>
                        <button
                            type='submit'
                            disabled={deleting || !password}
                            className='flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50'
                        >
                            {deleting ? 'Deleting...' : 'Delete forever'}
                        </button>
                    </div>
                </form>
            )}
        </SettingRow>
    )
}

export default AccountSettings
