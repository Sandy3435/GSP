import { useLocation } from 'react-router-dom'

const routeLabels: Record<string, string> = {
  '/': 'Home',
  '/courses': 'Courses',
  '/opportunities': 'Opportunities',
  '/community': 'Community',
  '/sprints': 'Sprints',
  '/services': 'Services',
}

interface HeaderProps {
  onOpenSidebar: () => void
}

export default function Header({ onOpenSidebar }: HeaderProps) {
  const { pathname } = useLocation()
  const label = routeLabels[pathname] ?? 'GSP'

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface/85 pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.03)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[430px] items-center justify-between gap-space-sm px-margin">
        <div className="flex items-center gap-space-sm">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={onOpenSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <span className="hidden rounded-full bg-surface-container px-space-xs py-0.5 font-label-sm text-label-sm text-on-surface-variant/80 sm:inline-block">
            {label}
          </span>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container/60 hover:text-on-surface focus:outline-none"
          >
            <span className="material-symbols-outlined text-[24px]">
              notifications
            </span>
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-error ring-2 ring-surface" />
          </button>
          <div className="flex items-center justify-center rounded-full p-0.5 ring-2 ring-primary-container/20">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container font-label-sm text-label-sm font-bold text-on-primary"
              aria-label="Profile"
            >
              M
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
