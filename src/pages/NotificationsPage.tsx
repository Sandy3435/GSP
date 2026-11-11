import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../lib/platformStore'
import type { AppNotification } from '../lib/platformStore'

const typeIcons: Record<AppNotification['type'], string> = {
  opportunity: 'explore',
  sprint: 'school',
  community: 'forum',
  deadline: 'schedule',
  booking: 'event_available',
  system: 'info',
}

const typeTones: Record<AppNotification['type'], string> = {
  opportunity: 'bg-secondary-container text-on-secondary-container',
  sprint: 'bg-tertiary-fixed text-on-tertiary-fixed',
  community: 'bg-primary-fixed text-on-primary-fixed',
  deadline: 'bg-error-container text-on-error-container',
  booking: 'bg-secondary-container text-on-secondary-container',
  system: 'bg-surface-container-high text-primary',
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<AppNotification[]>([])

  useEffect(() => {
    if (user) setNotifs(getNotifications(user.id))
  }, [user])

  const reload = () => {
    if (user) setNotifs(getNotifications(user.id))
  }

  if (!user) return null

  const handleMarkAll = () => {
    markAllNotificationsRead(user.id)
    reload()
  }

  const handleClick = (n: AppNotification) => {
    markNotificationRead(n.id)
    reload()
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary">
            Notifications
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Updates on opportunities, sprints, and community.
          </p>
        </div>
        {notifs.some((n) => !n.read) && (
          <button
            type="button"
            onClick={handleMarkAll}
            className="font-label-sm text-label-sm font-semibold text-secondary hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-surface-container-low p-space-xl text-center">
          <span className="material-symbols-outlined text-[48px] text-outline">notifications_off</span>
          <p className="font-label-md text-label-md font-semibold text-on-surface">
            You're all caught up
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            New matches, sprint reminders, and replies will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifs.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={`flex items-start gap-3 rounded-xl p-space-md text-left shadow-sm transition-colors ${
                n.read ? 'bg-surface-container-lowest' : 'bg-secondary-container/30'
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${typeTones[n.type]}`}>
                <span className="material-symbols-outlined text-[18px]">
                  {typeIcons[n.type]}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-label-sm text-label-sm ${n.read ? 'text-on-surface' : 'font-bold text-on-surface'}`}>
                  {n.title}
                </p>
                <p className="mt-0.5 line-clamp-2 font-body-sm text-body-sm text-on-surface-variant">
                  {n.body}
                </p>
                <p className="mt-1 font-label-xs text-label-xs text-on-surface-variant/70">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-error" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
