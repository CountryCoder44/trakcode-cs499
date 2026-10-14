import { Navigate, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import SeqCoursePage from './pages/SeqCoursePage';
import SeqTopicPage from './pages/SeqTopicPage';
import PracticeModeSelectPage from './pages/PracticeModeSelectPage';
import PracticeWorkspacePage from './pages/PracticeWorkspacePage';
import PracticeAttemptPage from './pages/PracticeAttemptPage';
import PublicProfilePage from './pages/PublicProfilePage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import RoadmapPage from './pages/RoadmapPage';
import BillingPage from './pages/BillingPage';
import AdminPage from './pages/AdminPage';
import MessagesPage from './pages/MessagesPage';
import NotFoundPage from './pages/NotFoundPage';
import PricingPage from './pages/public/PricingPage';
import { TermsPage, PrivacyPage, RefundsPage, ContactPage } from './pages/public/LegalPages';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/refunds" element={<RefundsPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      <Route element={<Layout />}>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        {/* The original Learn Mode was retired; old links land on the course list. */}
        <Route path="/learn/*" element={<Navigate to="/courses" replace />} />
        <Route
          path="/courses"
          element={
            <ProtectedRoute>
              <CoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/course/:course"
          element={
            <ProtectedRoute>
              <SeqCoursePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/course/:course/:topicId"
          element={
            <ProtectedRoute>
              <SeqTopicPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/practice"
          element={
            <ProtectedRoute>
              <PracticeModeSelectPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/practice/workspace/:problemId"
          element={
            <ProtectedRoute>
              <PracticeWorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/practice/attempt/:attemptId"
          element={
            <ProtectedRoute>
              <PracticeAttemptPage />
            </ProtectedRoute>
          }
        />
        {/* Flash cards are a post-launch addition: the page stays in the code
            (FlashCardSessionPage) but isn't reachable until then. */}
        <Route path="/practice/flash" element={<Navigate to="/practice" replace />} />
        <Route
          path="/settings/profile"
          element={
            <ProtectedRoute>
              <ProfileSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <BillingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:threadId"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/u/:slug" element={<PublicProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
