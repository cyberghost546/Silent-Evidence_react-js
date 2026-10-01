import { useState, useEffect } from 'react'


// ---------------------------------------------------------------
// useApi() - "load something from Django" in ONE line.
//
// Almost every page used to repeat the same 15 lines:
//     const [data, setData] = useState(null)
//     const [error, setError] = useState('')
//     useEffect(() => { let ignore = false; getX().then(...).catch(...);
//                       return () => { ignore = true } }, [...])
// Now it's:
//
//     const { data, error, loading, reload, setData } = useApi(() => getPolls())
//     const { data } = useApi(() => getSeries(id), [id])   // again when id changes
//
//   loader  - a function that asks Django (one from api/client.js)
//   deps    - load again when one of these changes (like useEffect)
//
// You get back:
//   data    - the answer (null until it arrives)
//   error   - Django's message, or '' when all is well
//   loading - true until the first answer (or error) arrives
//   reload  - call it to ask Django again (after saving something)
//   setData - change the data on screen yourself (e.g. mark as read)
//
// The `ignore` trick inside: if the page changes (or deps change)
// before Django answers, the OLD answer is thrown away instead of
// overwriting the new one.
// ---------------------------------------------------------------
export function useApi(loader, deps = []) {
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    // Changing this number = "run the effect again" (see reload()).
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let ignore = false
        loader()
            .then(result => {
                if (ignore) return
                setData(result)
                setError('')
            })
            .catch(err => {
                if (!ignore) setError(err?.data?.detail || 'Could not load this. Is the server running?')
            })
        return () => {
            ignore = true
        }
        // `loader` is a new function on every render, so it can't go in
        // this list (it would load forever). The CALLER lists what it
        // depends on in `deps` instead - like with useEffect itself.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, reloadKey])

    return {
        data,
        error,
        // Worked out, not stored: nothing yet and no error = still loading.
        loading: data === null && error === '',
        reload: () => setReloadKey(current => current + 1),
        setData,
    }
}
