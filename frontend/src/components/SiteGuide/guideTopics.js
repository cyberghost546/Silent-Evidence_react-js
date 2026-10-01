import {
    Compass, Search, Bookmark, PenLine, UserPlus, Rss, MessageCircle,
    Trophy, Settings, ShieldCheck, Users,
} from 'lucide-react'


// ---------------------------------------------------------------
// EVERYTHING ABOUT HOW THE SITE WORKS - in one list.
//
// Two pages read this same list:
//   - SiteGuide.jsx      shows every topic as a card (/guide)
//   - AskTheWatcher.jsx  finds the best topic for your question and
//                        answers with it (/watcher)
//
// So when you add a feature to the site, add ONE topic here and both
// pages know about it.
//
// Each topic:
//   id        - short name, also used as the #anchor on the guide page
//   title     - the heading
//   icon      - a lucide-react icon component
//   summary   - one line under the heading
//   steps     - the how-to, as a list
//   link      - { to, label }: the page where you do it (optional)
//   keywords  - words people might type to the Watcher. Lower case.
//               The more of these a question contains, the better
//               the match (see findTopic below). Avoid words that
//               fit EVERY topic (like "story") - they only cause ties.
//   group     - which section of the guide it belongs to
// ---------------------------------------------------------------

export const GUIDE_GROUPS = [
    { id: 'start', title: 'Getting started' },
    { id: 'reading', title: 'Reading' },
    { id: 'writing', title: 'Writing' },
    { id: 'community', title: 'Community' },
    { id: 'account', title: 'Your account' },
]


export const GUIDE_TOPICS = [
    {
        id: 'welcome',
        group: 'start',
        title: 'Welcome to Silent Evidence',
        icon: Compass,
        summary: 'A community for horror stories - to read, to write, and to share.',
        steps: [
            'Anyone can read stories. Sign up (free) to like, save, comment and write.',
            'Start on the homepage: Story of the Day, trending stories and the latest ones.',
            'Can\'t decide? "Random Story" in your menu picks one for you.',
        ],
        link: { to: '/signup', label: 'Create an account' },
        keywords: ['start', 'begin', 'new', 'what', 'site', 'about', 'sign', 'signup', 'register', 'join', 'free', 'help'],
    },
    {
        id: 'find',
        group: 'reading',
        title: 'Finding stories',
        icon: Search,
        summary: 'Search, browse categories, or let fate decide.',
        steps: [
            'Use Search (the magnifying glass at the top) for titles, words in stories, or writers.',
            'Categories in the menu show every story of one kind.',
            'The Leaderboard shows the writers with the most likes.',
        ],
        link: { to: '/search', label: 'Open Search' },
        keywords: ['find', 'search', 'look', 'browse', 'category', 'categories', 'random', 'discover', 'where', 'read'],
    },
    {
        id: 'save',
        group: 'reading',
        title: 'Saving stories and your history',
        icon: Bookmark,
        summary: 'Keep stories for later, and find the ones you already read.',
        steps: [
            'Press "Save" on a story to put it in My Lists.',
            'Every story you open goes into Reading History, grouped by day.',
            'You can clear your history at any time.',
        ],
        link: { to: '/lists', label: 'Go to My Lists' },
        keywords: ['save', 'saved', 'bookmark', 'later', 'list', 'lists', 'history', 'before', 'again', 'clear', 'saving'],
    },
    {
        id: 'write',
        group: 'writing',
        title: 'Writing a story',
        icon: PenLine,
        summary: 'From first line to published - drafts are saved as you type.',
        steps: [
            'Open "Write a Story" from your menu.',
            'Stuck? "Use a Template" gives you a structure to fill in.',
            'Pick a category, a content rating and any content warnings.',
            'Publish now, or choose a date to schedule it.',
            'Manage everything you wrote (publish, unpublish, delete) in My Stories.',
        ],
        link: { to: '/write', label: 'Write a Story' },
        keywords: ['write', 'writing', 'post', 'publish', 'draft', 'template', 'schedule', 'later', 'edit', 'unpublish', 'warning', 'warnings'],
    },
    {
        id: 'coauthor',
        group: 'writing',
        title: 'Writing together',
        icon: UserPlus,
        summary: 'Invite a co-author - their name appears next to yours.',
        steps: [
            'In My Stories, press "Co-author" on your story and type their username.',
            'They accept or decline on their Co-author Invites page.',
            'Once accepted, the story shows "you & them" as authors.',
        ],
        link: { to: '/invites', label: 'Co-author Invites' },
        keywords: ['coauthor', 'co-author', 'together', 'invite', 'invites', 'collaborate', 'partner', 'friend', 'write'],
    },
    {
        id: 'follow',
        group: 'community',
        title: 'Following writers and My Feed',
        icon: Rss,
        summary: 'Never miss a new story from the writers you like.',
        steps: [
            'Open a writer\'s profile and press Follow.',
            'My Feed shows the newest stories from everyone you follow.',
            'Sort your feed by newest or most viewed.',
        ],
        link: { to: '/feed', label: 'Open My Feed' },
        keywords: ['follow', 'following', 'follower', 'followers', 'feed', 'writer', 'author', 'new', 'subscribe'],
    },
    {
        id: 'messages',
        group: 'community',
        title: 'Messages',
        icon: MessageCircle,
        summary: 'Talk privately with other members.',
        steps: [
            'Press "Message" on someone\'s profile, or type their name on the Messages page.',
            'A red number on the chat icon at the top means unread messages.',
            'Blocked users can\'t message you.',
        ],
        link: { to: '/messages', label: 'Open Messages' },
        keywords: ['message', 'messages', 'chat', 'talk', 'private', 'dm', 'send', 'inbox', 'unread'],
    },
    {
        id: 'ranking',
        group: 'community',
        title: 'The Leaderboard',
        icon: Trophy,
        summary: 'Writers ranked by the likes on their stories.',
        steps: [
            'All Writers: everyone with a published story, most likes first.',
            'Elite Members: writers with 10 or more published stories (they get a crown).',
            'Like stories you enjoy - that\'s what moves writers up.',
        ],
        link: { to: '/leaderboard', label: 'See the Leaderboard' },
        keywords: ['leaderboard', 'rank', 'ranking', 'top', 'best', 'elite', 'crown', 'likes', 'like', 'popular'],
    },
    {
        id: 'settings',
        group: 'account',
        title: 'Making the site yours',
        icon: Settings,
        summary: 'Avatar, reading preferences and appearance - all in Settings.',
        steps: [
            'Profile: upload an avatar, write a bio, add your website.',
            'Age & Content: choose which content ratings you see.',
            'Reading Speed: Slow, Average or Fast - "min read" adjusts to you.',
            'Fear Profile and Appearance: your favourite moods and profile theme.',
        ],
        link: { to: '/settings', label: 'Open Settings' },
        keywords: ['settings', 'setting', 'avatar', 'picture', 'photo', 'bio', 'username', 'name', 'change', 'theme', 'speed', 'reading', 'time', 'minute', 'fast', 'slow', 'rating', 'mature', 'profile', 'password', 'email'],
    },
    {
        id: 'privacy',
        group: 'account',
        title: 'Privacy and blocking',
        icon: ShieldCheck,
        summary: 'Decide who sees you, and keep unwanted people away.',
        steps: [
            'Private Profile (Settings -> Account): only your followers see your stories.',
            'Blocked Users (Settings): their stories and comments disappear for you, and they can\'t message you.',
            'Download Your Data or delete your account in Settings -> Account.',
        ],
        link: { to: '/privacy', label: 'Read the Privacy Policy' },
        keywords: ['privacy', 'private', 'profile', 'account', 'block', 'blocked', 'hide', 'safe', 'safety', 'harass', 'report', 'delete', 'data', 'download', 'remove'],
    },
    {
        id: 'rules',
        group: 'account',
        title: 'Community rules',
        icon: Users,
        summary: 'Horror is welcome. Harm is not.',
        steps: [
            'Rate your stories honestly and add content warnings.',
            'No harassment, and no real people\'s private details.',
            'Seen something wrong? Block the user and tell us on the Contact page.',
        ],
        link: { to: '/acceptable-use', label: 'Read the rules' },
        keywords: ['rules', 'rule', 'allowed', 'banned', 'ban', 'report', 'contact', 'problem', 'abuse', 'terms'],
    },
]


