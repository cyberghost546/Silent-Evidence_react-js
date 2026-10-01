import { useEffect, useState } from 'react'


// ---------------------------------------------------------------
// "Can this visitor install the site as an app - and how?"
//
//   const { canInstall, isIos, installed, install } = useInstallPrompt()
//
// canInstall - Chrome / Edge / Android offered to install: install()
//              opens their real "Install app?" window
// isIos      - an iPhone/iPad: Safari has no install window, so the
//              button explains "Share -> Add to Home Screen" instead
// installed  - already running as the installed app: show nothing
//
// The browser sends 'beforeinstallprompt' when the site qualifies
// (manifest + service worker + HTTPS). We keep that event and use it
// later, when the visitor clicks OUR button.
// ---------------------------------------------------------------
function runningAsApp() {
    // display-mode: standalone = opened from the home-screen icon.
    // navigator.standalone = the same thing, the old iPhone way.
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function useInstallPrompt() {
    const [promptEvent, setPromptEvent] = useState(null)
    const [installed, setInstalled] = useState(runningAsApp)

    useEffect(() => {
        function handlePrompt(event) {
            // preventDefault: don't show the browser's own little
            // banner - we show our button instead.
            event.preventDefault()
            setPromptEvent(event)
        }
        function handleInstalled() {
            setInstalled(true)
            setPromptEvent(null)
        }
        window.addEventListener('beforeinstallprompt', handlePrompt)
        window.addEventListener('appinstalled', handleInstalled)
        return () => {
            window.removeEventListener('beforeinstallprompt', handlePrompt)
            window.removeEventListener('appinstalled', handleInstalled)
        }
    }, [])

    async function install() {
        if (!promptEvent) return
        promptEvent.prompt()
        // The event can only be used once, whatever they chose.
        await promptEvent.userChoice
        setPromptEvent(null)
    }

    // iPhone / iPad. (iPads say "Macintosh" nowadays, but have a touch screen.)
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)

    return { canInstall: Boolean(promptEvent), isIos, installed, install }
}
