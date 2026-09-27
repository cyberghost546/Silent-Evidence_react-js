import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Mail, MapPin, Clock, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSiteStatus } from '../../hooks/useSiteStatus'
import { sendContactMessage } from '../../api/client'
import { LABEL_STYLE, INPUT_STYLE, BUTTON_STYLE, FIELD_ERROR_STYLE } from '../../styles/formStyles'
import { usePageTitle } from '../../hooks/usePageTitle'


// ---------------------------------------------------------------
// The "Subject" choices. `value` must match SUBJECTS in
// backend/contact/models.py.
// ---------------------------------------------------------------
const SUBJECTS = [
    { value: 'general', label: 'General question' },
    { value: 'report', label: 'Report a story or comment' },
    { value: 'bug', label: 'Something is broken' },
    { value: 'account', label: 'Help with my account' },
    { value: 'partnership', label: 'Partnership / press' },
    { value: 'other', label: 'Something else' },
]

// The three info cards on the left. As data, so adding a fourth
// card (e.g. Discord) is one more line.
const CONTACT_INFO = [
    { icon: Mail, label: 'Email', value: 'hello@silentevidence.com' },
    { icon: MapPin, label: 'Based in', value: 'Worldwide — we are fully remote.' },
    { icon: Clock, label: 'Response time', value: 'Usually within 24–48 hours.' },
]


// Django's messages for ONE field, or nothing. Same as in SignUp.jsx.
function FieldError({ messages }) {
    if (!messages) return null
    return <p className={FIELD_ERROR_STYLE}>{messages.join(' ')}</p>
}


// ---------------------------------------------------------------
// ONE INFO CARD: icon in a red square, small grey label, white text.
//
// Usage:
//   <InfoCard icon={Mail} label='Email' value='hello@...' />
//
// icon is a COMPONENT (Mail), not <Mail /> - InfoCard draws it.
// ---------------------------------------------------------------
function InfoCard({ icon: Icon, label, value }) {
    return (
        <div className='flex items-center gap-5 rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-5'>
            <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-red-900/60 bg-red-950/60'>
                <Icon className='h-5 w-5 text-red-500' />
            </span>
            <div>
                <p className='text-sm text-gray-500'>{label}</p>
                <p className='font-medium text-white'>{value}</p>
            </div>
        </div>
    )
}


