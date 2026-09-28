import { useState } from 'react'
import { Smartphone, Share } from 'lucide-react'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'


// ---------------------------------------------------------------
// "Install the app" (in the Footer).
//
//   Chrome / Edge / Android -> opens the browser's install window
//   iPhone / iPad           -> shows how to do it by hand in Safari
//   already installed, or a browser that can't -> nothing at all
// ---------------------------------------------------------------
function InstallAppButton() {
    const { canInstall, isIos, installed, install } = useInstallPrompt()
    const [showIosHelp, setShowIosHelp] = useState(false)

    if (installed || (!canInstall && !isIos)) return null

    return (
        <div>
            <button
                type='button'
                onClick={canInstall ? install : () => setShowIosHelp(!showIosHelp)}
                aria-expanded={isIos && !canInstall ? showIosHelp : undefined}
                className='inline-flex items-center gap-2 rounded-lg border border-red-800 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-950/60'
            >
                <Smartphone className='h-4 w-4' />
                Install the app
            </button>
            {showIosHelp && (
                <p className='mt-2 max-w-xs text-xs text-gray-400'>
                    In Safari, tap <Share className='inline h-3.5 w-3.5 align-text-bottom' aria-label='Share' /> Share,
                    then <b className='text-gray-200'>Add to Home Screen</b>.
                </p>
            )}
        </div>
    )
}

export default InstallAppButton
