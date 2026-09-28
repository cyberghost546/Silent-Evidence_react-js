import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SpoilerText from './SpoilerText'
import { splitSpoilers } from '../../utils/spoilers'


describe('splitSpoilers', () => {
    it('finds the ||hidden|| parts', () => {
        expect(splitSpoilers('The killer was ||the narrator|| all along.')).toEqual([
            { spoiler: false, text: 'The killer was ' },
            { spoiler: true, text: 'the narrator' },
            { spoiler: false, text: ' all along.' },
        ])
    })

    it('leaves text without spoilers alone', () => {
        expect(splitSpoilers('Just a comment | with a bar.')).toEqual([{ spoiler: false, text: 'Just a comment | with a bar.' }])
        expect(splitSpoilers('||||')).toEqual([{ spoiler: false, text: '||||' }])   // nothing inside = not a spoiler
    })
})

describe('SpoilerText', () => {
    it('hides the spoiler until it is clicked', async () => {
        render(<p><SpoilerText text='It was ||the dog|| barking.' /></p>)
        const hidden = screen.getByRole('button', { name: 'Spoiler - click to show' })
        await userEvent.click(hidden)
        expect(screen.queryByRole('button', { name: 'Spoiler - click to show' })).not.toBeInTheDocument()
        expect(screen.getByText('the dog')).toBeInTheDocument()
    })
})