// ---------------------------------------------------------------
// THE CONTACT PAGE (/contact). Anyone can use it - no login needed.
//
// Left:  the title, a short text and the info cards.
// Right: the form. Sent to Django (POST /api/contact/), and you read
//        the messages in the Django admin.
// ---------------------------------------------------------------
function ContactPage() {
    usePageTitle('Contact')
    const { user } = useAuth()
    // The email set in Dashboard -> Site Settings replaces the
    // default one in CONTACT_INFO (if an admin filled it in).
    const site = useSiteStatus()
    const contactInfo = CONTACT_INFO.map(info =>
        info.label === 'Email' && site?.contact_email ? { ...info, value: site.contact_email } : info
    )

    // Another page can open this one with a subject already picked:
    //   <Link to='/contact' state={{ subject: 'account' }}>
    // ("Forgot password?" on the Log In page does that.)
    const location = useLocation()

    // Logged in? Fill in their name and email already - one less
    // thing to type. `user?.email` = "user.email, or undefined if
    // there's no user" (instead of crashing).
    const [form, setForm] = useState({
        name: user?.username || '',
        email: user?.email || '',
        subject: location.state?.subject || '',
        message: '',
    })

    const [errors, setErrors] = useState({})
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    function handleChange(event) {
        setForm({ ...form, [event.target.name]: event.target.value })
    }

    async function handleSubmit(event) {
        event.preventDefault()

        // Quick checks first, so nobody waits for the server just to
        // hear "fill this in". Django checks again anyway.
        const newErrors = {}
        if (form.name.trim() === '') newErrors.name = ['Please tell us your name.']
        if (form.email.trim() === '') newErrors.email = ['We need your email to reply.']
        if (form.subject === '') newErrors.subject = ['Pick a subject.']
        if (form.message.trim() === '') newErrors.message = ['Write your message.']

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setSending(true)
        setErrors({})

        try {
            await sendContactMessage(form)
            setSent(true)
        } catch (error) {
            // 429 = our spam limit (5 an hour, see contact/views.py).
            if (error.status === 429) {
                setErrors({ detail: "You've sent a lot of messages. Please wait a while and try again." })
            } else {
                setErrors(error.data || { detail: 'Something went wrong. Please try again.' })
            }
        } finally {
            setSending(false)
        }
    }

    // Start over after a message was sent.
    function sendAnother() {
        setForm({ ...form, subject: '', message: '' })
        setSent(false)
    }

    return (
        <div className='bg-slate-950 px-4 py-16 sm:py-20'>
            {/* Two columns on big screens (lg:), one on phones.
                items-start: the left column doesn't stretch to the
                height of the form. */}
            <div className='mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-2 lg:gap-16'>

                {/* ---------- LEFT: text + info cards ---------- */}
                <div>
                    <p className='text-sm font-bold uppercase tracking-widest text-red-600'>Get in touch</p>
                    <h1 className='mt-3 text-5xl font-bold text-white'>Contact Us</h1>
                    <p className='mt-6 max-w-md text-lg leading-8 text-gray-400'>
                        Have a question, a report, or just want to say hello? Fill in the form
                        and we will get back to you as soon as we can.
                    </p>

                    <div className='mt-10 space-y-5'>
                        {contactInfo.map(info => (
                            <InfoCard key={info.label} icon={info.icon} label={info.label} value={info.value} />
                        ))}
                    </div>
                </div>

                {/* ---------- RIGHT: the form (or "thank you") ---------- */}
                <div className='rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-10'>
                    {sent ? (
                        // ----- After sending -----
                        <div className='py-16 text-center'>
                            <CheckCircle2 className='mx-auto h-14 w-14 text-green-500' />
                            <h2 className='mt-4 text-2xl font-bold text-white'>Message sent!</h2>
                            <p className='mt-2 text-gray-400'>Thanks, {form.name}. We'll reply to {form.email} soon.</p>
                            <button type='button' onClick={sendAnother} className='mt-6 text-sm font-semibold text-red-400 hover:text-red-300'>
                                Send another message
                            </button>
                        </div>
                    ) : (
                        // ----- The form -----
                        <form onSubmit={handleSubmit} noValidate>
                            <h2 className='mb-5 text-2xl font-bold text-white'>Send us a message</h2>

                            {errors.detail && (
                                <p className='mb-5 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300'>{errors.detail}</p>
                            )}

                            {/* Name + email side by side (stacked on phones). */}
                            <div className='grid gap-5 sm:grid-cols-2'>
                                <div>
                                    <label htmlFor='name' className={LABEL_STYLE}>Your Name</label>
                                    <input id='name' name='name' value={form.name} onChange={handleChange} maxLength={100} placeholder='John Doe' className={INPUT_STYLE} />
                                    <FieldError messages={errors.name} />
                                </div>
                                <div>
                                    <label htmlFor='email' className={LABEL_STYLE}>Email Address</label>
                                    <input id='email' name='email' type='email' value={form.email} onChange={handleChange} placeholder='you@example.com' className={INPUT_STYLE} />
                                    <FieldError messages={errors.email} />
                                </div>
                            </div>

                            <div className='mt-5'>
                                <label htmlFor='subject' className={LABEL_STYLE}>Subject</label>
                                <select id='subject' name='subject' value={form.subject} onChange={handleChange} className={INPUT_STYLE}>
                                    <option value=''>Select a subject...</option>
                                    {SUBJECTS.map(subject => (
                                        <option key={subject.value} value={subject.value}>{subject.label}</option>
                                    ))}
                                </select>
                                <FieldError messages={errors.subject} />
                            </div>

                            <div className='mt-5'>
                                <label htmlFor='message' className={LABEL_STYLE}>Message</label>
                                <textarea
                                    id='message'
                                    name='message'
                                    rows={7}
                                    value={form.message}
                                    onChange={handleChange}
                                    maxLength={5000}
                                    placeholder="Tell us what's on your mind..."
                                    className={`${INPUT_STYLE} resize-y`}
                                />
                                <FieldError messages={errors.message} />
                            </div>

                            <button type='submit' disabled={sending} className={`${BUTTON_STYLE} mt-8 w-full`}>
                                {sending ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ContactPage
