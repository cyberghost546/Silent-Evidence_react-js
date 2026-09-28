import { useState } from 'react'
import { Volume2, Square, Maximize, SlidersHorizontal } from 'lucide-react'
import { useSpeech } from '../../hooks/useSpeech'
import { NARRATOR_STYLES, loadNarrator, saveNarrator, speechOptions } from './narrator'
import SegmentedControl from '../SegmentedControl/SegmentedControl'


// The three text sizes. The values match SIZE_CLASSES in StoryBody.
// Each label is a letter "A" drawn a bit bigger than the last.
const SIZE_OPTIONS = [
    { value: 'normal', label: <span className='text-xs'>A</span>, ariaLabel: 'Normal text' },
    { value: 'large', label: <span className='text-sm'>A</span>, ariaLabel: 'Large text' },
    { value: 'xlarge', label: <span className='text-base'>A</span>, ariaLabel: 'Extra large text' },
]

const TOOL_BUTTON = 'inline-flex items-center gap-1.5 rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-500 hover:text-white'


// ---------------------------------------------------------------
// The row of reading tools under the story's intro:
//   [Listen] [⚙] [Focus]                            [A A A]
//
// ⚙ opens the NARRATOR panel: which voice, and a style (Normal,
// Creepy whisper, Fast). The choice is remembered (narrator.js).
//
// Props:
//   speechPieces     - the texts to read out loud (a list)
//   onFocus          - called when "Focus" is clicked
//   textSize         - 'normal' | 'large' | 'xlarge'
//   onTextSizeChange - called with the new size
//
// The toolbar doesn't own the text size - StoryPage does, because
// the story text AND Focus mode both need to know it.
// ---------------------------------------------------------------
function ReadingToolbar({ speechPieces, onFocus, textSize, onTextSizeChange }) {
    const { supported, speaking, current, voices, speak, stop } = useSpeech()
    const [narrator, setNarrator] = useState(loadNarrator)
    const [showNarrator, setShowNarrator] = useState(false)

    // Change one setting, remember it, and restart the reading so you
    // hear the difference straight away.
    function changeNarrator(change) {
        const next = { ...narrator, ...change }
        setNarrator(next)
        saveNarrator(next)
        if (speaking) speak(speechPieces.slice(current), speechOptions(next))
    }

    // English voices first - the stories are in English. Some
    // computers have 100+ voices in every language.
    const englishVoices = voices.filter(voice => voice.lang.startsWith('en'))

    return (
        <div className='border-y border-gray-800 py-3'>
            {/* flex-wrap: on a phone the size buttons drop to a second line
                instead of squashing everything. */}
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='flex flex-wrap items-center gap-2'>
                    {/* No speech in this browser -> no button, rather than
                        a button that does nothing. */}
                    {supported && (
                        <button
                            type='button'
                            onClick={() => (speaking ? stop() : speak(speechPieces, speechOptions(narrator)))}
                            aria-pressed={speaking}
                            className={TOOL_BUTTON}
                        >
                            {speaking ? <Square className='h-3.5 w-3.5' /> : <Volume2 className='h-3.5 w-3.5' />}
                            {speaking ? 'Stop' : 'Listen'}
                        </button>
                    )}
                    {supported && (
                        <button
                            type='button'
                            onClick={() => setShowNarrator(!showNarrator)}
                            aria-expanded={showNarrator}
                            aria-label='Narrator settings'
                            className={TOOL_BUTTON}
                        >
                            <SlidersHorizontal className='h-3.5 w-3.5' />
                        </button>
                    )}

                    <button type='button' onClick={onFocus} className={TOOL_BUTTON}>
                        <Maximize className='h-3.5 w-3.5' />
                        Focus
                    </button>
                </div>

                <div className='flex items-center gap-2 text-xs text-gray-400'>
                    Text size
                    <SegmentedControl label='Text size' options={SIZE_OPTIONS} value={textSize} onChange={onTextSizeChange} />
                </div>
            </div>

            {/* Where it is while reading: "Paragraph 3 of 12". */}
            {speaking && speechPieces.length > 1 && (
                <p className='mt-2 text-xs text-gray-400' aria-live='polite'>Paragraph {current + 1} of {speechPieces.length}</p>
            )}

            {/* ---------- NARRATOR PANEL ---------- */}
            {showNarrator && (
                <div className='mt-3 flex flex-wrap items-end gap-4 rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-xs'>
                    <div>
                        <p className='mb-1 text-gray-400'>Style</p>
                        <div className='flex gap-1'>
                            {NARRATOR_STYLES.map(style => (
                                <button
                                    key={style.key}
                                    type='button'
                                    onClick={() => changeNarrator({ style: style.key })}
                                    aria-pressed={narrator.style === style.key}
                                    className={`rounded-md border px-2.5 py-1 ${narrator.style === style.key ? 'border-red-600 bg-red-950/50 text-white' : 'border-gray-700 text-gray-300 hover:text-white'}`}
                                >
                                    {style.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {englishVoices.length > 0 && (
                        <div>
                            <label htmlFor='narrator-voice' className='mb-1 block text-gray-400'>Voice</label>
                            <select
                                id='narrator-voice'
                                value={narrator.voiceName}
                                onChange={event => changeNarrator({ voiceName: event.target.value })}
                                className='rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-gray-200 [color-scheme:dark]'
                            >
                                <option value=''>Browser default</option>
                                {englishVoices.map(voice => <option key={voice.name} value={voice.name}>{voice.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default ReadingToolbar
