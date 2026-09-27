import { Component } from 'react'
import { Skull } from 'lucide-react'
import { reportError } from '../../utils/errorReporting'


// ---------------------------------------------------------------
// ERROR BOUNDARY - a safety net around the pages (App.jsx).
//
// Without it, ONE crashing component makes the whole site go blank
// (white screen, no way back). With it, the visitor gets a friendly
// "something went wrong" screen, and the crash goes to the Error Log
// (Dashboard -> Error Log) so an admin can fix it.
//
// Why a CLASS component? Catching errors is the one thing React
// still only offers to classes: getDerivedStateFromError and
// componentDidCatch have no hook version (yet). Everything else in
// this project is a normal function component.
//
//   <ErrorBoundary resetKey={location.pathname}> ...pages... </ErrorBoundary>
//
// resetKey: when it changes (you open another page), the error
// screen goes away and the pages are tried again.
// ---------------------------------------------------------------
class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        // this.state = the class version of useState.
        this.state = { hasError: false }
    }

    // React calls this when a child crashes: "what should the state
    // become?" -> show the error screen.
    static getDerivedStateFromError() {
        return { hasError: true }
    }

    // ...and this one, to DO something with the error: report it.
    componentDidCatch(error, info) {
        reportError(error, info?.componentStack || '')
    }

    // A different page -> try again with a clean slate.
    componentDidUpdate(previousProps) {
        if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false })
        }
    }

    render() {
        if (!this.state.hasError) return this.props.children

        return (
            <div role='alert' className='flex min-h-[60vh] items-center justify-center bg-[#020617] px-4 py-16'>
                <div className='w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center'>
                    <Skull className='mx-auto h-12 w-12 text-red-500' />
                    <h1 className='mt-4 text-xl font-bold text-white'>Something went wrong</h1>
                    <p className='mt-2 text-sm text-gray-400'>
                        This page broke - not your fault. We've been told about it.
                    </p>
                    <div className='mt-6 flex justify-center gap-3'>
                        {/* A plain <a>, not <Link>: a full reload is the
                            surest way out of a broken state. */}
                        <button type='button' onClick={() => window.location.reload()} className='rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700'>
                            Reload the page
                        </button>
                        <a href='/' className='rounded-lg border border-slate-600 px-4 py-2 text-sm text-gray-200 hover:border-slate-400'>
                            Go to the homepage
                        </a>
                    </div>
                </div>
            </div>
        )
    }
}

export default ErrorBoundary
