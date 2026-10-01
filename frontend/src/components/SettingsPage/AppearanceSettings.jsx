import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../Avatar/Avatar'
import FancyAvatar from '../Avatar/FancyAvatar'
import ProName from '../ProName/ProName'
import { NAME_COLORS } from '../ProName/nameColors'
import { SettingsSection } from './SettingsParts'
import { THEMES, BORDERS } from './settingsOptions'


// ---------------------------------------------------------------
// "Profile Appearance" - pick a theme colour and an avatar border
// animation (everyone), plus the Pro looks: the Gold Crown border
// and a name colour. The preview below shows the result straight
// away; nothing is saved until you press "Save Appearance".
//
// What you pick shows on your profile page (FancyAvatar + ProName).
// ---------------------------------------------------------------

// Every choice button looks the same, only "selected" changes.
// A function that gives back the right classes.
function choiceStyle(isSelected) {
    const base = 'flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40'
    return isSelected
        ? `${base} border-slate-400 bg-slate-700/60 font-semibold text-white`
        : `${base} border-slate-700 bg-slate-900 text-gray-400 hover:border-slate-500 hover:text-white`
}

// The little gold "PRO" tag on Pro-only choices.
function ProTag() {
    return <span className='rounded bg-yellow-400 px-1 text-[9px] font-extrabold text-black'>PRO</span>
}

function AppearanceSettings({ settings, onSave }) {
    const isPro = Boolean(settings.is_premium)

    // A Pro border that's still saved from when you WERE Pro starts
    // as 'none' - otherwise saving your theme would send it again and
    // Django would refuse.
    const savedBorderIsPro = BORDERS.find(item => item.value === settings.avatar_border)?.pro
    const startBorder = savedBorderIsPro && !isPro ? 'none' : settings.avatar_border

    // Local copies, so you can try things out before saving.
    const [theme, setTheme] = useState(settings.profile_theme)
    const [border, setBorder] = useState(startBorder)
    const [nameColor, setNameColor] = useState(settings.name_color || '')
    const [saving, setSaving] = useState(false)

    // The full objects for the picked values (for the label + colour).
    const themeInfo = THEMES.find(item => item.value === theme)
    const borderInfo = BORDERS.find(item => item.value === border)

    async function handleSave() {
        setSaving(true)
        // Only send the Pro choices if you're Pro - Django would say no.
        const values = { profile_theme: theme, avatar_border: border }
        if (isPro) values.name_color = nameColor
        await onSave(values, 'Appearance saved.')
        setSaving(false)
    }

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
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
                {BORDERS.map(item => {
                    const Icon = item.icon
                    // A Pro border is greyed out for everyone else.
                    const locked = item.pro && !isPro
                    return (
                        <button
                            key={item.value}
                            type='button'
                            onClick={() => setBorder(item.value)}
                            aria-pressed={item.value === border}
                            disabled={locked}
                            title={locked ? 'For Pro members' : undefined}
                            className={choiceStyle(item.value === border)}
                        >
                            <Icon className='h-4 w-4' />
                            {item.label}
                            {item.pro && <ProTag />}
                        </button>
                    )
                })}
            </div>

            {/* ---------- NAME COLOUR (Pro) ---------- */}
            <p className='mb-2 mt-6 flex items-center gap-2 text-sm font-semibold text-gray-200'>
                Name Colour <ProTag />
            </p>
            <div className='grid grid-cols-3 gap-2 sm:grid-cols-6'>
                {NAME_COLORS.map(color => (
                    <button
                        key={color.value || 'normal'}
                        type='button'
                        onClick={() => setNameColor(color.value)}
                        aria-pressed={color.value === nameColor}
                        disabled={!isPro}
                        className={choiceStyle(color.value === nameColor)}
                    >
                        {/* The label in its own colour - that's the preview. */}
                        <span className={color.className}>{color.label}</span>
                    </button>
                ))}
            </div>
            {!isPro && (
                <p className='mt-2 text-xs text-gray-500'>
                    The Gold Crown border and name colours come with <Link to='/premium' className='text-yellow-400 underline'>Silent Evidence Pro</Link>.
                </p>
            )}

            {/* ---------- PREVIEW ---------- */}
            <div className='mt-6 flex items-center gap-5 rounded-xl border border-slate-800 bg-slate-900 p-5'>
                <FancyAvatar theme={theme} border={border}>
                    <Avatar username={settings.username} image={settings.avatar} size='lg' />
                </FancyAvatar>

                <div>
                    <p className='font-semibold'>
                        <ProName name={settings.username} look={{ is_pro: isPro, name_color: nameColor }} className='text-white' />
                    </p>
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
