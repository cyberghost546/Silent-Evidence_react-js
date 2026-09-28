import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StoryBody from './StoryBody'


// A choose-your-path story, played the way a reader would.
const STORY = [
    'You stand at the cellar door.',
    '[[choice: Open the door -> cellar]]',
    '[[choice: Run upstairs -> upstairs]]',
    '',
    '[[section: cellar]]',
    'The stairs go down too far.',
    '',
    '[[section: upstairs]]',
    'You lock the bathroom door.',
].join('\n')

describe('choose-your-path stories', () => {
    it('shows one section at a time and follows the choices', async () => {
        render(<StoryBody body={STORY} />)
        expect(screen.getByText('You stand at the cellar door.')).toBeInTheDocument()
        expect(screen.queryByText('The stairs go down too far.')).not.toBeInTheDocument()
        expect(screen.queryByText(/\[\[/)).not.toBeInTheDocument()   // the marks never show

        await userEvent.click(screen.getByRole('button', { name: 'Open the door' }))
        expect(screen.getByText('The stairs go down too far.')).toBeInTheDocument()
        expect(screen.getByText('~ The End ~')).toBeInTheDocument()   // no choices = an ending

        await userEvent.click(screen.getByRole('button', { name: /Back/ }))
        await userEvent.click(screen.getByRole('button', { name: 'Run upstairs' }))
        expect(screen.getByText('You lock the bathroom door.')).toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: /Start over/ }))
        expect(screen.getByText('You stand at the cellar door.')).toBeInTheDocument()
    })

    it("the writer's preview points out broken choices", () => {
        render(<StoryBody body={'Hi.\n[[choice: Jump -> nowhere]]\n[[section: a]]\nx'} showProblems />)
        expect(screen.getByText(/goes to "nowhere"/)).toBeInTheDocument()
    })

    it('a normal story is untouched', () => {
        render(<StoryBody body={'Just a story.\n\nTwo paragraphs.'} />)
        expect(screen.queryByText(/Choose your path/)).not.toBeInTheDocument()
    })
})
