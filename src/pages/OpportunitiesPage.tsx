import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPublishedOpportunities } from '../lib/store'
import { matchScore } from '../lib/matching'
import {
  getSavedOpportunityIds,
  saveOpportunityForUser,
  unsaveOpportunityForUser,
} from '../lib/platformStore'
import type { Opportunity } from '../data/mockData'

type FilterId = 'all' | 'high-match' | 'full-ride' | 'fly-in' | 'no-essay' | 'deadlines' | 'saved'
type SortId = 'match' | 'deadline' | 'name'

const filters: { id: FilterId; label: string; icon?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'saved', label: 'Saved', icon: 'bookmark' },
  { id: 'high-match', label: 'High Match (85%+)', icon: 'verified' },
  { id: 'full-ride', label: 'Full-Ride' },
  { id: 'fly-in', label: 'Fly-In Programs' },
  { id: 'no-essay', label: 'No Essay Required' },
  { id: 'deadlines', label: 'Deadlines Soon', icon: 'schedule' },
]

const sorts: { id: SortId; label: string }[] = [
  { id: 'match', label: 'Best Match' },
  { id: 'deadline', label: 'Deadline' },
  { id: 'name', label: 'A–Z' },
]

export default function OpportunitiesPage() {
  const { user, profile } = useAuth()
  const [filter, setFilter] = useState<FilterId>('all')
  const [sort, setSort] = useState<SortId>('match')
  const [query, setQuery] = useState('')
  const [sortOpen, setSortOpen] = useState(false)
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])

  useEffect(() => {
    getPublishedOpportunities().then(setOpps)
  }, [])
  useEffect(() => {
    if (user) setSavedIds(getSavedOpportunityIds(user.id))
  }, [user])

  const scored = useMemo(
    () => opps.map((opp) => ({ opp, score: matchScore(profile, opp.eligibility) })),
    [opps, profile],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = scored.filter(({ opp, score }) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'saved' && savedIds.includes(opp.id)) ||
        (filter === 'high-match' && score >= 85) ||
        (filter === 'full-ride' && Boolean(opp.fullRide)) ||
        (filter === 'fly-in' && Boolean(opp.flyIn)) ||
        (filter === 'no-essay' && Boolean(opp.noEssay)) ||
        (filter === 'deadlines' && opp.daysLeft <= 21)
      const matchesQuery =
        !q ||
        opp.title.toLowerCase().includes(q) ||
        opp.summary.toLowerCase().includes(q) ||
        opp.tags.some((t) => t.toLowerCase().includes(q))
      return matchesFilter && matchesQuery
    })
    switch (sort) {
      case 'match':
        return [...list].sort((a, b) => b.score - a.score)
      case 'deadline':
        return [...list].sort((a, b) => a.opp.daysLeft - b.opp.daysLeft)
      case 'name':
        return [...list].sort((a, b) => a.opp.title.localeCompare(b.opp.title))
    }
  }, [filter, sort, query, scored, savedIds])

  const toggleBookmark = (id: string) => {
    if (!user) return
    if (savedIds.includes(id)) {
      unsaveOpportunityForUser(user.id, id)
      setSavedIds((prev) => prev.filter((x) => x !== id))
    } else {
      saveOpportunityForUser(user.id, id)
      setSavedIds((prev) => [...prev, id])
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <section className="flex flex-col gap-3">
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scholarships, fly-ins, summer labs, awards..."
            className="h-11 w-full rounded-xl bg-surface-container-lowest pl-10 pr-10 font-body-sm text-body-sm text-on-surface shadow-sm transition-all placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>

        <div className="no-scrollbar -mx-margin flex items-center gap-2 overflow-x-auto px-margin py-0.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 font-label-xs text-label-xs transition-all ${
                filter === f.id
                  ? 'bg-primary-container font-bold text-on-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              {f.icon && (
                <span className="material-symbols-outlined text-[14px]">{f.icon}</span>
              )}
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between px-0.5">
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {visible.length} matched opportunities
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className="flex items-center gap-1 font-label-xs text-label-xs text-primary transition-opacity hover:opacity-80"
          >
            <span>Sort by:</span>
            <span className="font-bold underline decoration-secondary">
              {sorts.find((s) => s.id === sort)?.label}
            </span>
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-6 z-20 flex w-36 flex-col gap-1 rounded-xl bg-surface-container-lowest p-1.5 shadow-xl">
              {sorts.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setSort(s.id); setSortOpen(false) }}
                  className={`rounded-lg px-3 py-2 text-left font-label-xs text-label-xs transition-colors ${
                    sort === s.id
                      ? 'bg-primary-container font-bold text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {visible.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-space-md text-center">
            <p className="font-label-md text-label-md font-semibold text-on-surface">
              No opportunities match your filters
            </p>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              Try clearing the search, adding profile details, or choosing another filter.
            </p>
          </div>
        )}

        {visible.map(({ opp, score }) => {
          const saved = savedIds.includes(opp.id)
          return (
            <article
              key={opp.id}
              className="relative flex flex-col gap-3 overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-sm transition-all active:scale-[0.995]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 font-label-xs text-label-xs font-bold text-on-secondary-container">
                    <span
                      className="material-symbols-outlined text-[13px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      stars
                    </span>
                    {score}% Match
                  </span>
                  {opp.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-label-xs text-label-xs ${
                        tag.includes('Full') || tag.includes('Free') || tag.includes('Merit')
                          ? 'bg-surface-container-high text-primary'
                          : 'bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label={saved ? 'Remove bookmark' : 'Bookmark'}
                  onClick={() => toggleBookmark(opp.id)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                    saved
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {saved ? 'bookmark' : 'bookmark_border'}
                  </span>
                </button>
              </div>

              <Link to={`/opportunities/${opp.id}`} className="flex flex-col gap-1.5">
                <h2 className="text-headline-sm font-bold leading-snug text-primary">
                  {opp.title}
                </h2>
                <div className="flex items-center gap-1.5 text-secondary">
                  <span className="material-symbols-outlined text-[16px]">{opp.awardIcon}</span>
                  <span className="font-label-sm text-label-sm font-bold">{opp.award}</span>
                </div>
                <p className="line-clamp-2 font-body-sm text-body-sm text-on-surface-variant">
                  {opp.summary}
                </p>
              </Link>

              <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-tertiary-fixed-dim" />
                  <div className="flex flex-col">
                    <span className="font-label-xs text-label-xs text-on-surface-variant">Deadline</span>
                    <span className="font-label-sm text-label-sm font-bold text-tertiary">
                      {opp.deadline} • {opp.daysLeft} days left
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Link
                  to={`/opportunities/${opp.id}`}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-container px-4 font-label-md text-label-md font-bold text-on-primary transition-all hover:opacity-95 active:scale-[0.98]"
                >
                  <span>Details &amp; eligibility</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-2 flex flex-col items-center justify-center rounded-xl bg-surface-container-low p-4 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-secondary">
          <span className="material-symbols-outlined text-[22px]">checklist</span>
        </div>
        <span className="font-label-md text-label-md font-bold text-primary">
          You’re all caught up for this week!
        </span>
        <p className="mt-0.5 max-w-xs font-body-sm text-body-sm text-on-surface-variant">
          Matches update automatically as you complete your profile.
        </p>
      </div>
    </div>
  )
}
