import { useState, useEffect, useRef } from 'react'
import { getSlides, mediaUrl } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'


// Shared look for the "Loading / error / no slides" boxes, so all
// three are the same size as the real slideshow and the page doesn't
// jump around when the slides arrive.
const MESSAGE_BOX = 'h-125 flex flex-col items-center justify-center gap-3 text-white'


// interval = how many milliseconds each slide stays on screen.
// "= 5000" is a default value: <SlideShow /> gets 5 seconds, but
// another page can do <SlideShow interval={8000} /> without touching
// this file.
function SlideShow({ interval = 5000 }) {
    // The slides from the API. Starts as [] - NOT null - because the
    // first render happens before the data arrives, and we need
    // something we can safely call .length on.
    const [slides, setSlides] = useState([])

    // The whole slideshow is one number: which slide is showing.
    const [index, setIndex] = useState(0)

    // Is the auto-advance running? The pause button flips this.
    const [playing, setPlaying] = useState(true)

    // SWIPING (phones). Where the finger went DOWN, so when it comes
    // back up we can see which way it moved.
    // useRef, not useState: changing it shouldn't redraw anything -
    // it's just a note to ourselves between two events.
    const touchStartX = useRef(null)

    // Before, "no slides" and "still loading" looked the same - an
    // empty array - so an empty database showed "Loading..." forever.
    // Two extra pieces of state let us tell the cases apart.
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        getSlides()
            .then(data => setSlides(data))
            .catch(err => {
                console.error('Could not load slides:', err)
                setError('Could not load slides. Is the Django server running?')
            })
            // .finally runs after .then OR .catch - either way, we're
            // done loading.
            .finally(() => setLoading(false))

        // The empty [] means "run once, after the first render".
        // Leave it off and the fetch sets state, which re-renders,
        // which fetches again - an infinite loop.
    }, [])

    // AUTOPLAY.
    // Every time the index changes, start a fresh timer that moves to
    // the next slide. Because `index` is in the [] list, clicking an
    // arrow or a dot restarts the countdown - so you never get a slide
    // that flips away one second after you picked it.
    useEffect(() => {
        // Nothing to do if paused, or if there's only 0-1 slides.
        if (!playing || slides.length < 2) return

        const timer = setTimeout(() => {
            setIndex(i => (i + 1) % slides.length)
        }, interval)

        // Cleanup: cancel the old timer before starting a new one.
        // Without this, timers pile up and the slides start racing.
        return () => clearTimeout(timer)
    }, [index, playing, slides.length, interval])

    // % (remainder) is what makes it wrap around. With 3 slides:
    // 1%3=1, 2%3=2, 3%3=0 - back to the start. Without it, index runs
    // past the end and slides[3] is undefined.
    function next() {
        setIndex(i => (i + 1) % slides.length)
    }

    // Backwards needs the extra "+ slides.length" because in JavaScript
    // -1 % 3 is -1, not 2.
    function prev() {
        setIndex(i => (i - 1 + slides.length) % slides.length)
    }

    // Finger down: remember where (touches[0] = the first finger).
    function handleTouchStart(event) {
        touchStartX.current = event.touches[0].clientX
    }

    // Finger up: how far did it move sideways? changedTouches = the
    // finger that just lifted. More than 50px = a swipe (less is
    // probably just a tap). Swipe left = next slide, like a phone's
    // photo gallery.
    function handleTouchEnd(event) {
        if (touchStartX.current === null) return
        const distance = event.changedTouches[0].clientX - touchStartX.current
        touchStartX.current = null

        if (distance < -50) next()
        else if (distance > 50) prev()
    }

    // These early returns have to come AFTER all the useState/useEffect
    // calls above. React counts hooks by their order, so a hook can
    // never be skipped by an early return. (The "rules of hooks".)
    if (loading) {
        return <div className={MESSAGE_BOX}>Loading...</div>
    }

    if (error) {
        return <div className={MESSAGE_BOX}>{error}</div>
    }

    if (slides.length === 0) {
        // Visitors and members: no slides = no slideshow at all (a
        // big grey box saying "add one in the dashboard" means
        // nothing to them). Only admins get the reminder.
        if (!user?.is_staff) return null
        return (
            <div className={MESSAGE_BOX}>
                <p>No slides yet.</p>
                <a href='/dashboard/slides' className='bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium'>
                    Add one in the dashboard
                </a>
            </div>
        )
    }

    const slide = slides[index]

    return (
        // relative = positioning anchor for the arrows and dots below.
        // overflow-hidden crops the image to this box.
        //
        // PHONES: a rounded card with a gap at the sides (mx-3,
        // rounded-3xl - the gap on top is HomePage's pt-3), and shorter (h-72 = 288px) - a full-height
        // slideshow filled the whole phone screen. You swipe it
        // (onTouchStart / onTouchEnd below).
        // From "sm" up: full width and 500px tall, like before.
        <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className='relative mx-3 h-72 overflow-hidden rounded-3xl sm:mx-0 sm:h-125 sm:rounded-none'
        >

            {/* object-cover fills the box without squashing the photo. */}
            <img
                src={mediaUrl(slide.image)}
                alt={slide.title}
                className='w-full h-full object-cover'
            />

            {/* Caption over the image. The gradient keeps white text
                readable no matter how light the photo is. */}
            {/* pb-10 on phones leaves room for the dots under the text. */}
            <div className='absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-5 pb-10 sm:p-8'>
                <h2 className='text-2xl font-bold text-white sm:text-3xl'>{slide.title}</h2>
                <p className='line-clamp-2 text-sm text-gray-200 sm:text-base'>{slide.description}</p>
            </div>

            {/* top-1/2 + -translate-y-1/2 is the standard way to centre
                something vertically: move it down half the parent, then
                back up half its own height.
                aria-label matters here - the button is just an arrow
                character, so a screen reader would otherwise get nothing. */}
            <button
                onClick={prev}
                aria-label='Previous slide'
                // hidden sm:flex: no arrows on phones - you swipe there.
                className='absolute left-4 hidden sm:flex top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 items-center justify-center'
            >
                &#8249;
            </button>

            <button
                onClick={next}
                aria-label='Next slide'
                className='absolute right-4 hidden sm:flex top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 items-center justify-center'
            >
                &#8250;
            </button>

            {/* Play / pause. The ternaries pick the icon and the label
                from the same `playing` value, so they can't disagree. */}
            <button
                onClick={() => setPlaying(p => !p)}
                aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
                className='absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center text-sm'
            >
                {playing ? '❚❚' : '▶'}
            </button>

            {/* The dots. map's second argument is the position, which is
                exactly what we set the index to on click.
                key is required - React uses it to track which element is
                which between renders. Use the database id, never the
                array position. */}
            <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2'>
                {slides.map((s, i) => (
                    <button
                        key={s.id}
                        onClick={() => setIndex(i)}
                        aria-label={`Go to slide ${i + 1}`}
                        className={`w-3 h-3 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'}`}
                    />
                ))}
            </div>
        </div>
    )
}

export default SlideShow
