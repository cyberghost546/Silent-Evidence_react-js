from string import Formatter


# ---------------------------------------------------------------
# THE AUTOMATIC EMAILS, and their default wording.
#
# Words in {curly braces} are PLACEHOLDERS: they're swapped for the
# real value when the email is sent. "Hi {name}" -> "Hi Sarah".
# Admins can change the wording (Dashboard -> Email Templates), but
# only with the placeholders listed for that email.
#
# To send one anywhere in the code:
#
#     subject, body = render_email('support_reply', username='sam', ...)
#     send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email])
#
# To add a new email: add it to TEMPLATES, then call render_email().
# `sample` = example values, for the preview on the admin page - and
# its keys are the placeholders that email is allowed to use.
# ---------------------------------------------------------------
TEMPLATES = {
    'contact_reply': {
        'name': 'Contact form reply',
        'description': 'Sent when an admin answers a message from the Contact page (Contact Inbox).',
        'subject': 'Re: {subject}',
        'body': 'Hi {name},\n\n{reply}\n\n- The Silent Evidence team\n\n--- You wrote: ---\n{original_message}',
        'sample': {
            'name': 'Sarah',
            'subject': 'Account help',
            'reply': 'You can change it in Settings -> Account.',
            'original_message': 'How do I change my username?',
        },
    },
    'support_reply': {
        'name': 'Support ticket answered',
        'description': 'Sent to a member when an admin replies to their support ticket.',
        'subject': 'Support answered: {ticket_subject}',
        'body': 'Hi {username},\n\nSupport answered your ticket "{ticket_subject}":\n\n{reply}\n\nReply here: {link}\n',
        'sample': {
            'username': 'night_owl',
            'ticket_subject': "Can't upload a cover",
            'reply': 'Covers must be under 5 MB - try a smaller image.',
            'link': 'http://localhost:5173/support/12',
        },
    },
    'comment_digest': {
        'name': 'Comment digest',
        'description': 'The daily / weekly "new comments on your stories" email (Comment Digest).',
        'subject': '{count} new comments on your stories',
        'body': (
            'Hi {username},\n\n{count} new comments on your stories {period}:\n{comment_list}\n\n'
            'Change how often you get this email in Settings -> Notifications: {settings_link}'
        ),
        'sample': {
            'username': 'the_keeper',
            'count': '3',
            'period': 'this week',
            'comment_list': '\n"The House on Wren Street"\n  raven: This gave me chills.\n  moth: That ending!',
            'settings_link': 'http://localhost:5173/settings',
        },
    },
    'newsletter_footer': {
        'name': 'Newsletter footer',
        'description': 'Added under every newsletter. No subject - it goes at the end of the newsletter text.',
        'subject': None,   # None = this one has no subject
        'body': '---\nYou get this because "Weekly Horror Digest" is on. Switch it off: {settings_link}',
        'sample': {'settings_link': 'http://localhost:5173/settings'},
    },
}


# The {names} used in a text: 'Hi {name}, re {subject}' -> {'name', 'subject'}.
# Formatter().parse is Python's own reader for {} placeholders.
# It raises ValueError for broken braces like 'Hi {name'.
def placeholders_in(text):
    return {name for _, name, _, _ in Formatter().parse(text or '') if name}


# "Is this wording OK?" -> a list of problems (empty list = fine).
def check_template(key, subject, body):
    allowed = set(TEMPLATES[key]['sample'])
    problems = []
    for label, text in (('Subject', subject), ('Text', body)):
        try:
            unknown = placeholders_in(text) - allowed
        except ValueError:
            problems.append(f'{label}: a {{ or }} is not closed. Placeholders look like {{name}}.')
            continue
        if unknown:
            names = ', '.join('{' + name + '}' for name in sorted(unknown))
            problems.append(f'{label}: unknown placeholder(s) {names}')
    return problems


# The wording to use: the admin's version if there is one, else the default.
def get_template(key):
    from .models import EmailTemplate   # imported here to avoid a circular import
    default = TEMPLATES[key]
    custom = EmailTemplate.objects.filter(key=key).first()
    if custom is None:
        return {'subject': default['subject'], 'body': default['body'], 'custom': None}
    subject = custom.subject if default['subject'] is not None else None
    return {'subject': subject, 'body': custom.body, 'custom': custom}


# Fill in the placeholders. Returns (subject, body).
# If a saved template is broken somehow, use the default instead -
# better the old wording than no email at all.
def render_email(key, **values):
    template = get_template(key)
    try:
        subject = (template['subject'] or '').format(**values)
        body = template['body'].format(**values)
    except (KeyError, ValueError, IndexError):
        default = TEMPLATES[key]
        subject = (default['subject'] or '').format(**values)
        body = default['body'].format(**values)
    return subject, body
