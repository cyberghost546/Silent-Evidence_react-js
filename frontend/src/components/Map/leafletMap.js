import L from 'leaflet'
import 'leaflet/dist/leaflet.css'


// ---------------------------------------------------------------
// Shared set-up for our maps (the Haunted Map and the place picker).
// Leaflet is a map library; the map pictures ("tiles") come from
// OpenStreetMap, which is free - but it must be credited on the map
// (that's the attribution line), and it asks sites not to overload it.
//
// Leaflet isn't a React library: it draws into a <div> itself. So we
// make the map in a useEffect, on a ref to that div, and remove it in
// the cleanup (see HauntedMapPage.jsx / PlacePicker.jsx).
// ---------------------------------------------------------------
export function makeMap(element, { center = [30, 0], zoom = 2 } = {}) {
    const map = L.map(element, { worldCopyJump: true }).setView(center, zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    return map
}

// A round pin. circleMarker (not L.marker) = no picture files needed.
export function pin(latlng, { red = true } = {}) {
    return L.circleMarker(latlng, {
        radius: 8,
        color: red ? '#fecaca' : '#cbd5e1',
        weight: 2,
        fillColor: red ? '#dc2626' : '#64748b',
        fillOpacity: 0.9,
    })
}
