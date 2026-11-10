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
import CommunityPage from './pages/CommunityPage'
import OpportunitiesPage from './pages/OpportunitiesPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-surface text-on-surface">
      {user && <Header onOpenSidebar={() => setSidebarOpen(true)} />}
      {user && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <main className={`flex-1 overflow-x-hidden px-margin ${user ? 'pb-8 pt-20' : 'pb-8 pt-8'}`}>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignupPage />} />

          {/* Protected routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* Public app routes */}
          <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" replace />} />
          <Route path="/services" element={user ? <ServicesPage /> : <Navigate to="/login" replace />} />
          <Route path="/sprints" element={user ? <SprintsPage /> : <Navigate to="/login" replace />} />
          <Route path="/courses" element={user ? <CoursesPage /> : <Navigate to="/login" replace />} />
          <Route path="/community" element={user ? <CommunityPage /> : <Navigate to="/login" replace />} />
          <Route path="/opportunities" element={user ? <OpportunitiesPage /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
