import { useState } from 'react'
import { SettingsSection } from './SettingsParts'
import { ACCESS_LEVELS, FEAR_MOODS, MAX_MOODS, READING_SPEEDS } from './settingsOptions'
import { BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// Three sections about what and how you read:
//   - Age & Content Access  (saves as soon as you pick a level)
//   - Fear Profile          (pick up to 3, then "Save Preferences")
//   - Reading Speed         (saves as soon as you click one)
//
// They're in one file because they're small and belong together.
// Each is still its own <SettingsSection>, so each gets its own
// sidebar link.
// ---------------------------------------------------------------
function ReadingSettings({ settings, onSave }) {
    return (
        // <> </> is a Fragment: it lets us return 3 sections side by
        // side without wrapping them in an extra <div>.
        <>
            <AgeAccess settings={settings} onSave={onSave} />
            <FearProfile settings={settings} onSave={onSave} />
            <ReadingSpeed settings={settings} onSave={onSave} />
        </>
    )
}


// ---------------------------------------------------------------
// AGE & CONTENT ACCESS
// Shows your current level. "Update" opens the three choices.
// ---------------------------------------------------------------
function AgeAccess({ settings, onSave }) {
    const [choosing, setChoosing] = useState(false)

    // Find the full { value, label, hint } for the saved value.
    const current = ACCESS_LEVELS.find(level => level.value === settings.content_access)

    async function pick(value) {
        setChoosing(false)
        // Clicking the one you already have: nothing to save.
        if (value === settings.content_access) return
        await onSave({ content_access: value }, 'Content access updated.')
    }

    return (
        <SettingsSection id='age' title='Age & Content Access' description='Controls which stories you can read based on content rating.'>
            <div className='flex items-center justify-between gap-4'>
                <div className='flex items-start gap-3'>
                    {/* The small red dot in front. mt-1.5 lines it up
                        with the first line of text. */}
                    <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-400' />
                    <div>
                        <p className='font-semibold text-red-400'>{current?.label}</p>
                        <p className='text-sm text-gray-400'>{current?.hint}</p>
                    </div>
                </div>

                <button
                    type='button'
                    onClick={() => setChoosing(!choosing)}
                    className='rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-slate-400 hover:text-white'
                >
                    {choosing ? 'Cancel' : 'Update'}
                </button>
            </div>

            {/* The three choices, only after clicking "Update". */}
            {choosing && (
                <div className='mt-5 grid gap-3 sm:grid-cols-3'>
                    {ACCESS_LEVELS.map(level => (
                        <button
                            key={level.value}
                            type='button'
                            onClick={() => pick(level.value)}
                            className={`rounded-xl border p-4 text-left transition-colors ${
                                level.value === settings.content_access
                                    ? 'border-red-600 bg-red-950/30'
                                    : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                            }`}
                        >
                            <p className='text-sm font-semibold text-white'>{level.label}</p>
                            <p className='mt-1 text-xs text-gray-400'>{level.hint}</p>
                        </button>
                    ))}
                </div>
            )}
        </SettingsSection>
    )
}


// ---------------------------------------------------------------
// FEAR PROFILE
// Django saves the moods as ONE string: "creepy,gore,dark".
// Here we work with a normal list: ['creepy', 'gore', 'dark'].
// ---------------------------------------------------------------
function FearProfile({ settings, onSave }) {
    // "creepy,gore" -> ['creepy', 'gore']. .filter(Boolean) throws
    // away the empty string you get from splitting "" (no moods yet).
    const [picked, setPicked] = useState(settings.fear_moods.split(',').filter(Boolean))
    const [saving, setSaving] = useState(false)

    const isFull = picked.length >= MAX_MOODS

    function toggleMood(value) {
        if (picked.includes(value)) {
            // Already picked -> a new list without it.
            setPicked(picked.filter(mood => mood !== value))
        } else if (!isFull) {
            // Not picked, and there's room -> a new list with it.
            setPicked([...picked, value])
        }
    }

    async function handleSave() {
        setSaving(true)
        // ['creepy', 'gore'] -> "creepy,gore"
        await onSave({ fear_moods: picked.join(',') }, 'Fear profile saved.')
        setSaving(false)
    }

    return (
        <SettingsSection id='fear' title='Fear Profile' description='Choose up to 3 moods that define your horror taste.'>
            <div className='flex items-center justify-between'>
                <p className='text-sm text-gray-300'>
                    Choose up to <span className='font-bold text-white'>{MAX_MOODS} moods</span>
                </p>
                {/* The "0 / 3" counter. */}
                <span className='rounded-full border border-slate-700 px-2.5 py-0.5 text-xs text-gray-400'>
                    {picked.length} / {MAX_MOODS}
                </span>
            </div>

            <div className='mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4'>
                {FEAR_MOODS.map(mood => {
                    const isPicked = picked.includes(mood.value)

                    // Greyed out when 3 are picked and this isn't one
                    // of them - you have to un-pick one first.
                    const isLocked = isFull && !isPicked

                    return (
                        <button
                            key={mood.value}
                            type='button'
                            onClick={() => toggleMood(mood.value)}
                            disabled={isLocked}
                            aria-pressed={isPicked}
                            className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                isPicked
                                    ? 'border-red-600 bg-red-950/30'
                                    : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                            }`}
                        >
                            <span className={`block h-2 w-2 rounded-full ${mood.dot}`} />
                            <p className='mt-2 text-sm font-semibold text-white'>{mood.label}</p>
                            <p className='mt-0.5 text-xs leading-snug text-gray-500'>{mood.hint}</p>
                        </button>
                    )
                })}
            </div>

            <button type='button' onClick={handleSave} disabled={saving} className={`${BUTTON_STYLE} mt-5 px-6`}>
                {saving ? 'Saving...' : 'Save Preferences'}
            </button>
        </SettingsSection>
    )
}


// ---------------------------------------------------------------
// READING SPEED - three cards, click one and it's saved.
// ---------------------------------------------------------------
function ReadingSpeed({ settings, onSave }) {
    return (
        <SettingsSection id='reading' title='Reading Speed' description='How fast do you read? Used for reading time estimates.'>
            <div className='grid gap-3 sm:grid-cols-3'>
                {READING_SPEEDS.map(speed => {
                    const isSelected = speed.value === settings.reading_speed
                    // Capital letter so JSX treats it as a component.
                    const Icon = speed.icon

                    return (
                        <button
                            key={speed.value}
                            type='button'
                            onClick={() => onSave({ reading_speed: speed.value }, 'Reading speed saved.')}
                            aria-pressed={isSelected}
                            className={`rounded-xl border p-4 text-left transition-colors ${
                                isSelected
                                    ? 'border-red-600 bg-red-950/30'
                                    : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                            }`}
                        >
                            <Icon className={`h-5 w-5 ${isSelected ? 'text-red-400' : 'text-gray-500'}`} />
                            <p className='mt-3 font-semibold text-white'>{speed.label}</p>
                            <p className='text-xs text-gray-400'>{speed.hint}</p>
                        </button>
                    )
                })}
            </div>

            <p className='mt-4 text-xs text-gray-500'>Reading time estimates on stories adjust to your pace.</p>
        </SettingsSection>
    )
}

export default ReadingSettings
