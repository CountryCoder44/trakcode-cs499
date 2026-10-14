import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import LearnStackSelectPage from './pages/LearnStackSelectPage';
import LearnTreePage from './pages/LearnTreePage';
import LearnLessonPage from './pages/LearnLessonPage';
import PracticeModeSelectPage from './pages/PracticeModeSelectPage';
import PracticeWorkspacePage from './pages/PracticeWorkspacePage';
import FlashCardSessionPage from './pages/FlashCardSessionPage';
import PublicProfilePage from './pages/PublicProfilePage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import RoadmapPage from './pages/RoadmapPage';
import BillingPage from './pages/BillingPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
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
        <Route
          path="/learn"
          element={
            <ProtectedRoute>
              <LearnStackSelectPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learn/:stack"
          element={
            <ProtectedRoute>
              <LearnTreePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learn/:stack/:itemId"
          element={
            <ProtectedRoute>
              <LearnLessonPage />
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
          path="/practice/flash"
          element={
            <ProtectedRoute>
              <FlashCardSessionPage />
            </ProtectedRoute>
          }
        />
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
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/u/:slug" element={<PublicProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
