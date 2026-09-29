import { lazy } from 'react'
import { Route } from 'react-router-dom'
import ProtectedRoute from '../auth/ProtectedRoute'
import DashboardLayout from '../components/Dashboard/DashboardLayout'


// ---------------------------------------------------------------
// THE ADMIN DASHBOARD'S ROUTES (/dashboard/...) - moved out of App.jsx,
// which was getting very long. App.jsx puts them in with:
//     {dashboardRoutes()}
//
// The pages are loaded "lazily": lazy(() => import(...)) makes each
// admin page its own small file, downloaded the first time an admin
// opens it - so visitors never download ~50 admin pages.
// While one downloads, <Suspense> in DashboardLayout shows "Loading...".
//
// To add an admin page: a lazy line below + a <Route> in the list.
// ---------------------------------------------------------------
const Overview = lazy(() => import('../components/Dashboard/Overview'))
const SlideDashboard = lazy(() => import('../components/SlideDashboard/SlideDashboard'))
const UsersDashboard = lazy(() => import('../components/UsersDashboard/UsersDashboard'))
const StoriesDashboard = lazy(() => import('../components/StoriesDashboard/StoriesDashboard'))
const AIGeneratorDashboard = lazy(() => import('../components/AIGeneratorDashboard/AIGeneratorDashboard'))
const ModerationDashboard = lazy(() => import('../components/ModerationDashboard/ModerationDashboard'))
const ReportsDashboard = lazy(() => import('../components/ReportsDashboard/ReportsDashboard'))
const AppealsDashboard = lazy(() => import('../components/AppealsDashboard/AppealsDashboard'))
const LoginLogsDashboard = lazy(() => import('../components/LoginLogsDashboard/LoginLogsDashboard'))
const SecurityDashboard = lazy(() => import('../components/SecurityDashboard/SecurityDashboard'))
const CategoriesDashboard = lazy(() => import('../components/CategoriesDashboard/CategoriesDashboard'))
const StoryOfWeekDashboard = lazy(() => import('../components/StoryOfWeekDashboard/StoryOfWeekDashboard'))
const AnnouncementsDashboard = lazy(() => import('../components/AnnouncementsDashboard/AnnouncementsDashboard'))
const PromptsDashboard = lazy(() => import('../components/PromptsDashboard/PromptsDashboard'))
const ChallengesDashboard = lazy(() => import('../components/ChallengesDashboard/ChallengesDashboard'))
const BundlesDashboard = lazy(() => import('../components/BundlesDashboard/BundlesDashboard'))
const ContactInboxDashboard = lazy(() => import('../components/ContactInboxDashboard/ContactInboxDashboard'))
const SupportDashboard = lazy(() => import('../components/SupportDashboard/SupportDashboard'))
const NewsletterDashboard = lazy(() => import('../components/NewsletterDashboard/NewsletterDashboard'))
const CommentDigestDashboard = lazy(() => import('../components/CommentDigestDashboard/CommentDigestDashboard'))
const FunnelDashboard = lazy(() => import('../components/FunnelDashboard/FunnelDashboard'))
const CookieConsentDashboard = lazy(() => import('../components/CookieConsentDashboard/CookieConsentDashboard'))
const VerificationDashboard = lazy(() => import('../components/VerificationDashboard/VerificationDashboard'))
const ContentFilterDashboard = lazy(() => import('../components/ContentFilterDashboard/ContentFilterDashboard'))
const DisciplineDashboard = lazy(() => import('../components/DisciplineDashboard/DisciplineDashboard'))
const PremiumDashboard = lazy(() => import('../components/PremiumDashboard/PremiumDashboard'))
const RevenueDashboard = lazy(() => import('../components/RevenueDashboard/RevenueDashboard'))
const ScheduledDashboard = lazy(() => import('../components/ScheduledDashboard/ScheduledDashboard'))
const TagManagerDashboard = lazy(() => import('../components/TagManagerDashboard/TagManagerDashboard'))
const MoodDashboard = lazy(() => import('../components/MoodDashboard/MoodDashboard'))
const AdminSearchDashboard = lazy(() => import('../components/AdminSearchDashboard/AdminSearchDashboard'))
const EmailLogDashboard = lazy(() => import('../components/EmailLogDashboard/EmailLogDashboard'))
const SiteHealthDashboard = lazy(() => import('../components/SiteHealthDashboard/SiteHealthDashboard'))
const SiteSettingsDashboard = lazy(() => import('../components/SiteSettingsDashboard/SiteSettingsDashboard'))
const RateLimitsDashboard = lazy(() => import('../components/RateLimitsDashboard/RateLimitsDashboard'))
const BlocklistDashboard = lazy(() => import('../components/BlocklistDashboard/BlocklistDashboard'))
const AuditLogDashboard = lazy(() => import('../components/AuditLogDashboard/AuditLogDashboard'))
const EmailTemplatesDashboard = lazy(() => import('../components/EmailTemplatesDashboard/EmailTemplatesDashboard'))
const SeoDashboard = lazy(() => import('../components/SeoDashboard/SeoDashboard'))
const HeatmapDashboard = lazy(() => import('../components/HeatmapDashboard/HeatmapDashboard'))
const ToxicityDashboard = lazy(() => import('../components/ToxicityDashboard/ToxicityDashboard'))
const LoginMapDashboard = lazy(() => import('../components/LoginMapDashboard/LoginMapDashboard'))
const AnalyticsDashboard = lazy(() => import('../components/AnalyticsDashboard/AnalyticsDashboard'))
const ErrorLogDashboard = lazy(() => import('../components/ErrorLogDashboard/ErrorLogDashboard'))
const VideosDashboard = lazy(() => import('../components/VideosDashboard/VideosDashboard'))
const TrueStoriesDashboard = lazy(() => import('../components/TrueStoriesDashboard/TrueStoriesDashboard'))
const FeaturedAuthorsDashboard = lazy(() => import('../components/FeaturedAuthorsDashboard/FeaturedAuthorsDashboard'))
const SpotlightDashboard = lazy(() => import('../components/SpotlightDashboard/SpotlightDashboard'))
const PollsDashboard = lazy(() => import('../components/PollsDashboard/PollsDashboard'))
const CalendarDashboard = lazy(() => import('../components/CalendarDashboard/CalendarDashboard'))
const MergeStoriesDashboard = lazy(() => import('../components/MergeStoriesDashboard/MergeStoriesDashboard'))


// A plain function (not a component) that gives back the routes, so
// they can sit inside App's <Routes> like they were written there.
export function dashboardRoutes() {
  // ADMIN DASHBOARD: sidebar, no site header.
  // The guard wraps the whole layout, so EVERY page inside is
  // admins-only - no need to protect each one separately.
  return (
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
        <Route path='true-stories' element={<TrueStoriesDashboard />} />
      </Route>
  )
}
