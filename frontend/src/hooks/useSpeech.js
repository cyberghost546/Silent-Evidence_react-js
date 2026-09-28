import { useState, useEffect } from 'react'


// ---------------------------------------------------------------
// Read text out loud, using the voice built into the browser
// (the Web Speech API - no server, no API key, free).
//
// Usage:
//   const { supported, speaking, current, voices, speak, stop } = useSpeech()
//
//   speak(['First paragraph.', 'Second paragraph.'])
//   speak(pieces, { voiceName: 'Google UK English Male', rate: 0.8, pitch: 0.6 })
//   stop()
//
// supported - false in the rare browser without speech: hide the button
// speaking  - true while it's talking: show "Stop" instead of "Listen"
// current   - which piece it's reading now (0, 1, 2...) - for "Paragraph 3 of 12"
// voices    - the voices this browser/computer has (they differ a lot:
//             Chrome, Edge, Safari and phones all have their own)
// ---------------------------------------------------------------

// Browsers load their voices a moment AFTER the page opens, so the
// list can be empty at first. The 'voiceschanged' event says "ready now".
function readVoices() {
    return 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []
}

export function useSpeech() {
    // Checked once. 'speechSynthesis' in window = "does this browser
    // have the speech feature at all?"
    const supported = 'speechSynthesis' in window

    const [speaking, setSpeaking] = useState(false)
    const [current, setCurrent] = useState(0)
    const [voices, setVoices] = useState(readVoices)

    useEffect(() => {
        if (!supported) return
        // Kept in a variable so the cleanup below uses the SAME object.
        const synth = window.speechSynthesis
        const update = () => setVoices(readVoices())
        synth.addEventListener('voiceschanged', update)

        // Leave the page while it's talking -> stop talking.
        // A cleanup function runs when the component using this hook
        // disappears.
        return () => {
            synth.removeEventListener('voiceschanged', update)
            synth.cancel()
        }
    }, [supported])

    // `pieces` is a list of texts. Why not one big string? Chrome's
    // voices can stop by themselves partway through very long text,
    // so it's safer to queue one short piece (paragraph) at a time.
    // speechSynthesis plays queued pieces one after another.
    //
    // options (all optional):
    //   voiceName - one of voices[].name; missing -> the browser's default
    //   rate      - speed, 1 = normal (0.5 slow ... 2 fast)
    //   pitch     - 1 = normal (0 deep ... 2 high)
    //   volume    - 0 ... 1
    function speak(pieces, options = {}) {
        if (!supported) return

        // Stop anything that's still playing first.
        window.speechSynthesis.cancel()
        const voice = voices.find(v => v.name === options.voiceName)

        pieces.forEach((text, index) => {
            const utterance = new SpeechSynthesisUtterance(text)
            if (voice) utterance.voice = voice
            utterance.rate = options.rate ?? 1
            utterance.pitch = options.pitch ?? 1
            utterance.volume = options.volume ?? 1

            // Each piece says "I'm the one playing now" when it starts.
            utterance.onstart = () => setCurrent(index)

            // When the LAST piece finishes, we're done talking.
            if (index === pieces.length - 1) {
                utterance.onend = () => setSpeaking(false)
            }

            // A real problem (no voice available, etc.) -> give up.
            // "interrupted" / "canceled" just mean WE stopped it on
            // purpose (with cancel()), so those aren't problems.
            utterance.onerror = event => {
                if (event.error !== 'interrupted' && event.error !== 'canceled') {
                    setSpeaking(false)
                }
            }

            window.speechSynthesis.speak(utterance)
        })

        setCurrent(0)
        setSpeaking(true)
    }

    function stop() {
        if (!supported) return
        window.speechSynthesis.cancel()
        setSpeaking(false)
    }

    return { supported, speaking, current, voices, speak, stop }
}
