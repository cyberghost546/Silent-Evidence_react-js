import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useApi } from './useApi'


// ---------------------------------------------------------------
// Testing a HOOK: renderHook() runs it inside a tiny pretend
// component, and result.current is what the hook returned.
// waitFor() keeps checking until the (pretend) answer has arrived.
// ---------------------------------------------------------------
describe('useApi', () => {
    it('is loading first, then has the data', async () => {
        const loader = vi.fn().mockResolvedValue(['a poll'])
        const { result } = renderHook(() => useApi(loader))

        expect(result.current.loading).toBe(true)
        await waitFor(() => expect(result.current.data).toEqual(['a poll']))
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe('')
    })

    it("gives Django's error message", async () => {
        const loader = vi.fn().mockRejectedValue({ data: { detail: 'Not allowed.' } })
        const { result } = renderHook(() => useApi(loader))

        await waitFor(() => expect(result.current.error).toBe('Not allowed.'))
        expect(result.current.loading).toBe(false)
    })

    it('reload() asks again', async () => {
        const loader = vi.fn()
            .mockResolvedValueOnce('first answer')
            .mockResolvedValueOnce('second answer')
        const { result } = renderHook(() => useApi(loader))
        await waitFor(() => expect(result.current.data).toBe('first answer'))

        // act() = "this changes state - update the hook first".
        act(() => result.current.reload())
        await waitFor(() => expect(result.current.data).toBe('second answer'))
        expect(loader).toHaveBeenCalledTimes(2)
    })

    it('loads again when a dependency changes', async () => {
        const loader = vi.fn(id => Promise.resolve(`story ${id}`))
        const { result, rerender } = renderHook(({ id }) => useApi(() => loader(id), [id]), { initialProps: { id: 1 } })
        await waitFor(() => expect(result.current.data).toBe('story 1'))

        rerender({ id: 2 })
        await waitFor(() => expect(result.current.data).toBe('story 2'))
    })
})
