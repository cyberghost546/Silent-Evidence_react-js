import { Routes, Route } from 'react-router-dom'
import SiteLayout from './components/SiteLayout/SiteLayout'
import HomePage from './components/HomePage/HomePage'
import LogIn from './components/LogIn/LogIn'
import SignUp from './components/SignUp/SignUp'
import CategoryPage from './components/CategoryPage/CategoryPage'
import StoryPage from './components/StoryPage/StoryPage'
import RandomStory from './components/RandomStory/RandomStory'
import NotFound from './components/NotFound/NotFound'
import ProtectedRoute from './auth/ProtectedRoute'
import AgeGate from './components/AgeGate/AgeGate'
import WriteStory from './components/WriteStory/WriteStory'
import ContactPage from './components/ContactPage/ContactPage'
import ProfilePage from './components/ProfilePage/ProfilePage'
import AuthorDashboard from './components/AuthorDashboard/AuthorDashboard'
import DashboardLayout from './components/Dashboard/DashboardLayout'
import Overview from './components/Dashboard/Overview'
import SlideDashboard from './components/SlideDashboard/SlideDashboard'
import SettingsPage from './components/SettingsPage/SettingsPage'
import LeaderboardPage from './components/LeaderboardPage/LeaderboardPage'
import FeedPage from './components/FeedPage/FeedPage'
import MyListsPage from './components/MyListsPage/MyListsPage'
import HistoryPage from './components/HistoryPage/HistoryPage'
import MyStoriesPage from './components/MyStoriesPage/MyStoriesPage'
import InvitesPage from './components/InvitesPage/InvitesPage'
import MessagesPage from './components/MessagesPage/MessagesPage'
import SearchPage from './components/SearchPage/SearchPage'
import InfoPage from './components/InfoPage/InfoPage'
import './App.css'

function App() {

  return (
    // Two groups of pages, each with its own "layout route".
    // A layout route has no path of its own (or a path its children
    // build on). Its element is a frame with an <Outlet />, and
    // React Router puts the matching child page into that Outlet.
    //
    // AgeGate wraps everything: until the visitor proves they're 18+,
    // none of the pages below are shown.
    <AgeGate>
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

        {/* Two URLs, one page: the list alone, or the list + a chat.
            MessagesPage reads :username with useParams(). */}
        <Route path='/messages' element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path='/messages/:username' element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

        {/* Anyone can search. The words go in the URL: /search?q=house */}
        <Route path='/search' element={<SearchPage />} />

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
      </Route>
    </Routes>
    </AgeGate>
  )
}

export default App
