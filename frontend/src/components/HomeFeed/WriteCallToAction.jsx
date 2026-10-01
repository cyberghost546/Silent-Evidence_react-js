import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'


// ---------------------------------------------------------------
// "DO YOU HAVE A STORY TO TELL?" - the big banner that invites
// people to write.
//
// Logged out: two buttons - Create a free account + Start writing.
// Logged in:  only Start writing (they already have an account).
// "Start writing now" goes to /write either way; if you're logged
// out, ProtectedRoute sends you to Log In first and back afterwards.
//
// Usage:
//   <WriteCallToAction />
// ---------------------------------------------------------------
function WriteCallToAction() {
    const { user } = useAuth()

    return (
        // The soft red glow on the left is a radial-gradient: a circle
        // of dark red at 0% across / 50% down that fades to transparent.
        // Tailwind lets you write any CSS value inside [ ]; spaces
        // become underscores (_) because a class can't contain spaces.
        <section className='border-y border-slate-800 bg-slate-950 bg-[radial-gradient(circle_at_0%_50%,rgba(153,27,27,0.35),transparent_45%)] px-4 py-20 text-center'>

            {/* The pencil in a rounded dark-red square. */}
            <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-900/60 bg-red-950/60'>
                <Pencil className='h-6 w-6 text-red-500' />
            </div>

            <h2 className='mt-8 text-4xl font-bold text-white sm:text-5xl'>Do you have a story to tell?</h2>

            <p className='mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-400'>
                A night you can't explain. A case no one solved. A legend from your hometown.
                Silent Evidence is the place to share it.
            </p>

            {/* flex-wrap: on a phone the buttons go under each other. */}
            <div className='mt-10 flex flex-wrap justify-center gap-4'>
                {!user && (
                    <Link
                        to='/signup'
                        className='rounded-xl bg-red-700 px-10 py-4 font-bold text-white shadow-lg shadow-red-900/40 transition-colors hover:bg-red-600'
                    >
                        Create a free account
                    </Link>
                )}

                <Link
                    to='/write'
                    className='rounded-xl border border-slate-700 bg-slate-800 px-10 py-4 font-bold text-white transition-colors hover:border-slate-500'
                >
                    Start writing now
                </Link>
            </div>

            <p className='mt-10 text-sm text-slate-400'>Free to join · No ads · Your stories, your rights</p>
        </section>
    )
}

export default WriteCallToAction
