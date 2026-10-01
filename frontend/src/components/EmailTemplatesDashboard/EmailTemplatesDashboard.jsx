import { useState, useEffect, useRef } from 'react'
import { FileText, RotateCcw } from 'lucide-react'
import { getEmailTemplates, saveEmailTemplate, resetEmailTemplate } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> EMAIL TEMPLATES (/dashboard/email-templates).
//
// The wording of the emails the site sends by itself (contact reply,
// support answer, comment digest, newsletter footer).
//
//   Left:  the list of emails ("Edited" = not the default any more)
//   Right: subject + text, the placeholder buttons, and a live
//          preview with example values filled in.
//
// {placeholders} are swapped for real values when the email goes out
// (mailings/email_templates.py). Django refuses unknown ones, so an
// email can never go out saying "Hi {nmae}".
// ---------------------------------------------------------------

// "Hi {name}" + { name: 'Sarah' } -> "Hi Sarah".
// /\{(\w+)\}/g finds every {word}; unknown ones are left as they are.
function fillIn(text, values) {
    return text.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)
}


function EmailTemplatesDashboard() {
    const [templates, setTemplates] = useState(null)
    const [selectedKey, setSelectedKey] = useState(null)
    // What's in the boxes now (saved only when you press Save).
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    // A "ref" = a direct handle on the <textarea>, so the placeholder
    // buttons can insert text where the cursor is.
    const bodyRef = useRef(null)

    useEffect(() => {
        getEmailTemplates()
            .then(data => {
                setTemplates(data)
                // Open the first one straight away.
                setSelectedKey(data[0].key)
                setSubject(data[0].subject)
                setBody(data[0].body)
            })
            .catch(() => setError('Could not load the templates.'))
    }, [])

    function openTemplate(template) {
        setSelectedKey(template.key)
        setSubject(template.subject)
        setBody(template.body)
        setError('')
        setNotice('')
    }

    // Swap the updated template into the list.
    function replaceInList(updated) {
        setTemplates(templates.map(item => (item.key === updated.key ? updated : item)))
        openTemplate(updated)
    }

    async function handleSave() {
        try {
            replaceInList(await saveEmailTemplate(selectedKey, subject, body))
            setNotice('Saved - the next email uses this wording.')
        } catch (err) {
            setError(err.data?.detail || 'Could not save.')
        }
    }

    async function handleReset() {
        if (!window.confirm('Go back to the original wording? Your changes are lost.')) return
        replaceInList(await resetEmailTemplate(selectedKey))
        setNotice('Back to the default wording.')
    }

    // Put "{name}" where the cursor is in the text box.
    function insertPlaceholder(name) {
        const box = bodyRef.current
        const start = box.selectionStart
        const end = box.selectionEnd
        const tag = `{${name}}`
        setBody(body.slice(0, start) + tag + body.slice(end))
        // After React has updated the box: focus it and put the
        // cursor just after the inserted placeholder.
        requestAnimationFrame(() => {
            box.focus()
            box.setSelectionRange(start + tag.length, start + tag.length)
        })
    }

    if (!templates) return <p className='text-gray-400'>{error || 'Loading templates...'}</p>

    const template = templates.find(item => item.key === selectedKey)
    const changed = subject !== template.subject || body !== template.body

    return (
        <div className='max-w-6xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <FileText className='h-7 w-7 text-red-500' />
                Email Templates
            </h1>
            <p className='mt-1 text-gray-400'>The wording of the emails the site sends by itself.</p>

            <PageMessages error={error} notice={notice} />

            <div className='mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]'>
                {/* ---------- LEFT: the list ---------- */}
                <ul className='space-y-1'>
                    {templates.map(item => (
                        <li key={item.key}>
                            <button
                                type='button'
                                onClick={() => openTemplate(item)}
                                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm ${
                                    item.key === selectedKey ? 'bg-slate-800 font-semibold text-white' : 'text-gray-300 hover:bg-slate-900'
                                }`}
                            >
                                {item.name}
                                {item.is_custom && <span className='rounded bg-blue-950 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300'>Edited</span>}
                            </button>
                        </li>
                    ))}
                </ul>

                {/* ---------- RIGHT: editor + preview ---------- */}
                <div className='min-w-0 space-y-6'>
                    <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                        <h2 className='text-lg font-bold text-white'>{template.name}</h2>
                        <p className='mt-1 text-sm text-gray-400'>{template.description}</p>
                        {template.updated_by && (
                            <p className='mt-1 text-xs text-gray-500'>Last edited by {template.updated_by} on {new Date(template.updated_at).toLocaleString()}</p>
                        )}

                        {template.has_subject && (
                            <div className='mt-5'>
                                <label htmlFor='subject' className={LABEL_STYLE}>Subject</label>
                                <input id='subject' value={subject} onChange={event => setSubject(event.target.value)} maxLength={200} className={INPUT_STYLE} />
                            </div>
                        )}

                        <div className='mt-5'>
                            <label htmlFor='body' className={LABEL_STYLE}>Text</label>
                            <textarea id='body' ref={bodyRef} rows={9} value={body} onChange={event => setBody(event.target.value)} className={`${INPUT_STYLE} font-mono text-sm`} />
                        </div>

                        {/* Click a placeholder to put it where the cursor is. */}
                        <div className='mt-3 flex flex-wrap items-center gap-2'>
                            <span className='text-xs text-gray-500'>Insert:</span>
                            {template.placeholders.map(name => (
                                <button key={name} type='button' onClick={() => insertPlaceholder(name)} className='rounded border border-slate-700 px-2 py-0.5 font-mono text-xs text-gray-300 hover:border-red-700 hover:text-white'>
                                    {`{${name}}`}
                                </button>
                            ))}
                        </div>

                        <div className='mt-6 flex flex-wrap items-center gap-3'>
                            <button type='button' onClick={handleSave} disabled={!changed} className={BUTTON_STYLE}>Save template</button>
                            {changed && <button type='button' onClick={() => openTemplate(template)} className='text-sm text-gray-400 hover:text-white'>Undo changes</button>}
                            {template.is_custom && (
                                <button type='button' onClick={handleReset} className='ml-auto flex items-center gap-1 text-sm text-gray-400 hover:text-red-400'>
                                    <RotateCcw className='h-4 w-4' /> Reset to default
                                </button>
                            )}
                        </div>
                    </div>

                    {/* The preview: what a member would get, with the
                        example values filled in. Updates while you type. */}
                    <div className='rounded-2xl border border-slate-800 bg-slate-950 p-6'>
                        <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>Preview (example values)</p>
                        {template.has_subject && <p className='mt-3 font-semibold text-white'>{fillIn(subject, template.sample)}</p>}
                        {/* whitespace-pre-wrap keeps the line breaks of the email. */}
                        <p className='mt-3 whitespace-pre-wrap text-sm text-gray-300'>{fillIn(body, template.sample)}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EmailTemplatesDashboard
