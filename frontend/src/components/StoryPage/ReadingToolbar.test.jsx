import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReadingToolbar from './ReadingToolbar'


// ---------------------------------------------------------------
// The reading toolbar's Listen button + narrator settings.
//
// The test browser (jsdom) has no speech, so we make a FAKE one:
// window.speechSynthesis with speak/cancel/getVoices, and a fake
// SpeechSynthesisUtterance that just remembers its settings.
// ---------------------------------------------------------------
const VOICES = [
    { name: 'Deep British', lang: 'en-GB' },
    { name: 'Voix française', lang: 'fr-FR' },
]
let spoken

beforeEach(() => {
    spoken = []
    localStorage.clear()
    window.speechSynthesis = {
        speak: utterance => spoken.push(utterance),
        cancel: vi.fn(),
        getVoices: () => VOICES,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }
    window.SpeechSynthesisUtterance = function (text) {
        this.text = text
    }
})

afterEach(() => {
    delete window.speechSynthesis
    delete window.SpeechSynthesisUtterance
})

function renderToolbar() {
    render(<ReadingToolbar speechPieces={['One.', 'Two.']} onFocus={() => {}} textSize='normal' onTextSizeChange={() => {}} />)
}


describe('ReadingToolbar narrator', () => {
    it('reads every paragraph in the normal voice', async () => {
        renderToolbar()
        await userEvent.click(screen.getByRole('button', { name: 'Listen' }))
        expect(spoken.map(u => u.text)).toEqual(['One.', 'Two.'])
        expect(spoken[0].rate).toBe(1)
        expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
    })

    it('uses the chosen style and voice, and remembers them', async () => {
        renderToolbar()
        await userEvent.click(screen.getByRole('button', { name: 'Narrator settings' }))
        await userEvent.click(screen.getByRole('button', { name: 'Creepy whisper' }))

        // Only English voices are offered.
        const select = screen.getByLabelText('Voice')
        expect(screen.queryByRole('option', { name: 'Voix française' })).not.toBeInTheDocument()
        await userEvent.selectOptions(select, 'Deep British')

        await userEvent.click(screen.getByRole('button', { name: 'Listen' }))
        expect(spoken[0].rate).toBe(0.75)
        expect(spoken[0].pitch).toBe(0.5)
        expect(spoken[0].voice.name).toBe('Deep British')
        expect(JSON.parse(localStorage.getItem('narrator'))).toEqual({ style: 'whisper', voiceName: 'Deep British' })
    })
})
