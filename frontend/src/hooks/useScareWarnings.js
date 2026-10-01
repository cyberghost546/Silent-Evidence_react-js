import { useState } from 'react'


// ---------------------------------------------------------------
// Does this reader want a warning before jump scares? On/off,
// remembered in this browser (localStorage), for every story.
// Used by StoryPage with JumpScareNotice.jsx.
//
//   const [warn, setWarn] = useScareWarnings()
// ---------------------------------------------------------------
const STORAGE_KEY = 'scareWarnings'

// A tiny hook: an on/off value that is saved in localStorage.
export function useScareWarnings() {
    const [warn, setWarn] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'on'
        } catch {
            return false
        }
    })

    function change(value) {
        setWarn(value)
        try {
            localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off')
        } catch {
            // Can't save - still works until the page closes.
        }
    }

    return [warn, change]
}
