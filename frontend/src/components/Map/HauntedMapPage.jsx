import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoryMap } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { usePageTitle } from '../../hooks/usePageTitle'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import { makeMap, pin } from './leafletMap'


// ---------------------------------------------------------------
// THE HAUNTED MAP (/map) - every story that says WHERE it happened.
// Red pins = true stories (shared anonymously; their pins are blurred
// to about 1 km). Grey = other stories with a place.
// Click a pin -> the title -> the story.
// ---------------------------------------------------------------
function HauntedMapPage() {
    usePageTitle('Haunted map')
    const navigate = useNavigate()
    const { data: pins, error } = useApi(() => getStoryMap())
    const [onlyTrue, setOnlyTrue] = useState(false)
    const boxRef = useRef(null)

    useEffect(() => {
        if (!pins || !boxRef.current) return
        const map = makeMap(boxRef.current)
        const shown = onlyTrue ? pins.filter(item => item.is_true) : pins

        for (const item of shown) {
            // The pop-up is built with DOM elements, not an HTML string -
            // titles are typed by members, and HTML from them could
            // sneak in a <script>.
            const box = document.createElement('div')
            const link = document.createElement('button')
            link.type = 'button'
            link.textContent = item.title
            link.style.cssText = 'font-weight:700;color:#b91c1c;cursor:pointer;background:none;border:0;padding:0;text-align:left'
            link.addEventListener('click', () => navigate(`/stories/${item.id}`))
            const detail = document.createElement('div')
            detail.textContent = `${item.is_true ? 'True story' : `by ${item.author}`}${item.location ? ` · ${item.location}` : ''}`
            box.append(link, detail)
            pin([item.lat, item.lng], { red: item.is_true }).bindPopup(box).addTo(map)
        }
        return () => map.remove()
    }, [pins, onlyTrue, navigate])

    const trueCount = pins?.filter(item => item.is_true).length ?? 0

    return (
        <PageLayout title='Haunted map' subtitle='Where the stories happened. Red pins are true stories.'>
            {error && <PageMessage title='Could not load the map' text={error} />}
            {pins && (
                <>
                    <div className='mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-300'>
                        <span>{pins.length} {pins.length === 1 ? 'place' : 'places'} · {trueCount} true {trueCount === 1 ? 'story' : 'stories'}</span>
                        <label className='flex cursor-pointer items-center gap-2'>
                            <input type='checkbox' checked={onlyTrue} onChange={event => setOnlyTrue(event.target.checked)} className='h-4 w-4 accent-red-600' />
                            True stories only
                        </label>
                    </div>
                    {/* Leaflet draws the map inside this box. */}
                    <div ref={boxRef} className='haunted-map h-[70vh] min-h-96 w-full overflow-hidden rounded-2xl border border-slate-800' aria-label='Map of story locations' />
                    {pins.length === 0 && <p className='mt-4 text-sm text-gray-400'>No stories with a place yet. Writers can add one on the Write page.</p>}
                </>
            )}
        </PageLayout>
    )
}

export default HauntedMapPage
