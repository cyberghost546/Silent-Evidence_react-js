import { useEffect, useRef } from 'react'
import { makeMap, pin } from './leafletMap'


// ---------------------------------------------------------------
// "Click the map where it happened" - sets a latitude + longitude.
// Used on the Write page and the true-story form.
//
// Usage:
//   <PlacePicker latitude={form.latitude} longitude={form.longitude}
//                onPick={(lat, lng) => ...} />
//
// latitude / longitude can be '' (nothing picked yet).
// ---------------------------------------------------------------
function PlacePicker({ latitude, longitude, onPick }) {
    const boxRef = useRef(null)
    const mapRef = useRef(null)
    const pinRef = useRef(null)
    // The newest onPick, for the click handler below (it's made once).
    const onPickRef = useRef(onPick)

    useEffect(() => {
        onPickRef.current = onPick
    }, [onPick])

    // Make the map ONCE.
    useEffect(() => {
        const map = makeMap(boxRef.current)
        map.on('click', event => {
            // 6 decimals is the most the database keeps.
            onPickRef.current(event.latlng.lat.toFixed(6), event.latlng.lng.toFixed(6))
        })
        mapRef.current = map
        return () => map.remove()
    }, [])

    // Move the pin whenever the numbers change (a click, or typing).
    useEffect(() => {
        const map = mapRef.current
        if (!map) return
        pinRef.current?.remove()
        pinRef.current = null
        const lat = parseFloat(latitude)
        const lng = parseFloat(longitude)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            pinRef.current = pin([lat, lng]).addTo(map)
        }
    }, [latitude, longitude])

    return <div ref={boxRef} className='haunted-map h-64 w-full overflow-hidden rounded-lg border border-slate-700' aria-label='Map - click to set the place' />
}

export default PlacePicker
