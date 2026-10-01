import { useState } from 'react'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { SettingRow, Toggle } from './SettingsParts'


// ---------------------------------------------------------------
// "Phone notifications" in Settings -> Notifications.
// Everything the bell shows, also as a pop-up on THIS device - even
// when the site is closed. For each device separately (your phone and
// your laptop each switch it on themselves).
// The work is done in hooks/usePushNotifications.js.
// ---------------------------------------------------------------
const HELP = {
    loading: 'Checking this device...',
    unsupported: 'This browser can\'t show notifications from Silent Evidence. Tip: install the app (footer) and open it from your home screen.',
    'not-set-up': 'Coming soon - phone notifications aren\'t switched on for the site yet.',
    blocked: 'You blocked notifications for this site. Allow them again in your browser\'s site settings (the lock icon next to the address).',
    off: 'Replies, new followers and more, as a pop-up on this device - even when the site is closed.',
    on: 'On for this device. Choose WHICH ones above - the same switches as the bell.',
}

function PhoneNotificationsRow() {
    const { status, turnOn, turnOff } = usePushNotifications()
    const [busy, setBusy] = useState(false)
    const [problem, setProblem] = useState('')

    async function handleChange(wantOn) {
        setBusy(true)
        setProblem('')
        try {
            await (wantOn ? turnOn() : turnOff())
        } catch {
            setProblem('That did not work - try again in a moment.')
        } finally {
            setBusy(false)
        }
    }

    const canSwitch = status === 'on' || status === 'off'

    return (
        <SettingRow title='Phone notifications' text={problem || HELP[status]}>
            <Toggle
                label='Phone notifications'
                on={status === 'on'}
                onChange={handleChange}
                disabled={!canSwitch || busy}
            />
        </SettingRow>
    )
}

export default PhoneNotificationsRow
