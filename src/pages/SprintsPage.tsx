import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getInfoSessions,
  getPublishedSprints,
  joinSprint,
  leaveSprint,
} from '../lib/platformStore'
import type { LiveSession, Sprint } from '../data/mockData'
import { ProgressBar } from '../components/ui'

type SprintTab = 'active' | 'browse'

type SprintWithEnrollment = Sprint & { enrolledUsers: string[] }

export default function SprintsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<SprintTab>('active')
  const [sprints, setSprints] = useState<SprintWithEnrollment[]>([])
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [error, setError] = useState('')

  const reload = () => {
    setSprints(getPublishedSprints())
    setSessions(getInfoSessions())
  }

  useEffect(() => {
    reload()
  }, [user])

  if (!user) return null

  const joined = sprints.filter((s) => s.enrolledUsers.includes(user.id))

  const enroll = (id: string) => {
    const res = joinSprint(user.id, id)
    if (!res.ok) {
      setError(res.error ?? 'Unable to join this sprint.')
      return
    }
    setError('')
    reload()
    setTab('active')
  }

  const leave = (id: string) => {
    leaveSprint(user.id, id)
    reload()
  }

  return (
    <div className="flex flex-col gap-space-lg pb-4">
      <div>
        <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary">
          Sprints &amp; Cohorts
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Administrator-led accountability sprints with mentors and live sessions.
        </p>
      </div>

      <div className="flex w-full items-center gap-1 rounded-xl bg-surface-container p-1 text-center">
        {([
          { id: 'active' as const, label: 'My Sprints', count: joined.length },
          { id: 'browse' as const, label: 'Browse Sprints', count: undefined },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 font-label-sm text-label-sm transition-all ${
              tab === t.id
                ? 'bg-surface-container-lowest font-bold text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                tab === t.id ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-error-container px-3 py-2 font-label-sm text-label-sm text-on-error-container">
          {error}
        </div>
      )}

      {tab === 'active' && (
        <div className="flex flex-col gap-space-md">
          {joined.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-low p-space-xl text-center">
              <span className="material-symbols-outlined text-[44px] text-outline">school</span>
              <div>
                <p className="text-headline-sm font-bold text-on-surface">No sprints joined yet</p>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  Browse administrator-created sprints and register for one that fits your goals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTab('browse')}
                className="rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md font-bold text-on-primary"
              >
                Browse sprints
              </button>
            </div>
          )}

          {joined.map((sprint) => (
            <SprintDetail
              key={sprint.id}
              sprint={sprint}
              sessions={sessions}
              joined
              onLeave={() => leave(sprint.id)}
            />
          ))}
        </div>
      )}

      {tab === 'browse' && (
        <div className="flex flex-col gap-space-md">
          {sprints.filter((s) => s.published !== false).length === 0 && (
            <div className="rounded-xl bg-surface-container-low p-space-md text-center">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No sprints are open right now. Check back soon.
              </p>
            </div>
          )}
          {sprints.map((sprint) => {
            const isJoined = sprint.enrolledUsers.includes(user.id)
            const remaining = Math.max(0, (sprint.capacity ?? 0) - sprint.enrolledUsers.length)
            const full = remaining === 0
            return (
              <SprintDetail
                key={sprint.id}
                sprint={sprint}
                sessions={sessions}
                joined={isJoined}
                full={full}
                onJoin={() => enroll(sprint.id)}
                onLeave={() => leave(sprint.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function SprintDetail({
  sprint,
  sessions,
  joined,
  full = false,
  onJoin,
  onLeave,
}: {
  sprint: SprintWithEnrollment
  sessions: LiveSession[]
  joined: boolean
  full?: boolean
  onJoin?: () => void
  onLeave?: () => void
}) {
  const remaining = Math.max(0, (sprint.capacity ?? 0) - sprint.enrolledUsers.length)
  const pct = sprint.capacity ? Math.min(100, (sprint.enrolledUsers.length / sprint.capacity) * 100) : 0
  const sprintSessions = sessions.filter((s) => (sprint.liveSessionIds ?? []).includes(s.id))

  return (
    <article className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
      <div className="h-1.5 w-full bg-gradient-to-r from-primary-container via-secondary to-secondary-fixed" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-secondary-container px-2.5 py-0.5 font-label-xs text-label-xs font-bold text-on-secondary-container">
                {sprint.badge}
              </span>
              <span className="font-label-xs text-label-xs text-on-surface-variant">{sprint.meta}</span>
            </div>
            <h2 className="text-headline-sm font-bold leading-tight text-primary">{sprint.title}</h2>
            <p className="font-label-xs text-label-xs text-on-surface-variant">
              {sprint.enrolledUsers.length} enrolled • {remaining} of {sprint.capacity ?? '—'} spots remaining
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary">
            <span className="material-symbols-outlined text-[22px]">{sprint.icon}</span>
          </div>
        </div>

        <ProgressBar value={pct} className="bg-surface-container-high" />

        <p className="font-body-sm text-body-sm text-on-surface-variant">{sprint.description}</p>

        {sprint.objectives && sprint.objectives.length > 0 && (
          <div>
            <p className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">Objectives</p>
            <ul className="mt-1 flex flex-col gap-1">
              {sprint.objectives.map((objective) => (
                <li key={objective} className="flex items-start gap-1.5 font-body-sm text-body-sm text-on-surface">
                  <span className="material-symbols-outlined mt-0.5 text-[15px] text-secondary">target</span>
                  {objective}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sprint.milestones && sprint.milestones.length > 0 && (
          <div>
            <p className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">Milestones</p>
            <div className="mt-1 flex flex-col gap-1">
              {sprint.milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between rounded-lg bg-surface-container-low px-2.5 py-1.5">
                  <span className="font-label-xs text-label-xs font-semibold text-on-surface">{milestone.title}</span>
                  <span className="font-label-xs text-label-xs text-on-surface-variant">{milestone.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sprint.mentorNames && sprint.mentorNames.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-surface-container-low p-2.5">
            <span className="material-symbols-outlined text-[18px] text-secondary">school</span>
            <div className="min-w-0">
              <p className="font-label-xs text-label-xs text-on-surface-variant">Assigned mentors</p>
              <p className="truncate font-label-sm text-label-sm font-semibold text-primary">
                {sprint.mentorNames.join(', ')}
              </p>
            </div>
          </div>
        )}

        {sprintSessions.length > 0 && (
          <div>
            <p className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">Live sessions</p>
            <div className="mt-1 flex flex-col gap-1">
              {sprintSessions.map((session) => (
                <div key={session.id} className="flex flex-col rounded-lg bg-surface-container-low px-2.5 py-1.5">
                  <span className="font-label-xs text-label-xs font-semibold text-on-surface">{session.title}</span>
                  <span className="font-label-xs text-label-xs text-on-surface-variant">{session.timeBadge}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {joined ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLeave}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-container font-label-sm text-label-sm font-bold text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[17px]">logout</span>
              Leave sprint
            </button>
            <span className="flex items-center gap-1 rounded-lg bg-secondary-container px-3 py-2.5 font-label-sm text-label-sm font-bold text-on-secondary-container">
              <span className="material-symbols-outlined text-[17px]">check_circle</span>
              Registered
            </span>
          </div>
        ) : full ? (
          <div className="flex h-10 items-center justify-center rounded-lg bg-surface-container-high font-label-sm text-label-sm font-bold text-on-surface-variant">
            Sprint full — registration closed
          </div>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary-container font-label-md text-label-md font-bold text-on-primary shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
            Register for sprint
          </button>
        )}
      </div>
    </article>
  )
}
