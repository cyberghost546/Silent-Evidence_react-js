// ---------------------------------------------------------------
// The steps of the Site Guide tour (SiteTour.jsx), in order.
//
// Each step:
//   title - the red line at the top of the speech bubble
//   text  - what the skull "says"
//   link  - optional { to, label }: a button to try it right away
//
// Add, remove or reorder steps here - the tour counts them by
// itself ("Step 3 of 9", the dots, the red progress bar).
//
// (The full /guide page uses guideTopics.js instead - that one has
// the detailed step-by-step lists. This tour is the short version.)
// ---------------------------------------------------------------

export const TOUR_STEPS = [
    {
        title: 'Welcome to Silent Evidence',
        text: "You've entered the darkest corner of the web. This is a community for horror story readers and writers. Let me show you around — it only takes a minute.",
    },
    {
        title: 'Find your next nightmare',
        text: 'Press the magnifying glass at the top (or Ctrl + K) to search stories and writers. Browse by Categories, or let fate pick with Random Story.',
        link: { to: '/search', label: 'Try Search' },
    },
    {
        title: 'Save it for later',
        text: 'Too scared to finish tonight? Press "Save" on any story and find it in My Lists. Everything you open is kept in your Reading History.',
        link: { to: '/lists', label: 'My Lists' },
    },
    {
        title: 'Follow the writers you like',
        text: "Press Follow on a writer's profile. Their new stories appear in My Feed, so you never miss one.",
        link: { to: '/feed', label: 'My Feed' },
    },
    {
        title: 'Tell your own story',
        text: 'Write a Story has templates to get you going, and saves your draft as you type. Publish now, or schedule it for the witching hour.',
        link: { to: '/write', label: 'Write a Story' },
    },
    {
        title: 'Never write alone',
        text: 'Invite a co-author from My Stories. Once they accept, both your names are on the story.',
        link: { to: '/my-stories', label: 'My Stories' },
    },
    {
        title: 'Whisper in private',
        text: 'Send private messages from any profile. A red number on the chat icon means someone is waiting for your answer.',
        link: { to: '/messages', label: 'Messages' },
    },
    {
        title: 'Climb the Leaderboard',
        text: 'Writers are ranked by the likes on their stories. Publish 10 stories and you join the Elite Members - crown included.',
        link: { to: '/leaderboard', label: 'Leaderboard' },
    },
    {
        title: 'Make it yours',
        text: "Upload an avatar, choose which ratings you see, set your reading speed and more in Settings. That's the tour. Questions later? Ask The Watcher, from your menu.",
        link: { to: '/settings', label: 'Open Settings' },
    },
]
