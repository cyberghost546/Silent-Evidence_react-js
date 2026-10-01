import { SettingsSection, SettingRow, Toggle } from './SettingsParts'
import PhoneNotificationsRow from './PhoneNotificationsRow'
import { DIGEST_OPTIONS } from './settingsOptions'


// ---------------------------------------------------------------
// "Notifications" - switches for the bell, then the emails.
// Everything saves as soon as you click it (no Save button).
//
//   The bell: which kinds you want (Django's notify() checks these,
//             see accounts/notifications.py). Co-author invites and
//             support answers are always on - they need a reply.
//   Emails:   the weekly digest and the comment digest.
// ---------------------------------------------------------------

// One line per switch, so adding a kind later = one more line here
// (and the field in Django's Profile model).
const BELL_SWITCHES = [
    { field: 'notify_likes', title: 'Likes', text: 'When someone likes one of your stories.' },
    { field: 'notify_comments', title: 'Comments & replies', text: 'New comments on your stories, and replies to your comments.' },
    { field: 'notify_follows', title: 'New followers', text: 'When someone starts following you.' },
]


function NotificationSettings({ settings, onSave }) {
    return (
        <SettingsSection id='notifications' title='Notifications' description='Choose which emails and alerts you receive.'>
            <div className='space-y-4'>

                {/* ---------- THE BELL ---------- */}
                <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>The bell 🔔</p>
                {BELL_SWITCHES.map(item => (
                    <SettingRow key={item.field} title={item.title} text={item.text}>
                        <Toggle
                            label={item.title}
                            on={settings[item.field]}
                            // [item.field] in { } = use the field NAME as the key:
                            // { notify_likes: false }
                            onChange={newValue => onSave({ [item.field]: newValue }, `${item.title}: ${newValue ? 'on' : 'off'}.`)}
                        />
                    </SettingRow>
                ))}

                {/* The same notifications as a pop-up on this device. */}
                <PhoneNotificationsRow />

                <p className='pt-2 text-xs font-semibold uppercase tracking-wider text-gray-500'>Emails</p>

                {/* ---------- WEEKLY DIGEST: on/off ---------- */}
                <SettingRow title='Weekly Horror Digest' text='Top stories of the week, delivered every Monday.'>
                    <Toggle
                        label='Weekly Horror Digest'
                        on={settings.weekly_digest}
                        onChange={newValue => onSave({ weekly_digest: newValue }, newValue ? 'Weekly digest on.' : 'Weekly digest off.')}
                    />
                </SettingRow>

                {/* ---------- WRITERS YOU FOLLOW: on/off ---------- */}
                <SettingRow title='New from writers you follow' text='One email a day when writers you follow publish something new.'>
                    <Toggle
                        label='New from writers you follow'
                        on={settings.follow_digest}
                        onChange={newValue => onSave({ follow_digest: newValue }, newValue ? 'Emails about writers you follow: on.' : 'Emails about writers you follow: off.')}
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
