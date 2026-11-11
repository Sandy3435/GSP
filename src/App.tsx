import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import ServicesPage from './pages/ServicesPage'
import SprintsPage from './pages/SprintsPage'
import CoursesPage from './pages/CoursesPage'
import CourseDetailPage from './pages/CourseDetailPage'
import CommunityPage from './pages/CommunityPage'
import ThreadPage from './pages/ThreadPage'
import OpportunitiesPage from './pages/OpportunitiesPage'
import OpportunityDetailPage from './pages/OpportunityDetailPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ProfilePage from './pages/ProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import AdminPage from './pages/AdminPage'
import MentorPage from './pages/MentorPage'

function LoadingScreen() {
  return (
    <div className="flex h-40 items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-[28px] text-primary">
        progress_activity
      </span>
    </div>
  )
}

/** Auth pages only render once the session has been checked. */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return user ? <Navigate to="/" replace /> : <>{children}</>
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className={`min-h-dvh bg-surface text-on-surface ${user ? 'md:pl-[280px]' : ''}`}>
      {user && <Header onOpenSidebar={() => setSidebarOpen(true)} />}
      {user && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <main className={`px-margin pb-8 ${user ? 'pt-20 md:pt-24' : 'pt-8'}`}>
        <div className="mx-auto w-full max-w-[430px] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl">
          <Routes>
            {/* Public auth routes */}
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <GuestRoute>
                  <SignupPage />
                </GuestRoute>
              }
            />

            {/* Account routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            {/* Role dashboards */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mentor"
              element={
                <ProtectedRoute roles={['mentor', 'admin']}>
                  <MentorPage />
                </ProtectedRoute>
              }
            />

            {/* Platform */}
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
            <Route path="/sprints" element={<ProtectedRoute><SprintsPage /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
            <Route path="/courses/:courseId" element={<ProtectedRoute><CourseDetailPage /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
            <Route path="/community/:postId" element={<ProtectedRoute><ThreadPage /></ProtectedRoute>} />
            <Route path="/opportunities" element={<ProtectedRoute><OpportunitiesPage /></ProtectedRoute>} />
            <Route path="/opportunities/:oppId" element={<ProtectedRoute><OpportunityDetailPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
