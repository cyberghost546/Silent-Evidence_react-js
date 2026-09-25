import { useState } from 'react'
import Avatar from '../Avatar/Avatar'
import { SettingsSection } from './SettingsParts'
import { THEMES, BORDERS } from './settingsOptions'
import styles from './SettingsPage.module.css'


// ---------------------------------------------------------------
// "Profile Appearance" - pick a theme colour and an avatar border
// animation. The preview below shows the result straight away;
// nothing is saved until you press "Save Appearance".
// ---------------------------------------------------------------

// Every choice button looks the same, only "selected" changes.
// A function that gives back the right classes.
function choiceStyle(isSelected) {
    const base = 'flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs transition-colors'
    return isSelected
        ? `${base} border-slate-400 bg-slate-700/60 font-semibold text-white`
        : `${base} border-slate-700 bg-slate-900 text-gray-400 hover:border-slate-500 hover:text-white`
}

function AppearanceSettings({ settings, onSave }) {
    // Local copies, so you can try things out before saving.
    const [theme, setTheme] = useState(settings.profile_theme)
    const [border, setBorder] = useState(settings.avatar_border)
    const [saving, setSaving] = useState(false)

    // The full objects for the picked values (for the label + colour).
    const themeInfo = THEMES.find(item => item.value === theme)
    const borderInfo = BORDERS.find(item => item.value === border)

    async function handleSave() {
        setSaving(true)
        await onSave({ profile_theme: theme, avatar_border: border }, 'Appearance saved.')
        setSaving(false)
    }

    // The CSS Module class for the picked animation (orbit is a
    // separate ring element, handled in the JSX below).
    let animationClass = ''
    if (border === 'pulse') animationClass = styles.pulse
    if (border === 'flicker') animationClass = styles.flicker

    return (
        <SettingsSection id='appearance' title='Profile Appearance' description='Customise your profile theme and avatar border animation.'>

            {/* ---------- THEME ---------- */}
            <p className='mb-2 text-sm font-semibold text-gray-200'>Profile Theme</p>
            {/* 3 per row on phones, 6 in one row on bigger screens. */}
            <div className='grid grid-cols-3 gap-2 sm:grid-cols-6'>
                {THEMES.map(item => {
                    const Icon = item.icon
                    return (
                        <button
                            key={item.value}
                            type='button'
                            onClick={() => setTheme(item.value)}
                            aria-pressed={item.value === theme}
                            // flex-col: icon ABOVE the text here.
                            className={`${choiceStyle(item.value === theme)} flex-col`}
                        >
                            {/* style={{ color }}: the icon in the theme's
                                own colour, so you see it before picking. */}
                            <Icon className='h-4 w-4' style={{ color: item.color }} />
                            {item.label}
                        </button>
                    )
                })}
            </div>

            {/* ---------- BORDER ANIMATION ---------- */}
            <p className='mb-2 mt-6 text-sm font-semibold text-gray-200'>Avatar Border Animation</p>
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                {BORDERS.map(item => {
                    const Icon = item.icon
                    return (
                        <button
                            key={item.value}
                            type='button'
                            onClick={() => setBorder(item.value)}
                            aria-pressed={item.value === border}
                            className={choiceStyle(item.value === border)}
                        >
                            <Icon className='h-4 w-4' />
                            {item.label}
                        </button>
                    )
                })}
            </div>

            {/* ---------- PREVIEW ---------- */}
            <div className='mt-6 flex items-center gap-5 rounded-xl border border-slate-800 bg-slate-900 p-5'>
                {/* '--theme-color' is a CSS variable that the
                    animations in SettingsPage.module.css read.
                    relative = the anchor for the orbit ring, which is
                    'absolute' and sits on top of the avatar. */}
                <div
                    className={`relative rounded-full ${animationClass}`}
                    style={{ '--theme-color': themeInfo.color }}
                >
                    <Avatar username={settings.username} image={settings.avatar} size='lg' />
                    {border === 'orbit' && <span className={styles.orbit} />}
                </div>

                <div>
                    <p className='font-semibold text-white'>Preview</p>
                    <p className='text-xs' style={{ color: themeInfo.color }}>
                        {themeInfo.label} · {borderInfo.label}
                    </p>
                </div>
            </div>

            <button
                type='button'
                onClick={handleSave}
                disabled={saving}
                className='mt-6 w-full rounded-lg bg-yellow-500 py-3 font-bold text-black transition-colors hover:bg-yellow-400 disabled:opacity-50'
            >
                {saving ? 'Saving...' : 'Save Appearance'}
            </button>
        </SettingsSection>
    )
}

export default AppearanceSettings
