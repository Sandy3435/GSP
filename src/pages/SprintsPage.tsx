import { useEffect, useState } from 'react'
import { getSprints, joinSprint, leaveSprint } from '../lib/platformStore'
import { cohorts, sprintDays } from '../data/mockData'
import type { Sprint } from '../data/mockData'
import { ProgressBar, SeeAllLink } from '../components/ui'
import { useAuth } from '../context/AuthContext'

type SprintTab = 'active' | 'browse' | 'cohorts'

const tabs: { id: SprintTab; label: string; count?: number }[] = [
  { id: 'active', label: 'Active Cohorts', count: 1 },
  { id: 'browse', label: 'Browse Sprints' },
  { id: 'cohorts', label: 'Cohorts' },
]

type SubmitState = 'idle' | 'uploading' | 'done'

export default function SprintsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<SprintTab>('active')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [sprints, setSprints] = useState<ReturnType<typeof getSprints>>([])
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set())
  const [waitlisted, setWaitlisted] = useState<Set<string>>(new Set())

  useEffect(() => {
    const list = getSprints()
    setSprints(list)
    if (user) {
      const joined = new Set(list.filter((s) => s.enrolledUsers.includes(user.id)).map((s) => s.id))
      setEnrolled(joined)
    }
  }, [user])

  const simulateUpload = () => {
    if (submitState !== 'idle') return
    setSubmitState('uploading')
    window.setTimeout(() => setSubmitState('done'), 1200)
  }

  const toggleEnroll = (id: string) => {
    if (!user) return
    if (enrolled.has(id)) {
      leaveSprint(user.id, id)
      setEnrolled((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } else {
      joinSprint(user.id, id)
      setEnrolled((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
    }
  }

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Title */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary">
            Sprints &amp; Cohorts
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Accountability cohorts, live peer reviews, and masterclasses
          </p>
        </div>
      </div>

      {/* Segmented navigation */}
      <div className="flex w-full items-center justify-between gap-1 rounded-xl bg-surface-container p-1 text-center">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-2.5 py-2 font-label-sm text-label-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
              tab === t.id
                ? 'bg-surface-container-lowest font-bold text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  tab === t.id
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <>
          {/* Featured enrolled sprint */}
          <div className="relative w-full overflow-hidden rounded-xl bg-surface-container-lowest shadow-md">
            <div className="h-2 w-full bg-gradient-to-r from-primary-container via-secondary to-secondary-fixed" />
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-2.5 py-0.5 font-label-xs text-label-xs font-semibold text-on-secondary-container">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                    Sprint in Progress • 248 enrolled
                  </div>
                  <h2 className="text-headline-sm font-bold leading-tight text-primary">
                    14-Day Early Action Essay Sprint
                  </h2>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Cohort #18 • Fall 2024 Submissions
                  </p>
                </div>
                <div className="shrink-0 rounded-xl bg-surface-container p-2.5 text-primary-container shadow-sm">
                  <span className="material-symbols-outlined text-[26px]">
                    edit_note
                  </span>
                </div>
              </div>

              {/* Facilitators */}
              <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-2.5">
                <div className="flex -space-x-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container shadow-sm">
                    <span
                      className="material-symbols-outlined text-[18px] text-on-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      person
                    </span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-fixed shadow-sm">
                    <span
                      className="material-symbols-outlined text-[18px] text-on-tertiary-fixed"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      person
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-label-xs text-label-xs font-medium text-on-surface-variant">
                    Sprint Co-Leads
                  </p>
                  <p className="truncate font-label-sm text-label-sm font-semibold text-primary">
                    Alex R. (Yale '25) &amp; Priya M. (Stanford '26)
                  </p>
                </div>
                <span
                  className="material-symbols-outlined text-[20px] text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
              </div>

              {/* Progress module */}
              <div className="space-y-2 rounded-lg bg-surface-container p-3">
                <div className="flex items-center justify-between font-label-sm text-label-sm">
                  <span className="font-bold text-primary">Day 4 of 14</span>
                  <span className="font-medium text-on-surface-variant">
                    Milestone: Activities Draft
                  </span>
                </div>
                <ProgressBar value={28.5} className="bg-surface-container-highest" />
                <div className="flex items-center justify-between font-label-xs text-label-xs text-on-surface-variant">
                  <span>Brainstorming</span>
                  <span className="font-bold text-primary">Drafting (Active)</span>
                  <span>Peer Review</span>
                  <span>Polishing</span>
                </div>
              </div>

              {/* Daily checklist */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md font-bold text-primary">
                    Daily Action Checklist
                  </span>
                  <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 font-label-xs text-label-xs font-semibold text-on-tertiary-container">
                    Today's Focus
                  </span>
                </div>
                <div className="space-y-2">
                  {sprintDays.map((item) => (
                    <div
                      key={item.day}
                      className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors ${
                        item.state === 'active'
                          ? 'space-y-3 rounded-xl bg-surface-container-high p-3 shadow-sm'
                          : 'bg-surface-container-lowest'
                      } ${item.state === 'done' ? 'opacity-75' : ''} ${
                        item.state === 'locked' ? 'opacity-60' : ''
                      }`}
                    >
                      {item.state === 'active' ? (
                        <>
                          <div className="flex flex-1 items-start gap-3">
                            <span className="material-symbols-outlined mt-0.5 animate-bounce text-[24px] text-on-tertiary-container">
                              arrow_circle_right
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-label-sm text-label-sm font-bold text-primary">
                                  {item.day}: {item.title}
                                </span>
                                <span className="rounded-full bg-error-container px-2 py-0.5 font-label-xs text-label-xs font-bold text-on-error-container">
                                  Due Today 8:00 PM
                                </span>
                              </div>
                              <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
                                {item.note}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={simulateUpload}
                              disabled={submitState !== 'idle'}
                              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-label-md text-label-md font-bold shadow-sm transition-all active:scale-95 ${
                                submitState === 'done'
                                  ? 'bg-secondary text-on-secondary'
                                  : 'bg-primary-container text-on-primary'
                              } ${submitState === 'uploading' ? 'pointer-events-none opacity-80' : ''}`}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {submitState === 'done'
                                  ? 'task_alt'
                                  : submitState === 'uploading'
                                    ? 'progress_activity'
                                    : 'upload_file'}
                              </span>
                              <span>
                                {submitState === 'done'
                                  ? 'Draft Submitted!'
                                  : submitState === 'uploading'
                                    ? 'Uploading Draft...'
                                    : 'Submit Work'}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="flex items-center gap-1 rounded-lg bg-surface-container-lowest px-3 py-2.5 font-label-sm text-label-sm text-primary transition-colors hover:bg-surface-container"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                visibility
                              </span>
                              <span>Rubric</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span
                            className={`material-symbols-outlined text-[22px] ${
                              item.state === 'done'
                                ? 'text-secondary'
                                : 'text-outline'
                            }`}
                            style={
                              item.state === 'done'
                                ? { fontVariationSettings: "'FILL' 1" }
                                : undefined
                            }
                          >
                            {item.state === 'done' ? 'check_circle' : 'lock'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-label-sm text-label-sm font-semibold ${
                                item.state === 'done'
                                  ? 'text-on-surface line-through'
                                  : 'text-on-surface-variant'
                              }`}
                            >
                              {item.day}: {item.title}
                            </p>
                            <p className="font-label-xs text-label-xs text-on-surface-variant">
                              {item.note}
                            </p>
                          </div>
                          {item.state === 'done' && (
                            <span className="material-symbols-outlined text-[18px] text-outline">
                              done_all
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live silent sprint room */}
              <div className="flex flex-col gap-3 rounded-xl bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-error" />
                    </span>
                    <span className="font-label-sm text-label-sm font-bold text-primary">
                      Live Silent Sprint Room
                    </span>
                  </div>
                  <span className="rounded-full bg-secondary-container px-2 py-0.5 font-label-xs text-label-xs font-semibold text-secondary">
                    18 drafting now
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Hop into camera-optional lofi Pomodoro focus blocks with peer
                  mentors on deck for quick questions.
                </p>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 font-label-md text-label-md font-semibold text-on-secondary shadow-sm transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    videocam
                  </span>
                  <span>Join Silent Zoom / Study Room</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'browse' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-headline-sm font-semibold text-primary">
                Upcoming Sprints
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Fast-paced, high-impact peer accountability sprints
              </p>
            </div>
            <SeeAllLink label="See All" />
          </div>
          {sprints.map((sprint) => (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              enrolled={enrolled.has(sprint.id)}
              waitlisted={waitlisted.has(sprint.id)}
              onEnroll={() => toggleEnroll(sprint.id)}
              onWaitlist={() => setWaitlisted((prev) => {
                const next = new Set(prev)
                if (next.has(sprint.id)) next.delete(sprint.id)
                else next.add(sprint.id)
                return next
              })}
            />
          ))}
        </div>
      )}

      {tab === 'cohorts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-headline-sm font-semibold text-primary">
                Active Cohorts
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Recurring peer circles led by vetted mentors
              </p>
            </div>
          </div>
          {cohorts.map((cohort) => (
            <div
              key={cohort.id}
              className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-label-md text-label-md font-bold text-primary">
                  {cohort.title}
                </h4>
                <span className="shrink-0 rounded-full bg-secondary-container px-2 py-0.5 font-label-xs text-label-xs font-bold text-on-secondary-container">
                  {cohort.enrolled} enrolled
                </span>
              </div>
              <p className="font-label-xs text-label-xs text-on-surface-variant">
                {cohort.schedule}
              </p>
              <div className="flex items-center gap-1.5 border-t border-surface-container pt-2 font-label-xs text-label-xs text-on-surface-variant">
                <span
                  className="material-symbols-outlined text-[16px] text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
                <span className="font-semibold text-on-surface">
                  {cohort.leads}
                </span>
              </div>
              <button
                type="button"
                className="mt-1 flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary-container font-label-md text-label-md font-bold text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
              >
                <span>View Cohort</span>
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Peer quote */}
      <div className="flex items-start gap-3 rounded-xl bg-surface-container-low p-4">
        <div className="shrink-0 rounded-full bg-secondary-container p-2 text-on-secondary-container">
          <span className="material-symbols-outlined text-[20px]">
            format_quote
          </span>
        </div>
        <div className="space-y-1">
          <p className="font-body-sm text-body-sm italic text-primary">
            “Writing college essays in a GSP sprint made me realize everyone
            struggles with draft 1. The feedback from my peer circle completely
            transformed my personal statement.”
          </p>
          <p className="font-label-xs text-label-xs font-semibold text-on-surface-variant">
            — Elena T., Early Action Cohort #14 (Now at Northwestern '28)
          </p>
        </div>
      </div>
    </div>
  )
}

function SprintCard({
  sprint,
  enrolled,
  waitlisted,
  onEnroll,
  onWaitlist,
}: {
  sprint: (Sprint & { enrolledUsers: string[] })
  enrolled: boolean
  waitlisted: boolean
  onEnroll: () => void
  onWaitlist: () => void
}) {
  const badgeTones: Record<string, string> = {
    secondary: 'bg-secondary-container text-on-secondary-container',
    tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed',
    neutral: 'bg-surface-container-high text-primary',
  }
  const isFull = sprint.cta === 'Join Waitlist'

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-sm transition-transform active:scale-[0.99]">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 font-label-xs text-label-xs font-bold uppercase tracking-wider ${badgeTones[sprint.badgeTone]}`}
            >
              {sprint.badge}
            </span>
            <span className="font-label-xs text-label-xs text-on-surface-variant">
              {sprint.meta}
            </span>
          </div>
          <h4 className="font-label-md text-label-md font-bold text-primary">
            {sprint.title}
          </h4>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary-container">
          <span className="material-symbols-outlined text-[22px]">
            {sprint.icon}
          </span>
        </div>
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        {sprint.description}
      </p>
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 font-label-xs text-label-xs text-on-surface-variant">
          <span
            className={`material-symbols-outlined text-[16px] ${
              sprint.spotsTone === 'tertiary'
                ? 'text-tertiary'
                : 'text-secondary'
            }`}
          >
            {isFull ? 'hourglass_top' : 'groups'}
          </span>
          <span
            className={
              sprint.spotsTone === 'tertiary' ? 'font-semibold text-on-tertiary-container' : ''
            }
          >
            {sprint.spots}
          </span>
        </div>
        {isFull ? (
          <button
            type="button"
            onClick={onWaitlist}
            className={`rounded-lg px-4 py-2 font-label-sm text-label-sm font-bold transition-all active:scale-95 ${
              waitlisted
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-surface-container-high text-primary hover:bg-surface-container'
            }`}
          >
            {waitlisted ? 'On Waitlist ✓' : 'Join Waitlist'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onEnroll}
            className={`rounded-lg px-4 py-2 font-label-sm text-label-sm font-bold shadow-sm transition-all active:scale-95 ${
              enrolled
                ? 'bg-secondary text-on-secondary'
                : 'bg-primary-container text-on-primary hover:opacity-95'
            }`}
          >
            {enrolled ? 'Enrolled ✓' : 'Enroll Now'}
          </button>
        )}
      </div>
    </div>
  )
}
