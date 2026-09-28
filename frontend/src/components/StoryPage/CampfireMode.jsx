import { useState, useEffect, useRef } from 'react'
import { Flame, Volume2 } from 'lucide-react'
import { AMBIENT_SOUNDS, startAmbient } from '../../utils/ambientSound'


// ---------------------------------------------------------------
// CAMPFIRE MODE - background sound while you read (story page).
//
// Pick Rain, Wind or Fire; the sound is made in the browser
// (utils/ambientSound.js). Your pick and volume are remembered in
// localStorage, but it never starts by itself: browsers only allow
// sound after a click (nobody likes a page that suddenly makes noise).
//
// useRef keeps the audio things between renders WITHOUT re-drawing
// the component when they change (they're not something you see).
// ---------------------------------------------------------------
const SOUND_KEY = 'campfireSound'
const VOLUME_KEY = 'campfireVolume'

function load(key, fallback) {
    try {
        return localStorage.getItem(key) ?? fallback
    } catch {
        return fallback
    }
}

function save(key, value) {
    try {
        localStorage.setItem(key, value)
    } catch {
        // can't remember it - fine
    }
}


function CampfireMode() {
    const [sound, setSound] = useState(() => load(SOUND_KEY, 'rain'))
    const [volume, setVolume] = useState(() => Number(load(VOLUME_KEY, '0.4')))
    const [playing, setPlaying] = useState(false)

    const contextRef = useRef(null)   // the AudioContext (made on first play)
    const gainRef = useRef(null)      // the volume knob
    const currentRef = useRef(null)   // the sound that's playing now

    // Old browsers (and the test runner) have no Web Audio at all.
    const supported = typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext)

    function stop() {
        currentRef.current?.stop()
        currentRef.current = null
        setPlaying(false)
    }

    function play(kind) {
        if (!contextRef.current) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext
            contextRef.current = new AudioContextClass()
            gainRef.current = contextRef.current.createGain()
            gainRef.current.connect(contextRef.current.destination)
        }
        gainRef.current.gain.value = volume
        currentRef.current?.stop()
        currentRef.current = startAmbient(contextRef.current, kind, gainRef.current)
        setPlaying(true)
    }

    function pick(kind) {
        setSound(kind)
        save(SOUND_KEY, kind)
        if (playing) play(kind)   // switch sounds while playing
    }

    function changeVolume(value) {
        setVolume(value)
        save(VOLUME_KEY, String(value))
        if (gainRef.current) gainRef.current.gain.value = value
    }

    // Leaving the page: stop the sound and close the audio system.
    useEffect(() => {
        return () => {
            currentRef.current?.stop()
            contextRef.current?.close()
        }
    }, [])

    if (!supported) {
        return <p className='text-xs text-gray-500'>Campfire mode needs a newer browser.</p>
    }

    return (
        <div className='flex flex-wrap items-center gap-3 rounded-xl border border-orange-900/50 bg-orange-950/20 px-4 py-3'>
            <button
                type='button'
                onClick={() => (playing ? stop() : play(sound))}
                aria-pressed={playing}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    playing ? 'bg-orange-600 text-white' : 'border border-orange-800 text-orange-200 hover:bg-orange-950/60'
                }`}
            >
                <Flame className='h-4 w-4' />
                {playing ? 'Campfire mode: on' : 'Campfire mode'}
            </button>

            <div role='group' aria-label='Background sound' className='flex gap-1'>
                {AMBIENT_SOUNDS.map(option => (
                    <button
                        key={option.value}
                        type='button'
                        onClick={() => pick(option.value)}
                        aria-pressed={sound === option.value}
                        className={`rounded-md px-2.5 py-1 text-sm ${sound === option.value ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        <span aria-hidden='true'>{option.emoji}</span> {option.label}
                    </button>
                ))}
            </div>

            <label className='flex items-center gap-2 text-sm text-gray-400'>
                <Volume2 className='h-4 w-4' />
                <span className='sr-only'>Volume</span>
                <input
                    type='range'
                    min='0'
                    max='1'
                    step='0.05'
                    value={volume}
                    onChange={event => changeVolume(Number(event.target.value))}
                    className='w-24 accent-orange-500'
                />
            </label>
        </div>
    )
}

export default CampfireMode
