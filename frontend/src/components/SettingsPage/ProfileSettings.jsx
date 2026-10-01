import { useState, useEffect } from 'react'
import { Upload } from 'lucide-react'
import Avatar from '../Avatar/Avatar'
import { SettingsSection } from './SettingsParts'
import { LABEL_STYLE, INPUT_STYLE, BUTTON_STYLE, FIELD_ERROR_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// "Profile" - avatar, username, bio and website.
//
// This section has its OWN copy of the values while you type
// (`form`). Nothing is sent to Django until you press
// "Save Changes" - then onSave() gets only these fields.
// ---------------------------------------------------------------
function ProfileSettings({ settings, onSave }) {
    // Start the form with what Django sent us.
    const [form, setForm] = useState({
        username: settings.username,
        bio: settings.bio,
        website: settings.website,
        tip_url: settings.tip_url || '',
    })

    // The picked image FILE (to upload) and a preview address for it.
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState('')

    // { username: ['That username is already taken.'], ... }
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)

    // A preview made with URL.createObjectURL() keeps the image in
    // memory until we say we're done with it. This cleanup frees the
    // old one whenever the preview changes (or the page closes).
    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview)
        }
    }, [avatarPreview])

    // One function for all three inputs - the input's `name` says
    // which key to change. (Same as handleChange on the Write page.)
    function handleChange(event) {
        setForm({ ...form, [event.target.name]: event.target.value })
    }

    function handleAvatarChange(event) {
        const file = event.target.files[0]
        if (!file) return

        // 1 MB = 1024 * 1024 bytes. Checking here saves an upload
        // that Django would refuse anyway.
        if (file.size > 5 * 1024 * 1024) {
            setErrors({ avatar: ['The image must be smaller than 5 MB.'] })
            return
        }

        setErrors({})
        setAvatarFile(file)
        // A temporary "blob:" address so we can show the picture
        // BEFORE it's uploaded.
        setAvatarPreview(URL.createObjectURL(file))
    }

    async function handleSubmit(event) {
        // Stop the browser from reloading the page (a form's default).
        event.preventDefault()
        setSaving(true)
        setErrors({})

        // Only send the avatar if you picked a new one.
        const changes = { ...form }
        if (avatarFile) changes.avatar = avatarFile

        // onSave answers null when it worked, or Django's error
        // messages, e.g. { username: ['That username is already taken.'] }
        const problems = await onSave(changes, 'Profile saved.')
        if (problems) {
            setErrors(problems)
        } else {
            setAvatarFile(null)
        }
        setSaving(false)
    }

    return (
        <SettingsSection id='profile' title='Profile' description='Update your public profile information and avatar.'>
            <form onSubmit={handleSubmit} noValidate className='space-y-5'>
                <h3 className='font-semibold text-white'>Profile Information</h3>

                {/* ---------- AVATAR ---------- */}
                <div>
                    <p className={LABEL_STYLE}>Avatar</p>
                    <div className='flex items-center gap-5'>
                        {/* The new picture if you just picked one,
                            otherwise the saved one (or your initials). */}
                        <Avatar
                            username={form.username || settings.username}
                            image={avatarPreview || settings.avatar}
                            size='lg'
                        />

                        <div className='flex-1'>
                            {/* A <label> wrapped around a hidden file
                                input: clicking the label opens the file
                                picker. This lets us style the "button"
                                any way we like - real file inputs are
                                almost impossible to style. */}
                            <label className='flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-600'>
                                <Upload className='h-4 w-4' />
                                Upload from device
                                <input
                                    type='file'
                                    accept='image/png, image/jpeg, image/webp, image/gif'
                                    onChange={handleAvatarChange}
                                    className='hidden'
                                />
                            </label>
                            <p className='mt-2 text-xs text-gray-500'>
                                {avatarFile ? `${avatarFile.name} - press Save Changes to upload` : 'JPG, PNG, WebP or GIF · Max 5 MB'}
                            </p>
                        </div>
                    </div>
                    {/* .join(' '): Django sends a LIST of messages
                        per field, so glue them into one line. */}
                    {errors.avatar && <p className={FIELD_ERROR_STYLE}>{errors.avatar.join(' ')}</p>}
                </div>

                {/* ---------- USERNAME ---------- */}
                <div>
                    <label htmlFor='username' className={LABEL_STYLE}>
                        Username <span className='text-red-500'>*</span>
                    </label>
                    <input id='username' name='username' value={form.username} onChange={handleChange} className={INPUT_STYLE} />
                    {errors.username && <p className={FIELD_ERROR_STYLE}>{errors.username.join(' ')}</p>}
                </div>

                {/* ---------- BIO ---------- */}
                <div>
                    <label htmlFor='bio' className={LABEL_STYLE}>Bio</label>
                    <textarea
                        id='bio'
                        name='bio'
                        rows={3}
                        maxLength={500}
                        value={form.bio}
                        onChange={handleChange}
                        placeholder='Tell the community a little about yourself...'
                        className={`${INPUT_STYLE} resize-y`}
                    />
                    {/* A small counter, so people know about the limit. */}
                    <p className='mt-1 text-right text-xs text-gray-500'>{form.bio.length} / 500</p>
                    {errors.bio && <p className={FIELD_ERROR_STYLE}>{errors.bio.join(' ')}</p>}
                </div>

                {/* ---------- WEBSITE ---------- */}
                <div>
                    <label htmlFor='website' className={LABEL_STYLE}>Website</label>
                    <input
                        id='website'
                        name='website'
                        type='url'
                        value={form.website}
                        onChange={handleChange}
                        placeholder='https://yourwebsite.com'
                        className={INPUT_STYLE}
                    />
                    {errors.website && <p className={FIELD_ERROR_STYLE}>{errors.website.join(' ')}</p>}
                </div>

                {/* ---------- SUPPORT LINK ("tip jar") ---------- */}
                {/* Shows a "Support the writer" button on your stories and
                    profile. Readers pay you on THAT site - no money goes
                    through Silent Evidence. */}
                <div>
                    <label htmlFor='tip_url' className={LABEL_STYLE}>Support link <span className='font-normal text-gray-500'>(optional)</span></label>
                    <input
                        id='tip_url'
                        name='tip_url'
                        type='url'
                        value={form.tip_url}
                        onChange={handleChange}
                        placeholder='https://ko-fi.com/yourname'
                        className={INPUT_STYLE}
                    />
                    <p className='mt-1 text-xs text-gray-500'>Ko-fi, Buy Me a Coffee, PayPal.me, Patreon, Liberapay or GitHub Sponsors. Readers who love your stories can tip you there.</p>
                    {errors.tip_url && <p className={FIELD_ERROR_STYLE}>{errors.tip_url.join(' ')}</p>}
                </div>

                {errors.detail && <p className={FIELD_ERROR_STYLE}>{errors.detail}</p>}

                <button type='submit' disabled={saving} className={`${BUTTON_STYLE} w-full`}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
        </SettingsSection>
    )
}

export default ProfileSettings
