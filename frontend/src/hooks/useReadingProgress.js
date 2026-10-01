import { useEffect, useRef } from 'react'
import { saveReadingProgress } from '../api/client'


// ---------------------------------------------------------------
// useReadingProgress(storyId, bodyRef, enabled)
//
// Watches how far down the story you've scrolled and saves it to
// Django (for "Continue where you left off" and the homepage row).
//
//   const bodyRef = useRef(null)
//   useReadingProgress(story.id, bodyRef, Boolean(user))
//   <div ref={bodyRef}> ...the story text... </div>
//
// It does NOT send on every scroll (that could be 100 requests a
// minute): it remembers the number, and sends it every 10 seconds if
// it changed - and once more when you leave the page.
// ---------------------------------------------------------------
const SEND_EVERY = 10000   // milliseconds

export function useReadingProgress(storyId, bodyRef, enabled) {
    // useRef: remember numbers between renders WITHOUT re-drawing.
    const latest = useRef(0)   // how far you are now
    const sent = useRef(0)     // what Django last got

    useEffect(() => {
        if (!enabled) return

        // 0% = the top of the story is at the top of the screen;
        // 100% = the bottom of the story has come into view.
        function measure() {
            const body = bodyRef.current
            if (!body) return
            const box = body.getBoundingClientRect()
            const seen = window.innerHeight - box.top          // pixels of story above the screen's bottom
            const percent = Math.round((seen / box.height) * 100)
            latest.current = Math.max(0, Math.min(100, percent))
        }

        function send() {
            if (latest.current === sent.current) return   // nothing new
            sent.current = latest.current
            saveReadingProgress(storyId, latest.current).catch(() => {})
        }

        window.addEventListener('scroll', measure, { passive: true })
        const timer = setInterval(send, SEND_EVERY)
        measure()

        // Cleanup = leaving the page (or another story): send one last time.
        return () => {
            window.removeEventListener('scroll', measure)
            clearInterval(timer)
            send()
        }
    }, [storyId, bodyRef, enabled])
}
