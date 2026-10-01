import { describe, it, expect } from 'vitest'
import { parseStory, stripFormatting, countWords, countScares } from './storyFormat'


describe('jump-scare marks', () => {
    const story = 'The hall was quiet.\n\n!!scare\n\nSomething grabbed my ankle.\n\n!!SCARE\n\nThe end.'

    it('become their own block', () => {
        expect(parseStory(story).map(block => block.type)).toEqual(['paragraph', 'scare', 'paragraph', 'scare', 'paragraph'])
    })

    it('are counted, and upper/lower case both work', () => {
        expect(countScares(story)).toBe(2)
        expect(countScares('No scares here.')).toBe(0)
    })

    it('are never read out loud or counted as words', () => {
        expect(stripFormatting(story)).not.toMatch(/scare/i)
        expect(countWords(story)).toBe(10)
    })

    it('only count on a line of their own', () => {
        expect(countScares('She typed !!scare in the middle of a line.')).toBe(0)
    })
})
