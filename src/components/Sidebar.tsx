import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth()

  const role = user?.role ?? 'student'
  const studentItems = [
    { to: '/', label: 'Home', icon: 'dashboard' },
    { to: '/profile', label: 'Profile', icon: 'person' },
    { to: '/notifications', label: 'Notifications', icon: 'notifications' },
    { to: '/courses', label: 'Courses', icon: 'auto_stories' },
    { to: '/opportunities', label: 'Opportunities', icon: 'explore' },
    { to: '/community', label: 'Community', icon: 'forum' },
    { to: '/sprints', label: 'Sprints', icon: 'school' },
    { to: '/services', label: 'Services', icon: 'handshake' },
  ]
  const mentorItems = [
    { to: '/mentor', label: 'Mentor Dashboard', icon: 'school' },
    { to: '/profile', label: 'Profile', icon: 'person' },
    { to: '/notifications', label: 'Notifications', icon: 'notifications' },
    { to: '/community', label: 'Community', icon: 'forum' },
    { to: '/sprints', label: 'My Sprints', icon: 'groups' },
    { to: '/services', label: 'Bookings', icon: 'calendar_month' },
  ]
  const adminItems = [
    { to: '/admin', label: 'Admin Dashboard', icon: 'admin_panel_settings' },
    { to: '/notifications', label: 'Notifications', icon: 'notifications' },
    { to: '/opportunities', label: 'Opportunities', icon: 'explore' },
    { to: '/courses', label: 'Courses', icon: 'auto_stories' },
    { to: '/sprints', label: 'Sprints', icon: 'school' },
    { to: '/services', label: 'Services', icon: 'handshake' },
    { to: '/community', label: 'Community', icon: 'forum' },
    { to: '/profile', label: 'My Profile', icon: 'person' },
  ]
  const navItems =
    role === 'admin' ? adminItems : role === 'mentor' ? mentorItems : studentItems

  return (
    <div
      className={`fixed inset-0 z-50 mx-auto max-w-[430px] ${open ? '' : 'pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Main navigation"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-primary/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        className={`absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col justify-between border-r border-surface-container bg-surface-container-lowest shadow-xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col space-y-space-md overflow-y-auto p-space-md">
          <div className="flex items-center justify-between border-b border-surface-container pb-space-sm">
            <Logo withWordmark />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Streak card */}
          <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-space-sm">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[22px] text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
              <div className="flex flex-col">
                <span className="font-label-xs text-label-xs font-bold text-on-surface">
                  5-Day Sprint Streak
                </span>
                <span className="font-label-xs text-label-xs text-on-surface-variant">
                  Keep the momentum!
                </span>
              </div>
            </div>
            <span className="rounded-full bg-secondary-container px-2 py-0.5 font-label-xs text-label-xs font-bold text-on-secondary-container">
              Active
            </span>
          </div>

          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-space-sm rounded-lg px-3 py-2.5 font-label-md text-label-md transition-colors ${
                    isActive
                      ? 'bg-primary-container font-bold text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`
                }
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={
                    item.to === '/sprints'
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-surface-container bg-surface-container-lowest p-space-md">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container font-label-sm text-label-sm font-bold text-on-primary">
                {(user?.name ?? 'G').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-label-sm text-label-sm font-bold text-on-surface">
                  {user?.name ?? 'Guest'}
                </p>
                <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                  {user?.role ?? 'visitor'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                logout()
                onClose()
              }}
              aria-label="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-error"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
