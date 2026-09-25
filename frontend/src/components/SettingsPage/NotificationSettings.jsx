import { SettingsSection, SettingRow, Toggle } from './SettingsParts'
import { DIGEST_OPTIONS } from './settingsOptions'


// ---------------------------------------------------------------
// "Notifications" - a switch and a group of radio buttons.
// Both save as soon as you click them (no Save button).
//
// NOTE: this only SAVES your choice. Actually sending the emails is
// a separate job for later (Django would need an email server and
// a task that runs every day/week).
// ---------------------------------------------------------------
function NotificationSettings({ settings, onSave }) {
    return (
        <SettingsSection id='notifications' title='Notifications' description='Choose which emails and alerts you receive.'>
            <div className='space-y-4'>

                {/* ---------- WEEKLY DIGEST: on/off ---------- */}
                <SettingRow title='Weekly Horror Digest' text='Top stories of the week, delivered every Monday.'>
                    <Toggle
                        label='Weekly Horror Digest'
                        on={settings.weekly_digest}
                        onChange={newValue => onSave({ weekly_digest: newValue }, newValue ? 'Weekly digest on.' : 'Weekly digest off.')}
                    />
                </SettingRow>

                {/* ---------- COMMENT DIGEST: pick one ---------- */}
                {/* <fieldset> + <legend> is the proper HTML for "a group
                    of radio buttons with a title" - screen readers read
                    the legend before each option. */}
                <fieldset className='rounded-xl border border-slate-800 bg-slate-900 p-5'>
                    <legend className='sr-only'>Comment Digest Emails</legend>
                    <p className='font-semibold text-white'>Comment Digest Emails</p>
                    <p className='mt-1 text-xs text-gray-400'>Choose how often you receive a summary of new comments on your stories.</p>

                    <div className='mt-4 space-y-3'>
                        {DIGEST_OPTIONS.map(option => {
                            const isSelected = option.value === settings.comment_digest

                            return (
                                // Wrapping the radio in a <label> makes the
                                // WHOLE box clickable, not just the circle.
                                <label
                                    key={option.value}
                                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                                        isSelected
                                            ? 'border-red-700 bg-red-950/30'
                                            : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                                    }`}
                                >
                                    {/* Radios with the same `name` form one
                                        group: picking one un-picks the others.
                                        accent-red-600 colours the dot red.
                                        [color-scheme:dark] = draw the browser's
                                        own radio in dark mode (dark circle
                                        instead of a white one). */}
                                    <input
                                        type='radio'
                                        name='comment_digest'
                                        value={option.value}
                                        checked={isSelected}
                                        onChange={() => onSave({ comment_digest: option.value }, 'Comment digest saved.')}
                                        className='mt-1 h-4 w-4 accent-red-600 [color-scheme:dark]'
                                    />
                                    <span>
                                        <span className='block text-sm font-semibold text-white'>{option.label}</span>
                                        <span className='block text-xs text-gray-400'>{option.hint}</span>
                                    </span>
                                </label>
                            )
                        })}
                    </div>
                </fieldset>
            </div>
        </SettingsSection>
    )
}

export default NotificationSettings
