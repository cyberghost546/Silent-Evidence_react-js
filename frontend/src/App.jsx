import { lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import SiteLayout from './components/SiteLayout/SiteLayout'
import HomePage from './components/HomePage/HomePage'
import LogIn from './components/LogIn/LogIn'
import SignUp from './components/SignUp/SignUp'
import ForgotPassword from './components/ForgotPassword/ForgotPassword'
import ResetPassword from './components/ResetPassword/ResetPassword'
import VerifyEmail from './components/VerifyEmail/VerifyEmail'
import CategoryPage from './components/CategoryPage/CategoryPage'
import StoryPage from './components/StoryPage/StoryPage'
import RandomStory from './components/RandomStory/RandomStory'
import NotFound from './components/NotFound/NotFound'
import ProtectedRoute from './auth/ProtectedRoute'
import MaintenanceGate from './components/MaintenanceGate/MaintenanceGate'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import ProfilePage from './components/ProfilePage/ProfilePage'
import { dashboardRoutes } from './routes/dashboardRoutes'
import InfoPage from './components/InfoPage/InfoPage'
import WatcherRoute from './components/SiteGuide/WatcherRoute'
import MessagesRoute from './components/MessagesPage/MessagesRoute'
import './App.css'

// ---------------------------------------------------------------
// THE ADMIN PAGES ARE LOADED "LAZILY".
//
// A normal import puts a page in the one big JavaScript file that
// EVERY visitor downloads - also the ~50 admin pages that only
// admins ever see. lazy(() => import(...)) makes each admin page its
// own small file, downloaded the first time someone opens it.
// While it downloads, <Suspense> in DashboardLayout shows "Loading...".
//
// Admin pages: their lazy lines + routes are in routes/dashboardRoutes.jsx.
// ---------------------------------------------------------------

// Public pages most visitors don't open on their first visit - same
// idea, so the first download stays small. The pages people LAND on
// (home, a story, a category, a profile) stay normal imports, so
// they show up without a "Loading..." in between.
const SeriesPage = lazy(() => import('./components/SeriesPage/SeriesPage'))
const ForumsPage = lazy(() => import('./components/Forums/ForumsPage'))
const VideosPage = lazy(() => import('./components/VideosPage/VideosPage'))
const VillainsPage = lazy(() => import('./components/VillainsPage/VillainsPage'))
const SprintsPage = lazy(() => import('./components/SprintsPage/SprintsPage'))
const TrueStoriesPage = lazy(() => import('./components/TrueStories/TrueStoriesPage'))
const ReadAlongsPage = lazy(() => import('./components/ReadAlongs/ReadAlongsPage'))
const ReadAlongRoom = lazy(() => import('./components/ReadAlongs/ReadAlongRoom'))
const JudgePage = lazy(() => import('./components/ChallengesPage/JudgePage'))
const HauntedMapPage = lazy(() => import('./components/Map/HauntedMapPage'))
const OfflineLibraryPage = lazy(() => import('./components/OfflineLibrary/OfflineLibraryPage'))
const ReadingListPage = lazy(() => import('./components/ReadingLists/ReadingListPage'))
const TrueStorySubmitPage = lazy(() => import('./components/TrueStories/TrueStorySubmitPage'))
const ChainsPage = lazy(() => import('./components/Chains/ChainsPage'))
const ExplorePage = lazy(() => import('./components/ExplorePage/ExplorePage'))
const ChainPage = lazy(() => import('./components/Chains/ChainPage'))
const BoardPage = lazy(() => import('./components/Forums/BoardPage'))
const ThreadPage = lazy(() => import('./components/Forums/ThreadPage'))
const ContactPage = lazy(() => import('./components/ContactPage/ContactPage'))
const ChallengesPage = lazy(() => import('./components/ChallengesPage/ChallengesPage'))
const BundlesPage = lazy(() => import('./components/BundlesPage/BundlesPage'))
const LeaderboardPage = lazy(() => import('./components/LeaderboardPage/LeaderboardPage'))
const SearchPage = lazy(() => import('./components/SearchPage/SearchPage'))
const SiteGuide = lazy(() => import('./components/SiteGuide/SiteGuide'))
// Pro + payments (the payments app in Django).
const PremiumPage = lazy(() => import('./components/PremiumPage/PremiumPage'))
const FakePaymentPage = lazy(() => import('./components/PremiumPage/FakePaymentPage'))
const PaymentDonePage = lazy(() => import('./components/PremiumPage/PaymentDonePage'))

// Pages only logged-in members use - same idea (Suspense in SiteLayout).
const WriteStory = lazy(() => import('./components/WriteStory/WriteStory'))
const AuthorDashboard = lazy(() => import('./components/AuthorDashboard/AuthorDashboard'))
const SettingsPage = lazy(() => import('./components/SettingsPage/SettingsPage'))
const SupportPage = lazy(() => import('./components/SupportPage/SupportPage'))
const FeedPage = lazy(() => import('./components/FeedPage/FeedPage'))
const MyListsPage = lazy(() => import('./components/MyListsPage/MyListsPage'))
const HistoryPage = lazy(() => import('./components/HistoryPage/HistoryPage'))
const MyStoriesPage = lazy(() => import('./components/MyStoriesPage/MyStoriesPage'))
const EditStoryPage = lazy(() => import('./components/EditStoryPage/EditStoryPage'))
const InvitesPage = lazy(() => import('./components/InvitesPage/InvitesPage'))
const NotificationsPage = lazy(() => import('./components/NotificationsPage/NotificationsPage'))


function App() {
  // For the ErrorBoundary: a new page = try again.
  const location = useLocation()

  return (
    // Two groups of pages, each with its own "layout route".
    // A layout route has no path of its own (or a path its children
    // build on). Its element is a frame with an <Outlet />, and
    // React Router puts the matching child page into that Outlet.
    //
    // MaintenanceGate: during maintenance only admins see the pages.
    // (There's no age gate for the whole site: only 18+ STORIES ask
    // for your age - see StoryLock.jsx and accounts/age.py.)
    <MaintenanceGate>
    {/* A crashing page shows "Something went wrong" instead of a
        blank screen. resetKey: opening another page tries again. */}
    <ErrorBoundary resetKey={location.pathname}>
    <Routes>

      {/* ---------- PUBLIC SITE: header + footer ---------- */}
      <Route element={<SiteLayout />}>
        <Route path='/' element={<HomePage />} />

        {/* :slug is a URL parameter - a placeholder that matches
            anything. /category/paranormal and /category/cryptids
            both show CategoryPage, which reads the slug with
            useParams() to know which one to load. */}
        <Route path='/category/:slug' element={<CategoryPage />} />

        {/* Same idea: /stories/5, /stories/12 ... -> StoryPage reads
            the :id with useParams(). */}
        <Route path='/stories/:id' element={<StoryPage />} />

        {/* Logged-in users only - ProtectedRoute sends everyone
            else to /login, then back here afterwards. */}
        <Route
          path='/write'
          element={
            <ProtectedRoute>
              <WriteStory />
            </ProtectedRoute>
          }
        />

        {/* The SAME page twice:
              /profile              -> your own (must be logged in,
                                       or we wouldn't know who "you" are)
              /profile/christopher  -> anyone's, public
            ProfilePage reads :username with useParams(). */}
        <Route
          path='/profile'
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path='/profile/:username' element={<ProfilePage />} />

        {/* Stats about YOUR stories - so you must be logged in. */}
        <Route
          path='/author'
          element={
            <ProtectedRoute>
              <AuthorDashboard />
            </ProtectedRoute>
          }
        />

        {/* YOUR settings - so you must be logged in. */}
        <Route
          path='/settings'
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Stories from the authors YOU follow - logged in only. */}
        <Route
          path='/feed'
          element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          }
        />

        {/* ----- Pages from the user menu: logged in only ----- */}
        {/* The same <ProtectedRoute> wrapper as above, once per page. */}
        <Route path='/lists' element={<ProtectedRoute><MyListsPage /></ProtectedRoute>} />
        <Route path='/history' element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path='/my-stories' element={<ProtectedRoute><MyStoriesPage /></ProtectedRoute>} />
        <Route path='/my-stories/:id/edit' element={<ProtectedRoute><EditStoryPage /></ProtectedRoute>} />
        <Route path='/invites' element={<ProtectedRoute><InvitesPage /></ProtectedRoute>} />
        <Route path='/support' element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
        <Route path='/support/:id' element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />

        {/* Messages is a POP-UP now (MessagesPopup.jsx, in the Header).
            These two old addresses open it - the list, or straight into
            a chat with :username - on top of the home page. */}
        <Route path='/messages' element={<ProtectedRoute><MessagesRoute /></ProtectedRoute>} />
        <Route path='/messages/:username' element={<ProtectedRoute><MessagesRoute /></ProtectedRoute>} />
        <Route path='/notifications' element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

        {/* Writing challenges and story bundles - anyone can look.
            Each has a list page and a detail page (same component,
            it reads :id / :slug with useParams). */}
        <Route path='/challenges' element={<ChallengesPage />} />
        <Route path='/challenges/:id' element={<ChallengesPage />} />
        <Route path='/challenges/:id/judge' element={<ProtectedRoute><JudgePage /></ProtectedRoute>} />
        <Route path='/bundles' element={<BundlesPage />} />
        <Route path='/bundles/:slug' element={<BundlesPage />} />

        {/* Pro: anyone can look at the prices; paying needs a login.
            /payment/fake/<id> only works on your computer (no Stripe key). */}
        <Route path='/premium' element={<PremiumPage />} />
        <Route path='/payment/fake/:id' element={<ProtectedRoute><FakePaymentPage /></ProtectedRoute>} />
        <Route path='/payment/done/:id' element={<ProtectedRoute><PaymentDonePage /></ProtectedRoute>} />

        {/* Anyone can search. The words go in the URL: /search?q=house */}
        <Route path='/search' element={<SearchPage />} />

        {/* Help pages - anyone can use them. Both read the topics
            in components/SiteGuide/guideTopics.js. */}
        <Route path='/guide' element={<SiteGuide />} />
        <Route path='/watcher' element={<WatcherRoute />} />

        {/* The text pages: /about, /privacy, /terms, /cookies...
            ONE route for all of them - InfoPage looks up :page in
            infoPages.js, and shows "Page not found" for anything
            that isn't there. React Router always prefers an exact
            path (like /search above) over a :placeholder, so this
            never steals another page's URL. */}
        <Route path='/:page' element={<InfoPage />} />

        {/* Anyone can see who's on top - no ProtectedRoute. */}
        <Route path='/leaderboard' element={<LeaderboardPage />} />

        {/* Anyone can send a message - no ProtectedRoute. */}
        <Route path='/contact' element={<ContactPage />} />

        {/* The Explore menu: /explore/latest, /popular, /timeline. */}
        <Route path='/explore/:mode' element={<ExplorePage />} />

        {/* Story chains: written together, one part at a time. */}
        <Route path='/chains' element={<ChainsPage />} />
        <Route path='/chains/:id' element={<ChainPage />} />

        {/* Story readings from YouTube. */}
        <Route path='/videos' element={<VideosPage />} />

        {/* Villain of the Week: nominate + vote (/nominate opens the form). */}
        <Route path='/villains' element={<VillainsPage />} />
        <Route path='/villains/nominate' element={<VillainsPage />} />

        {/* Writing Sprints: timed writing + weekly leaderboard. */}
        <Route path='/sprints' element={<SprintsPage />} />

        {/* Read a story together at a set time, with a chat. */}
        <Route path='/read-alongs' element={<ReadAlongsPage />} />
        <Route path='/read-alongs/:id' element={<ReadAlongRoom />} />

        {/* Where the stories happened (Leaflet + OpenStreetMap). */}
        <Route path='/map' element={<HauntedMapPage />} />

        {/* Stories downloaded for offline reading (works without internet). */}
        <Route path='/offline-library' element={<OfflineLibraryPage />} />

        {/* A reading list - the page people share. */}
        <Route path='/reading-lists/:id' element={<ReadingListPage />} />

        {/* True stories, shared anonymously (an admin reviews each one). */}
        <Route path='/true-stories' element={<TrueStoriesPage />} />
        <Route path='/true-stories/submit' element={<ProtectedRoute><TrueStorySubmitPage /></ProtectedRoute>} />

        {/* Forums: boards -> threads -> replies. Anyone can read. */}
        <Route path='/forums' element={<ForumsPage />} />
        <Route path='/forums/:slug' element={<BoardPage />} />
        <Route path='/forums/:slug/:id' element={<ThreadPage />} />

        {/* A story series and its parts - anyone can look. */}
        <Route path='/series/:id' element={<SeriesPage />} />

        {/* The link in the "confirm your email" email. */}
        <Route path='/verify-email/:uid/:token' element={<VerifyEmail />} />

        {/* Picks a random story and jumps to it. */}
        <Route path='/random' element={<RandomStory />} />

        {/* path='*' = "any URL nothing above matched". Without it, a
            link to a page that doesn't exist yet (/about, /feed...)
            shows an empty gap between the header and footer. React
            Router always prefers a more specific match, so this only
            catches what's left over - its position doesn't matter. */}
        <Route path='*' element={<NotFound />} />
      </Route>

      {/* ---------- LOG IN + SIGN UP: no header or footer ---------- */}
      {/* Outside SiteLayout on purpose, so the card gets the whole
          screen. Both use <AuthLayout>, which has its own
          "Back to site" link. */}
      <Route path='/login' element={<LogIn />} />
      <Route path='/signup' element={<SignUp />} />
      <Route path='/forgot-password' element={<ForgotPassword />} />
      {/* :uid and :token come from the link in the email. */}
      <Route path='/reset-password/:uid/:token' element={<ResetPassword />} />

      {/* ---------- ADMIN DASHBOARD (routes/dashboardRoutes.jsx) ---------- */}
      {dashboardRoutes()}
    </Routes>
    </ErrorBoundary>
    </MaintenanceGate>
  )
}

export default App
