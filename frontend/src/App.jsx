import { lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import SiteLayout from './components/SiteLayout/SiteLayout'
import HomePage from './components/HomePage/HomePage'
import LogIn from './components/LogIn/LogIn'
import SignUp from './components/SignUp/SignUp'
import ForgotPassword from './components/ForgotPassword/ForgotPassword'
import ResetPassword from './components/ResetPassword/ResetPassword'
import VerifyEmail from './components/VerifyEmail/VerifyEmail'
import SeriesPage from './components/SeriesPage/SeriesPage'
import ForumsPage from './components/Forums/ForumsPage'
import VideosPage from './components/VideosPage/VideosPage'
import ChainsPage from './components/Chains/ChainsPage'
import ExplorePage from './components/ExplorePage/ExplorePage'
import ChainPage from './components/Chains/ChainPage'
import BoardPage from './components/Forums/BoardPage'
import ThreadPage from './components/Forums/ThreadPage'
import CategoryPage from './components/CategoryPage/CategoryPage'
import StoryPage from './components/StoryPage/StoryPage'
import RandomStory from './components/RandomStory/RandomStory'
import NotFound from './components/NotFound/NotFound'
import ProtectedRoute from './auth/ProtectedRoute'
import MaintenanceGate from './components/MaintenanceGate/MaintenanceGate'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import ContactPage from './components/ContactPage/ContactPage'
import ProfilePage from './components/ProfilePage/ProfilePage'
import DashboardLayout from './components/Dashboard/DashboardLayout'
import ChallengesPage from './components/ChallengesPage/ChallengesPage'
import BundlesPage from './components/BundlesPage/BundlesPage'
import LeaderboardPage from './components/LeaderboardPage/LeaderboardPage'
import SearchPage from './components/SearchPage/SearchPage'
import InfoPage from './components/InfoPage/InfoPage'
import SiteGuide from './components/SiteGuide/SiteGuide'
import WatcherRoute from './components/SiteGuide/WatcherRoute'
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
// To add an admin page: add a lazy line here (not a normal import).
// ---------------------------------------------------------------

// Pages only logged-in members use - same idea (Suspense in SiteLayout).
const WriteStory = lazy(() => import('./components/WriteStory/WriteStory'))
const AuthorDashboard = lazy(() => import('./components/AuthorDashboard/AuthorDashboard'))
const SettingsPage = lazy(() => import('./components/SettingsPage/SettingsPage'))
const SupportPage = lazy(() => import('./components/SupportPage/SupportPage'))
const FeedPage = lazy(() => import('./components/FeedPage/FeedPage'))
const MyListsPage = lazy(() => import('./components/MyListsPage/MyListsPage'))
const HistoryPage = lazy(() => import('./components/HistoryPage/HistoryPage'))
const MyStoriesPage = lazy(() => import('./components/MyStoriesPage/MyStoriesPage'))
const InvitesPage = lazy(() => import('./components/InvitesPage/InvitesPage'))
const MessagesPage = lazy(() => import('./components/MessagesPage/MessagesPage'))
const NotificationsPage = lazy(() => import('./components/NotificationsPage/NotificationsPage'))

// The admin pages:
const Overview = lazy(() => import('./components/Dashboard/Overview'))
const SlideDashboard = lazy(() => import('./components/SlideDashboard/SlideDashboard'))
const UsersDashboard = lazy(() => import('./components/UsersDashboard/UsersDashboard'))
const StoriesDashboard = lazy(() => import('./components/StoriesDashboard/StoriesDashboard'))
const AIGeneratorDashboard = lazy(() => import('./components/AIGeneratorDashboard/AIGeneratorDashboard'))
const ModerationDashboard = lazy(() => import('./components/ModerationDashboard/ModerationDashboard'))
const ReportsDashboard = lazy(() => import('./components/ReportsDashboard/ReportsDashboard'))
const AppealsDashboard = lazy(() => import('./components/AppealsDashboard/AppealsDashboard'))
const LoginLogsDashboard = lazy(() => import('./components/LoginLogsDashboard/LoginLogsDashboard'))
const SecurityDashboard = lazy(() => import('./components/SecurityDashboard/SecurityDashboard'))
const CategoriesDashboard = lazy(() => import('./components/CategoriesDashboard/CategoriesDashboard'))
const StoryOfWeekDashboard = lazy(() => import('./components/StoryOfWeekDashboard/StoryOfWeekDashboard'))
const AnnouncementsDashboard = lazy(() => import('./components/AnnouncementsDashboard/AnnouncementsDashboard'))
const PromptsDashboard = lazy(() => import('./components/PromptsDashboard/PromptsDashboard'))
const ChallengesDashboard = lazy(() => import('./components/ChallengesDashboard/ChallengesDashboard'))
const BundlesDashboard = lazy(() => import('./components/BundlesDashboard/BundlesDashboard'))
const ContactInboxDashboard = lazy(() => import('./components/ContactInboxDashboard/ContactInboxDashboard'))
const SupportDashboard = lazy(() => import('./components/SupportDashboard/SupportDashboard'))
const NewsletterDashboard = lazy(() => import('./components/NewsletterDashboard/NewsletterDashboard'))
const CommentDigestDashboard = lazy(() => import('./components/CommentDigestDashboard/CommentDigestDashboard'))
const FunnelDashboard = lazy(() => import('./components/FunnelDashboard/FunnelDashboard'))
const CookieConsentDashboard = lazy(() => import('./components/CookieConsentDashboard/CookieConsentDashboard'))
const VerificationDashboard = lazy(() => import('./components/VerificationDashboard/VerificationDashboard'))
const ContentFilterDashboard = lazy(() => import('./components/ContentFilterDashboard/ContentFilterDashboard'))
const DisciplineDashboard = lazy(() => import('./components/DisciplineDashboard/DisciplineDashboard'))
const PremiumDashboard = lazy(() => import('./components/PremiumDashboard/PremiumDashboard'))
const RevenueDashboard = lazy(() => import('./components/RevenueDashboard/RevenueDashboard'))
const ScheduledDashboard = lazy(() => import('./components/ScheduledDashboard/ScheduledDashboard'))
const TagManagerDashboard = lazy(() => import('./components/TagManagerDashboard/TagManagerDashboard'))
const MoodDashboard = lazy(() => import('./components/MoodDashboard/MoodDashboard'))
const AdminSearchDashboard = lazy(() => import('./components/AdminSearchDashboard/AdminSearchDashboard'))
const EmailLogDashboard = lazy(() => import('./components/EmailLogDashboard/EmailLogDashboard'))
const SiteHealthDashboard = lazy(() => import('./components/SiteHealthDashboard/SiteHealthDashboard'))
const SiteSettingsDashboard = lazy(() => import('./components/SiteSettingsDashboard/SiteSettingsDashboard'))
const RateLimitsDashboard = lazy(() => import('./components/RateLimitsDashboard/RateLimitsDashboard'))
const BlocklistDashboard = lazy(() => import('./components/BlocklistDashboard/BlocklistDashboard'))
const AuditLogDashboard = lazy(() => import('./components/AuditLogDashboard/AuditLogDashboard'))
const EmailTemplatesDashboard = lazy(() => import('./components/EmailTemplatesDashboard/EmailTemplatesDashboard'))
const SeoDashboard = lazy(() => import('./components/SeoDashboard/SeoDashboard'))
const HeatmapDashboard = lazy(() => import('./components/HeatmapDashboard/HeatmapDashboard'))
const ToxicityDashboard = lazy(() => import('./components/ToxicityDashboard/ToxicityDashboard'))
const LoginMapDashboard = lazy(() => import('./components/LoginMapDashboard/LoginMapDashboard'))
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard/AnalyticsDashboard'))
const ErrorLogDashboard = lazy(() => import('./components/ErrorLogDashboard/ErrorLogDashboard'))
const VideosDashboard = lazy(() => import('./components/VideosDashboard/VideosDashboard'))
const FeaturedAuthorsDashboard = lazy(() => import('./components/FeaturedAuthorsDashboard/FeaturedAuthorsDashboard'))
const SpotlightDashboard = lazy(() => import('./components/SpotlightDashboard/SpotlightDashboard'))
const PollsDashboard = lazy(() => import('./components/PollsDashboard/PollsDashboard'))
const CalendarDashboard = lazy(() => import('./components/CalendarDashboard/CalendarDashboard'))
const MergeStoriesDashboard = lazy(() => import('./components/MergeStoriesDashboard/MergeStoriesDashboard'))

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
        <Route path='/invites' element={<ProtectedRoute><InvitesPage /></ProtectedRoute>} />
        <Route path='/support' element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
        <Route path='/support/:id' element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />

        {/* Two URLs, one page: the list alone, or the list + a chat.
            MessagesPage reads :username with useParams(). */}
        <Route path='/messages' element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path='/notifications' element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path='/messages/:username' element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

        {/* Writing challenges and story bundles - anyone can look.
            Each has a list page and a detail page (same component,
            it reads :id / :slug with useParams). */}
        <Route path='/challenges' element={<ChallengesPage />} />
        <Route path='/challenges/:id' element={<ChallengesPage />} />
        <Route path='/bundles' element={<BundlesPage />} />
        <Route path='/bundles/:slug' element={<BundlesPage />} />

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

      {/* ---------- ADMIN DASHBOARD: sidebar, no site header ---------- */}
      {/* The guard wraps the whole layout, so EVERY page inside is
          admins-only - no need to protect each one separately. */}
      <Route
        path='/dashboard'
        element={
          <ProtectedRoute adminOnly>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* index = the page at exactly /dashboard */}
        <Route index element={<Overview />} />

        {/* Child paths have no leading "/" - they're added to the
            parent's path: 'slides' -> /dashboard/slides */}
        <Route path='slides' element={<SlideDashboard />} />
        <Route path='users' element={<UsersDashboard />} />
        <Route path='stories' element={<StoriesDashboard />} />
        <Route path='ai' element={<AIGeneratorDashboard />} />
        <Route path='moderation' element={<ModerationDashboard />} />
        <Route path='reports' element={<ReportsDashboard />} />
        <Route path='appeals' element={<AppealsDashboard />} />
        <Route path='login-logs' element={<LoginLogsDashboard />} />
        <Route path='security' element={<SecurityDashboard />} />
        <Route path='categories' element={<CategoriesDashboard />} />
        <Route path='story-of-week' element={<StoryOfWeekDashboard />} />
        <Route path='announcements' element={<AnnouncementsDashboard />} />
        <Route path='prompts' element={<PromptsDashboard />} />
        <Route path='challenges' element={<ChallengesDashboard />} />
        <Route path='bundles' element={<BundlesDashboard />} />
        <Route path='contact' element={<ContactInboxDashboard />} />
        <Route path='support' element={<SupportDashboard />} />
        <Route path='newsletter' element={<NewsletterDashboard />} />
        <Route path='digest' element={<CommentDigestDashboard />} />
        <Route path='funnel' element={<FunnelDashboard />} />
        <Route path='cookies' element={<CookieConsentDashboard />} />
        <Route path='verification' element={<VerificationDashboard />} />
        <Route path='content-filter' element={<ContentFilterDashboard />} />
        <Route path='discipline' element={<DisciplineDashboard />} />
        <Route path='premium' element={<PremiumDashboard />} />
        <Route path='revenue' element={<RevenueDashboard />} />
        <Route path='scheduled' element={<ScheduledDashboard />} />
        <Route path='tags' element={<TagManagerDashboard />} />
        <Route path='moods' element={<MoodDashboard />} />
        <Route path='search' element={<AdminSearchDashboard />} />
        <Route path='email-log' element={<EmailLogDashboard />} />
        <Route path='health' element={<SiteHealthDashboard />} />
        <Route path='featured-authors' element={<FeaturedAuthorsDashboard />} />
        <Route path='spotlight' element={<SpotlightDashboard />} />
        <Route path='polls' element={<PollsDashboard />} />
        <Route path='calendar' element={<CalendarDashboard />} />
        <Route path='merge' element={<MergeStoriesDashboard />} />
        <Route path='site-settings' element={<SiteSettingsDashboard />} />
        <Route path='rate-limits' element={<RateLimitsDashboard />} />
        <Route path='blocklist' element={<BlocklistDashboard />} />
        <Route path='audit-log' element={<AuditLogDashboard />} />
        <Route path='email-templates' element={<EmailTemplatesDashboard />} />
        <Route path='seo' element={<SeoDashboard />} />
        <Route path='heatmap' element={<HeatmapDashboard />} />
        <Route path='toxicity' element={<ToxicityDashboard />} />
        <Route path='login-map' element={<LoginMapDashboard />} />
        <Route path='analytics' element={<AnalyticsDashboard />} />
        <Route path='errors' element={<ErrorLogDashboard />} />
        <Route path='videos' element={<VideosDashboard />} />
      </Route>
    </Routes>
    </ErrorBoundary>
    </MaintenanceGate>
  )
}

export default App
