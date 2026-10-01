// ---------------------------------------------------------------
// The TEXT of the simple pages, drawn by InfoPage.jsx.
//
// The key ('about', 'privacy'...) is the URL: INFO_PAGES.about is
// shown at /about. Each page:
//   title    - the big heading
//   intro    - the grey line under it
//   isLegal  - true = show the "draft text" note on top
//   updated  - the date on legal pages
//   sections - [ { heading, paragraphs: [...], bullets: [...] } ]
//
// About the legal pages: they describe what THIS code really does
// (which cookies, what's stored...). They're a sensible start for a
// practice project, not legal advice. Before real people use the
// site, have them checked - rules differ per country (GDPR in the EU).
// ---------------------------------------------------------------

export const INFO_PAGES = {
    about: {
        title: 'About Silent Evidence',
        intro: 'A home for horror stories - the ones people wrote, and the ones they lived.',
        sections: [
            {
                heading: 'What this is',
                paragraphs: [
                    'Silent Evidence is a community for horror story readers and writers. Anyone can read. Sign up and you can write, comment, follow the writers you like and save stories for later.',
                    'Some stories are fiction. Some claim to be real. We leave it to you to decide which is which.',
                ],
            },
            {
                heading: 'For readers',
                paragraphs: ['Make the site yours from the Settings page:'],
                bullets: [
                    'Pick your Fear Profile - the moods you like best.',
                    'Choose which content ratings you want to see.',
                    'Set your reading speed, so "min read" fits you.',
                    'Follow writers and find their new stories in My Feed.',
                ],
            },
            {
                heading: 'For writers',
                paragraphs: [
                    'Write a Story has templates to get you started, saves your draft as you type, and lets you schedule a story for later. Invite a co-author to write together, and follow your numbers on the Author Dashboard.',
                ],
            },
            {
                heading: 'The rules, in short',
                paragraphs: [
                    'Be scary, not cruel. Rate your stories honestly and add content warnings. No real people\'s private details, no harassment. The full version is on the Acceptable Use page.',
                ],
            },
        ],
    },

    privacy: {
        title: 'Privacy Policy',
        intro: 'What we store about you, why, and what you can do about it.',
        isLegal: true,
        updated: '1 October 2026',
        sections: [
            {
                heading: 'What we store',
                paragraphs: ['When you use an account, we keep:'],
                bullets: [
                    'Your username, email address and password (stored scrambled - "hashed" - never as plain text).',
                    'Your profile: avatar, bio, website and the choices on the Settings page.',
                    'What you create: stories, comments, Last Words and private messages.',
                    'What you do: likes, saved stories, follows, blocks and your reading history.',
                    'If you pay (Pro or a candle): what you bought, the amount and the date. Your card details go to Stripe, our payment provider, and never reach us.',
                ],
            },
            {
                heading: 'Why',
                paragraphs: [
                    'Only to run the site: to log you in, show your stories and profile, fill your feed and history, and apply your settings. We don\'t sell your data and don\'t show adverts.',
                ],
            },
            {
                heading: 'Who can see what',
                paragraphs: [
                    'Published stories, comments, your profile and your follower counts are public - unless you turn on Private Profile, then only your followers see your stories and details. Drafts, saved stories, reading history, blocks and messages are only visible to you (and to the other person, for messages). Site admins can see everything, for moderation.',
                ],
            },
            {
                heading: 'Your choices',
                paragraphs: ['On the Settings page you can:'],
                bullets: [
                    'Download everything we have about you as a file (Account -> Download Your Data).',
                    'Change or remove your profile details at any time.',
                    'Clear your reading history (on the Reading History page).',
                    'Delete your account - this removes your stories, comments and everything else with it.',
                ],
            },
        ],
    },

    terms: {
        title: 'Terms of Service',
        intro: 'The agreement between you and Silent Evidence when you use the site.',
        isLegal: true,
        updated: '1 October 2026',
        sections: [
            {
                heading: 'Your account',
                paragraphs: [
                    'You must be 18 or older to use Silent Evidence. Keep your password to yourself - you\'re responsible for what happens on your account.',
                ],
            },
            {
                heading: 'Your stories stay yours',
                paragraphs: [
                    'You keep the rights to what you write. By publishing, you allow us to show it on the site. Unpublish or delete it and it disappears from the site.',
                ],
            },
            {
                heading: 'Pro and candles',
                paragraphs: [
                    'Pro is a single payment for 1 month or 1 year - it doesn\'t renew by itself, so there\'s nothing to cancel. Candles are tips for writers: the writer gets 90%, the site keeps 10% to keep running. Payments are handled by Stripe. Paid by mistake? Contact us through Help & Support.',
                ],
            },
            {
                heading: 'Playing fair',
                paragraphs: [
                    'Follow the Acceptable Use rules. We may remove content or close accounts that break them.',
                ],
            },
            {
                heading: 'No guarantees',
                paragraphs: [
                    'The site is provided "as is". We do our best to keep it running and your data safe, but we can\'t promise it will never go down or lose something. Keep your own copy of stories that matter to you (Settings -> Download Your Data).',
                ],
            },
        ],
    },

    'acceptable-use': {
        title: 'Acceptable Use',
        intro: 'Horror is welcome. Harm is not.',
        isLegal: true,
        updated: '26 September 2026',
        sections: [
            {
                heading: 'Allowed',
                paragraphs: ['Dark, disturbing and violent FICTION, rated honestly, with content warnings where they help readers choose.'],
            },
            {
                heading: 'Not allowed',
                paragraphs: [],
                bullets: [
                    'Harassing, threatening or stalking anyone - on the site or through messages.',
                    'Posting someone\'s private information (address, phone, photos) without permission.',
                    'Content that sexualises minors, in any form. This is reported to the authorities.',
                    'Encouraging real violence or self-harm.',
                    'Copying other people\'s stories and posting them as your own.',
                    'Spam, fake accounts, or trying to break the site.',
                ],
            },
            {
                heading: 'Seeing something wrong?',
                paragraphs: ['Block the user from Settings -> Blocked Users, and tell us through the Contact page.'],
            },
        ],
    },

    copyright: {
        title: 'Copyright & Illegal Content',
        intro: 'How to report a story that copies your work or breaks the law.',
        isLegal: true,
        updated: '26 September 2026',
        sections: [
            {
                heading: 'Reporting',
                paragraphs: [
                    'Use the Contact page with the subject "Copyright" or "Illegal content", and include: the link to the story, what the problem is, and (for copyright) where your original work was published and that you own it.',
                    'We look at every report and remove content that breaks the rules. The writer is told why.',
                ],
            },
        ],
    },

    cookies: {
        title: 'Cookies',
        intro: 'The small files and saved values this site uses - there are only a few.',
        isLegal: true,
        updated: '26 September 2026',
        sections: [
            {
                heading: 'Cookies we set',
                paragraphs: ['Both are needed for the site to work, so there\'s nothing to switch off:'],
                bullets: [
                    'sessionid - keeps you logged in.',
                    'csrftoken - protects your account from other websites sending requests in your name.',
                ],
            },
            {
                heading: 'Saved in your browser (not cookies)',
                paragraphs: ['Stored only on your own device, never sent to us:'],
                bullets: [
                    'ageGate - that you confirmed you\'re 18+, so we don\'t ask every visit.',
                    'Your unsent story draft on the Write a Story page.',
                ],
            },
            {
                heading: 'No tracking',
                paragraphs: ['No advertising or analytics cookies, and no third-party trackers.'],
            },
        ],
    },
}
