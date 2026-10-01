import { useEffect, useState } from 'react'
import { getPushStatus, savePushSubscription, removePushSubscription } from '../api/client'


// ---------------------------------------------------------------
// PHONE NOTIFICATIONS (web push) for THIS device.
//
//   const { status, turnOn, turnOff } = usePushNotifications()
//
// status is one of:
//   'loading'       - still checking
//   'unsupported'   - this browser can't do push (or the app isn't the
//                     built/online one - no service worker while developing)
//   'not-set-up'    - the site has no push keys yet (accounts/push.py)
//   'blocked'       - you said "Block" when the browser asked
//   'off' / 'on'
//
// How it works: the browser makes a "subscription" (an address at its
// push service + keys), we send it to Django, and Django sends each
// notification there (accounts/push.py). public/sw.js shows it.
// ---------------------------------------------------------------

// The public key arrives as base64url text; subscribe() wants bytes.
function keyToBytes(base64url) {
    const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
    return Uint8Array.from(atob(base64), char => char.charCodeAt(0))
}

function supported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function usePushNotifications() {
    const [status, setStatus] = useState(supported() ? 'loading' : 'unsupported')
    const [publicKey, setPublicKey] = useState('')

    useEffect(() => {
        if (!supported()) return
        let ignore = false

        async function check() {
            const registration = await navigator.serviceWorker.getRegistration()
            if (!registration) return 'unsupported'
            const subscription = await registration.pushManager.getSubscription()
            const answer = await getPushStatus(subscription?.endpoint)
            if (ignore) return null
            setPublicKey(answer.public_key)
            if (!answer.public_key) return 'not-set-up'
            if (Notification.permission === 'denied') return 'blocked'
            return subscription && answer.subscribed ? 'on' : 'off'
        }

        check()
            .then(result => { if (!ignore && result) setStatus(result) })
            .catch(() => { if (!ignore) setStatus('unsupported') })
        return () => { ignore = true }
    }, [])

    async function turnOn() {
        // The browser's own "Allow notifications?" question.
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
            setStatus(permission === 'denied' ? 'blocked' : 'off')
            return
        }
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,                       // every push shows a notification (required)
            applicationServerKey: keyToBytes(publicKey), // "only accept pushes signed by this site"
        })
        // toJSON() = { endpoint, keys: { p256dh, auth } } - what Django wants.
        await savePushSubscription(subscription.toJSON())
        setStatus('on')
    }

    async function turnOff() {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
            await removePushSubscription(subscription.endpoint)
            await subscription.unsubscribe()
        }
        setStatus('off')
    }

    return { status, turnOn, turnOff }
}
