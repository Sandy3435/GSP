import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getOpportunities } from '../lib/store'
import { getInfoSessions, getUserSprints, getSavedOpportunityIds } from '../lib/platformStore'
import { matchScore } from '../lib/matching'
import type { Opportunity } from '../data/mockData'
import type { LiveSession, Sprint } from '../data/mockData'
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
  const [attending, setAttending] = useState<Set<string>>(new Set())
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [joinedSprints, setJoinedSprints] = useState<Sprint[]>([])

  useEffect(() => {
    setSessions(getInfoSessions())
    getOpportunities().then(setOpps)
    if (user) setJoinedSprints(getUserSprints(user.id))
  }, [user])

  const toggleRsvp = (id: string) => {
    setAttending((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Watchlist: top matches not yet saved
  const watchlist = useMemo(() => {
    if (!profile || opps.length === 0) return []
    const saved = user ? getSavedOpportunityIds(user.id) : []
    return opps
      .map((opp) => ({ opp, score: matchScore(profile, opp.eligibility) }))
      .filter(({ opp, score }) => score >= 85 && !saved.includes(opp.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [profile, opps, user])

  const activeSprint = joinedSprints[0] ?? null

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Friendly greeting */}
      <section className="flex flex-col pt-space-xs">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary">
              {greeting()}, {(profile?.firstName || user?.name?.split(' ')[0] || 'there')} 👋
            </h1>
            <span className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
              5-day sprint streak • Keep it burning
            </span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container shadow-sm">
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
          </div>
        </div>
      </section>

      {/* Active cohort sprint banner — only when joined a sprint */}
      {activeSprint && (
        <section className="relative overflow-hidden rounded-xl bg-primary-container p-space-md text-on-primary shadow-md">
          <div className="relative z-10 flex flex-col space-y-space-md">
            <div className="flex items-start justify-between gap-space-sm">
              <div className="flex flex-col">
                <div className="inline-flex w-max items-center gap-1.5 rounded-full bg-surface-container-lowest/15 px-2 py-0.5 backdrop-blur-md">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-secondary-fixed" />
                  <span className="font-label-xs text-label-xs font-semibold uppercase tracking-wider text-primary-fixed">
                    Active Sprint
                  </span>
                </div>
                <h2 className="mt-1.5 text-headline-sm font-bold text-on-primary">
                  {activeSprint.title}
                </h2>
                <p className="font-label-sm text-label-sm text-primary-fixed/80">
                  {activeSprint.meta}
                </p>
              </div>
              <div className="text-right">
                <span className="text-headline-sm font-bold text-secondary-fixed">
                  Day 4
                </span>
                <p className="font-label-xs text-label-xs text-primary-fixed/80">
                  of 14
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary/40 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-secondary-fixed to-secondary transition-all duration-500 ease-out"
                  style={{ width: '28.5%' }}
                />
              </div>
              <div className="flex justify-between px-0.5 font-label-xs text-label-xs text-primary-fixed/70">
                <span>Brainstorming</span>
                <span className="font-semibold text-secondary-fixed">Drafting (Active)</span>
                <span>Peer Review</span>
                <span>Polishing</span>
              </div>
            </div>

            <div className="flex items-center gap-space-sm rounded-lg bg-primary/30 p-space-sm backdrop-blur-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-fixed/20 text-secondary-fixed">
                <span className="material-symbols-outlined text-[18px]">checklist</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-label-xs text-label-xs font-semibold uppercase tracking-wider text-primary-fixed">
                  Next Sprint Milestone
                </span>
                <p className="truncate font-body-sm text-body-sm font-medium text-on-primary">
                  Peer Review Circle
                </p>
                <span className="font-label-xs text-label-xs text-tertiary-fixed-dim">
                  Due today, 8:00 PM EST
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/sprints')}
              className="flex h-11 w-full items-center justify-center gap-space-xs rounded-lg bg-surface-container-lowest font-label-md text-label-md font-bold text-primary shadow-sm transition-transform active:scale-[0.98]"
            >
              <span>Open Sprint Workspace</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </section>
      )}

      {/* Live info sessions */}
      <section className="flex flex-col space-y-space-sm">
        <SectionHeader
          icon="sensors"
          title="Live Info Sessions"
          action={<SeeAllLink label="See all" />}
        />
        <div className="-mx-margin flex snap-x snap-mandatory gap-space-md overflow-x-auto px-margin pb-2 pt-1 no-scrollbar scroll-smooth">
          {sessions.map((session) => {
            const isAttending = attending.has(session.id)
            const isLive = session.timeTone === 'error'
            return (
              <div
                key={session.id}
                className="flex w-[290px] shrink-0 snap-start flex-col justify-between space-y-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
              >
                <div className="space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-xs text-label-xs ${timeBadgeTones[session.timeTone]}`}
                    >
                      {isLive && (
                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-error" />
                      )}
                      {session.timeBadge}
                    </span>
                    <span className="flex items-center gap-1 font-label-xs text-label-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px]">
                        {session.saved ? 'bookmark' : 'group'}
                      </span>
                      {session.saved ? 'Saved Opp' : session.attendees}
                    </span>
                  </div>
                  <h4 className="line-clamp-2 font-label-md text-label-md font-bold leading-snug text-on-surface">
                    {session.title}
                  </h4>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container font-label-xs text-label-xs font-bold text-on-primary">
                      {session.host[0]}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-label-xs text-label-xs font-bold text-on-surface">
                        {session.host}
                      </span>
                      <span className="truncate font-label-xs text-label-xs text-on-surface-variant">
                        {session.hostDetail}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-space-xs pt-space-xs">
                  {isLive ? (
                    <button
                      type="button"
                      className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-primary-container font-label-xs text-label-xs font-bold text-on-primary shadow-sm transition-transform active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">videocam</span>
                      Join Room
                    </button>
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
                      <span
                        className="material-symbols-outlined text-[16px]"
                        style={isAttending ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        {isAttending ? 'check_circle' : 'notifications_active'}
                      </span>
                      {isAttending ? 'Attending!' : 'RSVP'}
                    </button>
                  )}
                  <button
                    type="button"
                    title="Add to calendar"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Opportunity watchlist — top matches not yet saved */}
      {watchlist.length > 0 && (
        <section className="flex flex-col space-y-space-sm">
          <SectionHeader
            icon="flag"
            title="Opportunity Watchlist"
            action={<SeeAllLink label="All" onClick={() => navigate('/opportunities')} />}
          />
          <div className="flex flex-col space-y-space-sm">
            {watchlist.map(({ opp, score }) => (
              <div
                key={opp.id}
                className="flex flex-col space-y-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
              >
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="flex min-w-0 flex-col">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <MatchBadge score={score} />
                      <span className="inline-flex items-center rounded-full bg-surface-container px-2 py-0.5 font-label-xs text-label-xs font-medium text-on-surface-variant">
                        {opp.tags[0] ?? 'Opportunity'}
                      </span>
                    </div>
                    <h4 className="mt-1 text-headline-sm font-bold text-on-surface">
                      {opp.title}
                    </h4>
                  </div>
                  <div className="shrink-0 rounded-lg bg-tertiary-fixed px-2.5 py-1 text-right text-on-tertiary-fixed">
                    <p className="font-label-xs text-label-xs font-bold tracking-tight">{opp.deadline}</p>
                    <p className="font-label-xs text-label-xs font-semibold text-tertiary">{opp.daysLeft} days left</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-outline" />
                    <span className="font-label-sm text-label-sm font-semibold text-on-surface-variant">
                      Top match for you
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/opportunities')}
                    className="flex h-8 items-center gap-1 rounded-lg bg-surface-container-low px-3 font-label-xs text-label-xs font-bold text-primary transition-colors hover:bg-surface-container"
                  >
                    View <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
