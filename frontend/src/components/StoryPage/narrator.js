// ---------------------------------------------------------------
// NARRATOR STYLES for "Listen" on the story page.
//
// The browser can't really whisper, but slow + deep + a bit quieter
// gets surprisingly close to "someone reading by candlelight".
// To add a style: add one line here - the settings panel lists them all.
// ---------------------------------------------------------------
export const NARRATOR_STYLES = [
    { key: 'normal', label: 'Normal', rate: 1, pitch: 1, volume: 1 },
    { key: 'whisper', label: 'Creepy whisper', rate: 0.75, pitch: 0.5, volume: 0.7 },
    { key: 'fast', label: 'Fast', rate: 1.35, pitch: 1, volume: 1 },
]

const STORAGE_KEY = 'narrator'

// The saved choice, e.g. { style: 'whisper', voiceName: 'Google UK English Male' }.
// try/catch: localStorage can throw (private browsing) - then just use defaults.
export function loadNarrator() {
    try {
        return { style: 'normal', voiceName: '', ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }
    } catch {
        return { style: 'normal', voiceName: '' }
    }
}

export function saveNarrator(settings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
        // Can't save - it still works for this visit.
    }
}

// Turns the saved choice into the options speak() wants.
export function speechOptions(settings) {
    const style = NARRATOR_STYLES.find(s => s.key === settings.style) ?? NARRATOR_STYLES[0]
    return { voiceName: settings.voiceName, rate: style.rate, pitch: style.pitch, volume: style.volume }
}
