import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Star, ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import { getFeaturedAuthors, addFeaturedAuthor, updateFeaturedAuthor, removeFeaturedAuthor } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> FEATURED AUTHORS (/dashboard/featured-authors).
//
// The homepage's "Authors to Follow" row normally shows the writers
// with the most stories. Writers you feature here come FIRST, in
// this order (use the arrows), with a gold border and your one-line
// blurb under their name.
// ---------------------------------------------------------------
function FeaturedAuthorsDashboard() {
    const [authors, setAuthors] = useState(null)
    const [username, setUsername] = useState('')
    const [blurb, setBlurb] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        getFeaturedAuthors()
            .then(data => setAuthors(data))
            .catch(() => setError('Could not load the featured authors.'))
    }, [])

    async function handleAdd(event) {
        event.preventDefault()
        setError('')
        try {
            // Django answers with the whole new list.
            setAuthors(await addFeaturedAuthor(username.trim(), blurb.trim()))
            setUsername('')
            setBlurb('')
        } catch (err) {
            setError(err.data?.detail || 'Could not add them.')
        }
    }

    async function move(author, direction) {
        setAuthors(await updateFeaturedAuthor(author.id, { move: direction }))
    }

    async function saveBlurb(author, newBlurb) {
        // Only when it really changed (onBlur fires on every click away).
        if (newBlurb === author.blurb) return
        setAuthors(await updateFeaturedAuthor(author.id, { blurb: newBlurb }))
    }

    async function remove(author) {
        await removeFeaturedAuthor(author.id)
        setAuthors(authors.filter(item => item.id !== author.id))
    }

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Star className='h-7 w-7 text-yellow-400' />
                Featured Authors
            </h1>
            <p className='mt-1 text-gray-400'>Shown first in the homepage's "Authors to Follow" row, in this order.</p>

            <PageMessages error={error} notice='' />

            <form onSubmit={handleAdd} className='mt-6 flex flex-wrap gap-2'>
                <input value={username} onChange={event => setUsername(event.target.value)} placeholder='Username' aria-label='Username' className={`${INPUT_STYLE} sm:w-48`} />
                <input value={blurb} onChange={event => setBlurb(event.target.value)} maxLength={120} placeholder='One line about them (optional)' aria-label='Blurb' className={`${INPUT_STYLE} min-w-0 flex-1`} />
                <button type='submit' disabled={!username.trim()} className={BUTTON_STYLE}>Feature</button>
            </form>

            <ol className='mt-6 space-y-2'>
                {authors?.length === 0 && <li className='text-sm text-gray-500'>Nobody featured - the row shows the busiest writers.</li>}
                {authors?.map((author, index) => (
                    <li key={author.id} className='flex items-center gap-3 rounded-xl border border-yellow-900/50 bg-slate-900/60 px-4 py-3'>
                        <span className='w-5 text-sm text-gray-500'>{index + 1}.</span>
                        <div className='min-w-0 flex-1'>
                            <Link to={`/profile/${author.username}`} className='font-semibold text-white hover:text-yellow-300'>{author.username}</Link>
                            <span className='ml-2 text-xs text-gray-500'>{author.story_count} published</span>
                            {/* The blurb can be edited in place; it saves
                                when you click away (onBlur). defaultValue
                                (not value) = the box keeps its own text. */}
                            <input
                                defaultValue={author.blurb}
                                onBlur={event => saveBlurb(author, event.target.value.trim())}
                                maxLength={120}
                                placeholder='Add a one-liner...'
                                aria-label={`Blurb for ${author.username}`}
                                className='mt-1 block w-full bg-transparent text-sm italic text-yellow-200/90 placeholder:text-slate-600 focus:outline-none'
                            />
                        </div>
                        <button type='button' onClick={() => move(author, 'up')} disabled={index === 0} aria-label='Move up' className='text-gray-400 hover:text-white disabled:opacity-30'>
                            <ArrowUp className='h-4 w-4' />
                        </button>
                        <button type='button' onClick={() => move(author, 'down')} disabled={index === authors.length - 1} aria-label='Move down' className='text-gray-400 hover:text-white disabled:opacity-30'>
                            <ArrowDown className='h-4 w-4' />
                        </button>
                        <button type='button' onClick={() => remove(author)} aria-label='Stop featuring' className='text-gray-500 hover:text-red-400'>
                            <Trash2 className='h-4 w-4' />
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    )
}

export default FeaturedAuthorsDashboard
