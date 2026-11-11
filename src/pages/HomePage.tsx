import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPublishedOpportunities } from '../lib/store'
import {
  getInfoSessions,
  getPublishedSprints,
  getUserSprints,
  getSavedOpportunityIds,
  toggleSessionRsvp,
  getSessionRsvps,
} from '../lib/platformStore'
import { matchScore } from '../lib/matching'
import type { Opportunity, LiveSession, Sprint } from '../data/mockData'
import { MatchBadge, SectionHeader, SeeAllLink } from '../components/ui'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const timeBadgeTones: Record<string, string> = {
  error: 'bg-error-container text-on-error-container font-semibold',
  neutral: 'bg-surface-container text-on-surface-variant font-semibold',
  secondary: 'bg-secondary-container text-on-secondary-container font-bold',
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [attending, setAttending] = useState<string[]>([])
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [joinedSprints, setJoinedSprints] = useState<(Sprint & { enrolledUsers: string[] })[]>([])

  useEffect(() => {
    setSessions(getInfoSessions().filter((s) => s.published !== false && s.audience !== 'mentors'))
    getPublishedOpportunities().then(setOpps)
    if (user) {
      setJoinedSprints(getUserSprints(user.id))
      setAttending(getSessionRsvps(user.id))
    }
  }, [user])

  const toggleRsvp = (id: string) => {
    if (!user) return
    toggleSessionRsvp(user.id, id)
    setAttending(getSessionRsvps(user.id))
  }

  // Suggested opportunities: top matches that have not been saved yet.
  const watchlist = useMemo(() => {
    if (!profile || opps.length === 0) return []
    const saved = user ? getSavedOpportunityIds(user.id) : []
    return opps
      .map((opp) => ({ opp, score: matchScore(profile, opp.eligibility) }))
      .filter(({ opp, score }) => score >= 80 && !saved.includes(opp.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [profile, opps, user])

  const activeSprint = joinedSprints[0] ?? null
  const nextMilestone = activeSprint?.milestones?.[0]
  const sprints = getPublishedSprints()

  return (
    <div className="flex flex-col gap-space-lg pb-4">
      <section className="flex flex-col pt-space-xs">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary">
              {greeting()}, {(profile?.firstName || user?.name?.split(' ')[0] || 'there')} 👋
            </h1>
            <span className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
              {activeSprint
                ? `You’re registered for ${activeSprint.title}`
                : 'Your personalised college-prep dashboard'}
            </span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container shadow-sm">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
          </div>
        </div>
      </section>

      {/* Active sprint — only for registered students */}
      {activeSprint && (
        <section className="relative overflow-hidden rounded-xl bg-primary-container p-space-md text-on-primary shadow-md">
          <div className="relative z-10 flex flex-col space-y-space-md">
            <div className="flex items-start justify-between gap-space-sm">
              <div className="flex flex-col">
                <div className="inline-flex w-max items-center gap-1.5 rounded-full bg-surface-container-lowest/15 px-2 py-0.5 backdrop-blur-md">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-secondary-fixed" />
                  <span className="font-label-xs text-label-xs font-semibold uppercase tracking-wider text-primary-fixed">
                    Active sprint
                  </span>
                </div>
                <h2 className="mt-1.5 text-headline-sm font-bold text-on-primary">{activeSprint.title}</h2>
                <p className="font-label-sm text-label-sm text-primary-fixed/80">{activeSprint.meta}</p>
              </div>
              <div className="text-right">
                <span className="text-headline-sm font-bold text-secondary-fixed">
                  {activeSprint.enrolledUsers.length}
                </span>
                <p className="font-label-xs text-label-xs text-primary-fixed/80">students</p>
              </div>
            </div>

            <div className="flex items-center gap-space-sm rounded-lg bg-primary/30 p-space-sm backdrop-blur-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-fixed/20 text-secondary-fixed">
                <span className="material-symbols-outlined text-[18px]">checklist</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-label-xs text-label-xs font-semibold uppercase tracking-wider text-primary-fixed">
                  Next milestone
                </span>
                <p className="truncate font-body-sm text-body-sm font-medium text-on-primary">
                  {nextMilestone?.title ?? activeSprint.objectives?.[0] ?? 'Check your sprint workspace'}
                </p>
                {nextMilestone && (
                  <span className="font-label-xs text-label-xs text-tertiary-fixed-dim">{nextMilestone.date}</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/sprints')}
              className="flex h-11 w-full items-center justify-center gap-space-xs rounded-lg bg-surface-container-lowest font-label-md text-label-md font-bold text-primary shadow-sm transition-transform active:scale-[0.98]"
            >
              <span>Open sprint workspace</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </section>
      )}

      {/* Live sessions */}
      <section className="flex flex-col space-y-space-sm">
        <SectionHeader icon="sensors" title="Live info sessions" />
        {sessions.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-4 text-center font-body-sm text-body-sm text-on-surface-variant">
            No live sessions are published yet.
          </div>
        )}
        <div className="-mx-margin flex snap-x snap-mandatory gap-space-md overflow-x-auto px-margin pb-2 pt-1 no-scrollbar scroll-smooth">
          {sessions.map((session) => {
            const isAttending = attending.includes(session.id)
            const isLive = session.timeTone === 'error'
            return (
              <div key={session.id} className="flex w-[290px] shrink-0 snap-start flex-col justify-between space-y-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                <div className="space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-xs text-label-xs ${timeBadgeTones[session.timeTone]}`}>
                      {isLive && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-error" />}
                      {session.timeBadge}
                    </span>
                    <span className="flex items-center gap-1 font-label-xs text-label-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px]">group</span>
                      {session.attendees}
                    </span>
                  </div>
                  <h4 className="line-clamp-2 font-label-md text-label-md font-bold leading-snug text-on-surface">{session.title}</h4>
                  {session.description && (
                    <p className="line-clamp-2 font-label-xs text-label-xs text-on-surface-variant">{session.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container font-label-xs text-label-xs font-bold text-on-primary">
                      {session.host[0]}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-label-xs text-label-xs font-bold text-on-surface">{session.host}</span>
                      <span className="truncate font-label-xs text-label-xs text-on-surface-variant">{session.hostDetail}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-space-xs pt-space-xs">
                  {session.meetingLink ? (
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-primary-container font-label-xs text-label-xs font-bold text-on-primary shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">videocam</span>
                      Join room
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleRsvp(session.id)}
                      className={`flex h-9 flex-1 items-center justify-center gap-1 rounded-lg font-label-xs text-label-xs font-bold transition-colors ${
                        isAttending
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]" style={isAttending ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        {isAttending ? 'check_circle' : 'notifications_active'}
                      </span>
                      {isAttending ? 'Attending!' : 'RSVP'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Suggested opportunities */}
      <section className="flex flex-col space-y-space-sm">
        <SectionHeader
          icon="flag"
          title="Suggested opportunities"
          action={<SeeAllLink label="All" onClick={() => navigate('/opportunities')} />}
        />
        {watchlist.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-4 text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Complete your profile to unlock personalised opportunity matches.
            </p>
          </div>
        )}
        <div className="flex flex-col space-y-space-sm">
          {watchlist.map(({ opp, score }) => (
            <button
              key={opp.id}
              type="button"
              onClick={() => navigate(`/opportunities/${opp.id}`)}
              className="flex flex-col space-y-space-sm rounded-xl bg-surface-container-lowest p-space-md text-left shadow-sm"
            >
              <div className="flex items-start justify-between gap-space-sm">
                <div className="flex min-w-0 flex-col">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <MatchBadge score={score} />
                    <span className="inline-flex items-center rounded-full bg-surface-container px-2 py-0.5 font-label-xs text-label-xs font-medium text-on-surface-variant">
                      {opp.tags[0] ?? 'Opportunity'}
                    </span>
                  </div>
                  <h4 className="mt-1 text-headline-sm font-bold text-on-surface">{opp.title}</h4>
                </div>
                <div className="shrink-0 rounded-lg bg-tertiary-fixed px-2.5 py-1 text-right text-on-tertiary-fixed">
                  <p className="font-label-xs text-label-xs font-bold tracking-tight">{opp.deadline}</p>
                  <p className="font-label-xs text-label-xs font-semibold text-tertiary">{opp.daysLeft} days left</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface-variant">
                  {opp.award}
                </span>
                <span className="flex items-center gap-1 font-label-xs text-label-xs font-bold text-primary">
                  View <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Upcoming sprints */}
      <section className="flex flex-col space-y-space-sm">
        <SectionHeader
          icon="school"
          title="Upcoming sprints"
          action={<SeeAllLink label="Browse" onClick={() => navigate('/sprints')} />}
        />
        <div className="flex flex-col gap-2">
          {sprints.slice(0, 2).map((sprint) => (
            <button
              key={sprint.id}
              type="button"
              onClick={() => navigate('/sprints')}
              className="flex items-center gap-3 rounded-xl bg-surface-container-lowest p-3 text-left shadow-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                <span className="material-symbols-outlined text-[20px]">{sprint.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-label-sm text-label-sm font-bold text-on-surface">{sprint.title}</p>
                <p className="font-label-xs text-label-xs text-on-surface-variant">{sprint.meta}</p>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
