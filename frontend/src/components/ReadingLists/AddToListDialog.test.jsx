import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddToListDialog from './AddToListDialog'
import { getMyReadingLists, addToReadingList, removeFromReadingList, createReadingList } from '../../api/client'


// The "Add to a reading list" pop-up. Django is faked (vi.mock).
vi.mock('../../api/client', () => ({
    getMyReadingLists: vi.fn(),
    addToReadingList: vi.fn(() => Promise.resolve({ added: true })),
    removeFromReadingList: vi.fn(() => Promise.resolve(null)),
    createReadingList: vi.fn(),
}))

const LISTS = [
    { id: 1, title: 'Winter reads', is_public: true, story_count: 2, has_story: false },
    { id: 2, title: 'Too scary', is_public: false, story_count: 1, has_story: true },
]

describe('AddToListDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        getMyReadingLists.mockResolvedValue(LISTS)
    })

    it('asks Django which lists hold this story, and ticks them', async () => {
        render(<AddToListDialog storyId={7} onClose={() => {}} />)
        expect(await screen.findByRole('button', { name: /Too scary/ })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: /Winter reads/ })).toHaveAttribute('aria-pressed', 'false')
        expect(getMyReadingLists).toHaveBeenCalledWith(7)
    })

    it('clicking a list adds or removes the story', async () => {
        render(<AddToListDialog storyId={7} onClose={() => {}} />)
        await userEvent.click(await screen.findByRole('button', { name: /Winter reads/ }))
        expect(addToReadingList).toHaveBeenCalledWith(1, 7)
        expect(screen.getByRole('button', { name: /Winter reads/ })).toHaveAttribute('aria-pressed', 'true')

        await userEvent.click(screen.getByRole('button', { name: /Too scary/ }))
        expect(removeFromReadingList).toHaveBeenCalledWith(2, 7)
    })

    it('makes a new list with the story already in it', async () => {
        createReadingList.mockResolvedValue({ id: 3, title: 'Campfire', is_public: true, story_count: 0 })
        render(<AddToListDialog storyId={7} onClose={() => {}} />)
        await userEvent.type(await screen.findByLabelText('New list name'), 'Campfire')
        await userEvent.click(screen.getByRole('button', { name: 'Make list' }))
        expect(createReadingList).toHaveBeenCalledWith({ title: 'Campfire', is_public: true })
        expect(addToReadingList).toHaveBeenCalledWith(3, 7)
        expect(await screen.findByRole('button', { name: /Campfire/ })).toHaveAttribute('aria-pressed', 'true')
    })
})