// ---------------------------------------------------------------
// "Which topic fits this question best?" - used by the Watcher.
//
// A very simple way to "understand" a question:
//   1. Split the question into words:
//      "How do I save a story?" -> ['how', 'do', 'i', 'save', 'a', 'story']
//   2. Give every topic 1 point for each of ITS keywords that one
//      of those words STARTS with - so "harassing" still matches
//      the keyword "harass", and "followers" matches "follow".
//   3. The topic with the most points wins. 0 points = no idea.
//
// It's not real AI, but for questions about THIS site it works
// surprisingly well - and you can see exactly why it answered what
// it did. To make it smarter: add keywords to the topics above.
// ---------------------------------------------------------------
export function findTopic(question) {
    // .toLowerCase() so "Save" and "save" match.
    // .split(/[^a-z-]+/) cuts at anything that isn't a letter or a
    // dash (spaces, ?, !, commas...). .filter(Boolean) drops the
    // empty bits that leaves at the start/end.
    const words = question.toLowerCase().split(/[^a-z-]+/).filter(Boolean)

    let bestTopic = null
    let bestScore = 0

    for (const topic of GUIDE_TOPICS) {
        // How many of this topic's keywords are in the question?
        // .some() = "is there at least one word that starts with it?"
        const score = topic.keywords.filter(keyword =>
            words.some(word => word.startsWith(keyword))
        ).length

        // Strictly bigger: on a tie, the topic higher in the list wins.
        if (score > bestScore) {
            bestScore = score
            bestTopic = topic
        }
    }

    return bestTopic
}
