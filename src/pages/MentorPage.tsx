import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getServices } from '../lib/store'
import {
  getBookings,
  getMentorTracks,
  getPosts,
  getSprints,
} from '../lib/platformStore'
import type { Booking } from '../lib/platformStore'
import type { Post, Service, Sprint } from '../data/mockData'

type Tab = 'overview' | 'sprints' | 'services' | 'community'

export default function MentorPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [sprints, setSprints] = useState<(Sprint & { enrolledUsers: string[] })[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [tracks, setTracks] = useState<string[]>([])

  useEffect(() => {
    if (!user) return
    setSprints(getSprints().filter((s) => (s.mentorIds ?? []).includes(user.id)))
    setBookings(getBookings().filter((b) => b.mentorId === user.id))
    setTracks(getMentorTracks(user.id))
    setPosts(getPosts())
    getServices().then((all) => setServices(all.filter((s) => s.mentorId === user.id)))
  }, [user])

  const relevantPosts = useMemo(() => {
    if (tracks.length === 0) return posts.slice(0, 5)
    return posts.filter((post) =>
      (post.tags ?? [post.tag]).some((tag) =>
        tracks.some((track) => tag.toLowerCase().includes(track.toLowerCase())),
      ),
    )
  }, [posts, tracks])

  if (!user) return null

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'sprints', label: 'Sprints', icon: 'groups' },
    { id: 'services', label: 'Calendar', icon: 'calendar_month' },
    { id: 'community', label: 'Questions', icon: 'forum' },
  ]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-space-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary md:text-headline-lg">
            Mentor Dashboard
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Welcome back, {user.name}.
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
          <span className="material-symbols-outlined text-[22px]">school</span>
        </div>
      </div>

      <div className="no-scrollbar flex flex-wrap items-center gap-1 overflow-x-auto rounded-xl bg-surface-container p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 font-label-sm text-label-sm transition-all ${
              tab === t.id
                ? 'bg-surface-container-lowest font-bold text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="flex flex-col gap-space-md">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Sprints" value={sprints.length} icon="groups" />
            <Stat label="Bookings" value={bookings.length} icon="calendar_month" />
            <Stat
              label="Upcoming"
              value={bookings.filter((b) => b.status === 'confirmed' || b.status === 'requested').length}
              icon="event_upcoming"
            />
          </div>
          <Card title="Your specialisation tracks" icon="local_offer">
            {tracks.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No tracks assigned yet. An administrator can assign tracks such as
                Undergraduate Admissions, Scholarship Applications, or Essay Writing.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tracks.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-secondary-container px-2.5 py-1 font-label-xs text-label-xs font-bold text-on-secondary-container"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Card>
          <Card title="Next appointments" icon="schedule">
            {bookings.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No service appointments assigned yet.
              </p>
            ) : (
              bookings.slice(0, 3).map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-container-low p-3">
                  <div className="min-w-0">
                    <p className="truncate font-label-sm text-label-sm font-bold text-on-surface">
                      {b.studentName} • {b.serviceTitle}
                    </p>
                    <p className="font-label-xs text-label-xs text-on-surface-variant">
                      {b.date} at {b.time}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {tab === 'sprints' && (
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
          {sprints.length === 0 && <Empty icon="groups" text="No sprints assigned to you yet." />}
          {sprints.map((sprint) => (
            <div key={sprint.id} className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-label-md text-label-md font-bold text-primary">{sprint.title}</h2>
                <span className="shrink-0 rounded-full bg-secondary-container px-2 py-0.5 font-label-xs text-label-xs font-bold text-on-secondary-container">
                  {sprint.enrolledUsers.length} students
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{sprint.description}</p>
              <p className="font-label-xs text-label-xs text-on-surface-variant">{sprint.meta}</p>
              {sprint.objectives && sprint.objectives.length > 0 && (
                <div>
                  <p className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">Objectives</p>
                  <ul className="mt-1 list-inside list-disc font-body-sm text-body-sm text-on-surface-variant">
                    {sprint.objectives.map((o) => <li key={o}>{o}</li>)}
                  </ul>
                </div>
              )}
              {sprint.milestones && sprint.milestones.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">Milestones</p>
                  {sprint.milestones.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg bg-surface-container-low px-2.5 py-1.5">
                      <span className="font-label-xs text-label-xs text-on-surface">{m.title}</span>
                      <span className="font-label-xs text-label-xs text-on-surface-variant">{m.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'services' && (
        <div className="flex flex-col gap-space-md">
          <Card title="Assigned services" icon="handshake">
            {services.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No services assigned yet.
              </p>
            ) : (
              services.map((s) => (
                <div key={s.id} className="rounded-xl bg-surface-container-low p-3">
                  <p className="font-label-sm text-label-sm font-bold text-on-surface">{s.title}</p>
                  <p className="font-label-xs text-label-xs text-on-surface-variant">{s.price} {s.priceUnit}</p>
                </div>
              ))
            )}
          </Card>
          <Card title="Appointment calendar" icon="calendar_month">
            {bookings.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No bookings assigned yet.
              </p>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-label-sm text-label-sm font-bold text-on-surface">{b.studentName}</p>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="font-label-xs text-label-xs text-on-surface-variant">{b.serviceTitle}</p>
                  <p className="font-label-xs text-label-xs font-semibold text-primary">
                    {b.date} • {b.time}
                  </p>
                  {b.notes && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">“{b.notes}”</p>
                  )}
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {tab === 'community' && (
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
          <Card title="Questions in your tracks" icon="forum">
            {relevantPosts.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No questions match your tracks yet. Browse the community to help.
              </p>
            ) : (
              relevantPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/community/${post.id}`}
                  className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-3 transition-colors hover:bg-surface-container"
                >
                  <span className="font-label-sm text-label-sm font-bold text-on-surface">{post.title}</span>
                  <span className="font-label-xs text-label-xs text-on-surface-variant">
                    {(post.tags ?? [post.tag]).join(' • ')} • {post.replies} responses
                  </span>
                </Link>
              ))
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-surface-container-lowest p-3 shadow-sm">
      <span className="material-symbols-outlined text-[20px] text-secondary">{icon}</span>
      <span className="text-headline-sm font-bold text-primary">{value}</span>
      <span className="font-label-xs text-label-xs text-on-surface-variant">{label}</span>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[19px] text-secondary">{icon}</span>
        <h2 className="font-label-md text-label-md font-bold text-primary">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function StatusBadge({ status }: { status: Booking['status'] }) {
  const tones: Record<Booking['status'], string> = {
    requested: 'bg-tertiary-fixed text-on-tertiary-fixed',
    confirmed: 'bg-secondary-container text-on-secondary-container',
    completed: 'bg-surface-container-high text-primary',
    cancelled: 'bg-error-container text-on-error-container',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 font-label-xs text-[10px] font-bold capitalize ${tones[status]}`}>
      {status}
    </span>
  )
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-container-low p-space-lg text-center">
      <span className="material-symbols-outlined text-[32px] text-outline">{icon}</span>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{text}</p>
    </div>
  )
}
