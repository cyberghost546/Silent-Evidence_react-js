import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getTagSuggestions } from '../../api/client'


// ---------------------------------------------------------------
// The tag box on the Write a Story page:
//
//   [lighthouse ×] [vhs ×] [type a tag...          ]
//   Popular: #haunted-house  #found-footage  ...
//
// Type a word and press Enter (or comma) to add it. Up to 5.
// Suggestions come from tags other writers already use, so people
// reuse "haunted-house" instead of inventing "hauntedhouse".
//
// Usage (controlled, like SegmentedControl):
//   <TagInput tags={form.tags} onChange={newList => ...} />
// ---------------------------------------------------------------

const MAX_TAGS = 5

// The same cleaning Django does (clean_tag in stories/serializers.py),
// so what you see is what gets saved: "Cursed Object!" -> "cursed-object"
function cleanTag(text) {
    return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '')
}


function TagInput({ tags, onChange }) {
    const [text, setText] = useState('')
    const [suggestions, setSuggestions] = useState([])

    // Ask for suggestions that start with what's typed (or the most
    // popular ones when the box is empty).
    useEffect(() => {
        let ignore = false
        getTagSuggestions(cleanTag(text))
            .then(data => {
                if (!ignore) setSuggestions(data)
            })
            .catch(() => {})
        return () => {
            ignore = true
        }
    }, [text])

    function addTag(raw) {
        const tag = cleanTag(raw)
        // Nothing left after cleaning, already there, or full: skip.
        if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) {
            setText('')
            return
        }
        onChange([...tags, tag])
        setText('')
    }

    function handleKeyDown(event) {
        // Enter or comma = "this tag is done".
        if (event.key === 'Enter' || event.key === ',') {
            // Enter would otherwise submit the whole story form!
            event.preventDefault()
            addTag(text)
        }
        // Backspace in an empty box removes the last tag.
        if (event.key === 'Backspace' && text === '' && tags.length > 0) {
            onChange(tags.slice(0, -1))
        }
    }

    const isFull = tags.length >= MAX_TAGS
    // Don't suggest tags that are already added.
    const shownSuggestions = suggestions.filter(item => !tags.includes(item.name)).slice(0, 8)

    return (
        <div>
            {/* The box: chips + the input, in one bordered row.
                focus-within: the border lights up while typing. */}
            <div className='flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 focus-within:border-red-600'>
                {tags.map(tag => (
                    <span key={tag} className='flex items-center gap-1 rounded-full bg-red-950/70 py-0.5 pl-2.5 pr-1.5 text-sm text-red-200'>
                        #{tag}
                        <button type='button' onClick={() => onChange(tags.filter(t => t !== tag))} aria-label={`Remove tag ${tag}`} className='text-red-300 hover:text-white'>
                            <X className='h-3.5 w-3.5' />
                        </button>
                    </span>
                ))}
                <input
                    value={text}
                    onChange={event => setText(event.target.value)}
                    onKeyDown={handleKeyDown}
                    // Leaving the box also adds what was typed.
                    onBlur={() => text.trim() && addTag(text)}
                    disabled={isFull}
                    placeholder={isFull ? 'That is the maximum (5)' : tags.length === 0 ? 'e.g. lighthouse, vhs, cursed-object' : 'Add another...'}
                    aria-label='Add a tag'
                    className='min-w-40 flex-1 bg-transparent py-1 text-white placeholder:text-slate-500 focus:outline-none'
                />
            </div>

            {!isFull && shownSuggestions.length > 0 && (
                <p className='mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500'>
                    {text ? 'Matching:' : 'Popular:'}
                    {shownSuggestions.map(item => (
                        <button
                            key={item.name}
                            type='button'
                            onClick={() => addTag(item.name)}
                            className='rounded-full border border-slate-700 px-2 py-0.5 text-gray-300 hover:border-red-700 hover:text-white'
                        >
                            #{item.name}
                        </button>
                    ))}
                </p>
            )}
        </div>
    )
}

export default TagInput
