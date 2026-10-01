import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { verifyEmail } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { usePageTitle } from '../../hooks/usePageTitle'
import PageLayout from '../PageLayout/PageLayout'


// ---------------------------------------------------------------
// CONFIRM EMAIL (/verify-email/:uid/:token)
//
// The link in the "confirm your email" email opens this page. It
// sends uid + token to Django straight away - no button to press -
// and shows how it went. Django checks the token
// (accounts/email_views.py).
// ---------------------------------------------------------------
function VerifyEmail() {
    usePageTitle('Confirm email')
    const { uid, token } = useParams()
    const { refreshUser } = useAuth()
    // 'checking' -> 'done' or 'failed'
    const [status, setStatus] = useState('checking')
    const [message, setMessage] = useState('')

    useEffect(() => {
        let ignore = false
        verifyEmail(uid, token)
            .then(answer => {
                if (ignore) return
                setStatus('done')
                setMessage(answer.detail)
                // Ask Django for the user again, so the yellow
                // "confirm your email" strip disappears right away.
                refreshUser()
            })
            .catch(err => {
                if (ignore) return
                setStatus('failed')
                setMessage(err.data?.detail || 'Something went wrong. Try the link again.')
            })
        return () => {
            ignore = true
        }
        // refreshUser is left out on purpose: we only want to check
        // the link once, when the page opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid, token])

    return (
        <PageLayout title='Confirm your email' width='narrow'>
            <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center'>
                {status === 'checking' && <p className='text-gray-400'>Checking your link...</p>}
                {status === 'done' && <CheckCircle2 className='mx-auto h-12 w-12 text-green-500' />}
                {status === 'failed' && <XCircle className='mx-auto h-12 w-12 text-red-500' />}
                {message && <p className='mt-4 text-lg text-white'>{message}</p>}
                {status !== 'checking' && (
                    <Link to='/' className='mt-6 inline-block text-red-400 hover:text-red-300'>Go to the homepage</Link>
                )}
            </div>
        </PageLayout>
    )
}

export default VerifyEmail
