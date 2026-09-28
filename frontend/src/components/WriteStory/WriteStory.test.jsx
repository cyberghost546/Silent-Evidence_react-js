import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import WriteStory from './WriteStory'
import { getCategories, createStory, importDocx } from '../../api/client'


// ---------------------------------------------------------------
// The Write a Story page - the biggest form on the site.
// Django is faked (vi.mock), see Comments.test.jsx for how.
// ---------------------------------------------------------------
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user: { username: 'raven' } }),
}))
// EVERY api function the page and its pieces use (PromptBox, TagInput,
// SeriesPicker ask Django too). The ones this test doesn't care about
// answer "nothing" - but still as a Promise, like the real ones.
vi.mock('../../api/client', () => ({
    getCategories: vi.fn(),
    createStory: vi.fn(),
    importDocx: vi.fn(),
    getRandomPrompt: vi.fn(() => Promise.resolve(null)),
    getTagSuggestions: vi.fn(() => Promise.resolve([])),
    getMySeries: vi.fn(() => Promise.resolve([])),
    createSeries: vi.fn(),
}))

function renderWritePage(path = '/write') {
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path='/write' element={<WriteStory />} />
                <Route path='/stories/:id' element={<p>The story page</p>} />
            </Routes>
        </MemoryRouter>
    )
}


describe('Write a Story', () => {
    beforeEach(() => {
        // The page saves a draft in localStorage while you type -
        // start every test with no draft.
        localStorage.clear()
        getCategories.mockResolvedValue([{ id: 3, name: 'Haunted Houses', slug: 'haunted-houses' }])
        createStory.mockReset()
    })

    it('text shared from another app lands in the story (Share menu)', async () => {
        renderWritePage('/write?title=The%20Knock&text=It%20started%20at%203am.&url=https%3A%2F%2Fexample.com%2Fnote')
        expect(screen.getByLabelText(/^Title/)).toHaveValue('The Knock')
        expect(document.getElementById('body').value).toBe('It started at 3am.\n\nhttps://example.com/note')
    })

    it('shared text is added AFTER a draft you already had', async () => {
        localStorage.setItem('writeStoryDraft:raven', JSON.stringify({ title: 'Mine', body: 'My draft.' }))
        renderWritePage('/write?text=More%20ideas')
        expect(screen.getByLabelText(/^Title/)).toHaveValue('Mine')
        expect(document.getElementById('body').value).toBe('My draft.\n\nMore ideas')
    })

    it('imports a Word document into the story', async () => {
        importDocx.mockResolvedValue({ title: 'The Lighthouse', body: 'The lamp was **still turning**.' })
        renderWritePage()
        const file = new File(['fake'], 'story.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        await userEvent.upload(screen.getByLabelText('Import from Word'), file)
        expect(importDocx).toHaveBeenCalledWith(file)
        expect(await screen.findByDisplayValue('The Lighthouse')).toBeInTheDocument()
        expect(document.getElementById('body').value).toBe('The lamp was **still turning**.')
    })

    it('lists what is missing instead of sending an empty story', async () => {
        renderWritePage()
        await userEvent.click(screen.getByRole('button', { name: 'Publish Story' }))

        expect(screen.getByText('Give your story a title.')).toBeInTheDocument()
        expect(screen.getByText('Pick a category.')).toBeInTheDocument()
        expect(screen.getByText('Your story is empty.')).toBeInTheDocument()
        expect(createStory).not.toHaveBeenCalled()
    })

    it('sends the story to Django and opens it', async () => {
        createStory.mockResolvedValue({ id: 42 })
        renderWritePage()

        await userEvent.type(screen.getByLabelText(/^Title/), 'The House on Wren Street')
        // findBy: the categories arrive a moment later (a fake request).
        await userEvent.selectOptions(await screen.findByLabelText(/^Category/), '3')
        await userEvent.type(screen.getByLabelText(/^Your Story/), 'It began at midnight.')
        await userEvent.click(screen.getByRole('button', { name: 'Publish Story' }))

        // What was sent: FormData, so we read it with .get().
        const sent = createStory.mock.calls[0][0]
        expect(sent.get('title')).toBe('The House on Wren Street')
        expect(sent.get('category')).toBe('3')
        expect(sent.get('body')).toBe('It began at midnight.')

        expect(await screen.findByText('The story page')).toBeInTheDocument()
    })

    it("shows Django's reason under the right box", async () => {
        createStory.mockRejectedValue({ data: { title: ['A story with this title already exists.'] } })
        renderWritePage()

        await userEvent.type(screen.getByLabelText(/^Title/), 'Fog')
        await userEvent.selectOptions(await screen.findByLabelText(/^Category/), '3')
        await userEvent.type(screen.getByLabelText(/^Your Story/), 'Text.')
        await userEvent.click(screen.getByRole('button', { name: 'Publish Story' }))

        expect(await screen.findByText('A story with this title already exists.')).toBeInTheDocument()
    })
})
