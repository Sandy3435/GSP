import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/sprints', label: 'Sprints', icon: 'local_fire_department' },
  { to: '/services', label: 'Services', icon: 'handshake' },
  { to: '/community', label: 'Community', icon: 'forum' },
  { to: '/opportunities', label: 'Opps', icon: 'explore' },
]

/**
 * Mobile bottom tab bar — 5 key destinations per DESIGN.md.
 * Active item uses forest green with an elevated 4px dot indicator.
 */
export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-container bg-surface-container-lowest pb-safe shadow-[0_-4px_6px_-1px_rgba(27,67,50,0.05),0_-2px_4px_-2px_rgba(27,67,50,0.04)]">
      <div className="mx-auto flex h-16 max-w-[430px] items-stretch justify-between px-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg font-label-xs text-label-xs transition-colors ${
                isActive
                  ? 'font-bold text-primary'
                  : 'font-semibold text-on-surface-variant hover:text-primary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={
                    isActive
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
