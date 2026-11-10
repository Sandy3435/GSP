import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import ServicesPage from './pages/ServicesPage'
import SprintsPage from './pages/SprintsPage'
import CoursesPage from './pages/CoursesPage'
import CommunityPage from './pages/CommunityPage'
import OpportunitiesPage from './pages/OpportunitiesPage'

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-surface text-on-surface">
      <Header onOpenSidebar={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-x-hidden px-margin pb-24 pt-20">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/sprints" element={<SprintsPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
