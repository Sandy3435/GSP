import { useEffect, useMemo, useState } from 'react'
import { getOpportunities } from '../lib/store'
import type { Opportunity } from '../data/mockData'

type FilterId = 'all' | 'high-match' | 'full-ride' | 'fly-in' | 'no-essay' | 'deadlines'
type SortId = 'match' | 'deadline' | 'name'

const filters: { id: FilterId; label: string; icon?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'high-match', label: 'High Match (95%+)', icon: 'verified' },
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

function matchesFilter(opp: Opportunity, filter: FilterId): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'high-match':
      return opp.match >= 95
    case 'full-ride':
      return Boolean(opp.fullRide)
    case 'fly-in':
      return Boolean(opp.flyIn)
    case 'no-essay':
      return Boolean(opp.noEssay)
    case 'deadlines':
      return opp.daysLeft <= 21
  }
}

export default function OpportunitiesPage() {
  const [filter, setFilter] = useState<FilterId>('all')
  const [sort, setSort] = useState<SortId>('match')
  const [query, setQuery] = useState('')
  const [sortOpen, setSortOpen] = useState(false)
  const [bookmarks, setBookmarks] = useState<Set<string>>(
    new Set(['opp-questbridge']),
  )
  const [opps, setOpps] = useState<Opportunity[]>([])

  useEffect(() => {
    getOpportunities().then((data) => {
      setOpps(data)
    })
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = opps.filter(
      (opp) =>
        matchesFilter(opp, filter) &&
        (!q ||
          opp.title.toLowerCase().includes(q) ||
          opp.summary.toLowerCase().includes(q) ||
          opp.tags.some((t) => t.toLowerCase().includes(q))),
    )
    switch (sort) {
      case 'match':
        return [...list].sort((a, b) => b.match - a.match)
      case 'deadline':
        return [...list].sort((a, b) => a.daysLeft - b.daysLeft)
      case 'name':
        return [...list].sort((a, b) => a.title.localeCompare(b.title))
    }
  }, [filter, sort, query, opps])

  const toggleBookmark = (id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search & filters */}
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
          <button
            type="button"
            title="Filter by tags"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">
              filter_list
            </span>
          </button>
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
                <span
                  className={`material-symbols-outlined text-[14px] ${
                    filter === f.id ? '' : 'text-secondary'
                  }`}
                  style={
                    f.id === 'high-match' && filter === f.id
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {f.icon}
                </span>
              )}
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Sort microbar */}
      <div className="flex items-center justify-between px-0.5">
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          Showing {visible.length} curated opportunities
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
            <span className="material-symbols-outlined text-[16px]">
              expand_more
            </span>
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-6 z-20 flex w-36 flex-col gap-1 rounded-xl bg-surface-container-lowest p-1.5 shadow-xl">
              {sorts.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSort(s.id)
                    setSortOpen(false)
                  }}
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

      {/* Cards */}
      <div className="flex flex-col gap-3.5">
        {visible.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-space-md text-center">
            <p className="font-label-md text-label-md font-semibold text-on-surface">
              No opportunities match your filters
            </p>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              Try clearing the search or choosing another filter.
            </p>
          </div>
        )}

        {visible.map((opp) => {
          const saved = bookmarks.has(opp.id)
          return (
            <article
              key={opp.id}
              className="relative flex flex-col gap-3 overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-sm transition-all active:scale-[0.995]"
            >
              {/* Badges & bookmark */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 font-label-xs text-label-xs font-bold text-on-secondary-container">
                    <span
                      className="material-symbols-outlined text-[13px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      stars
                    </span>
                    {opp.match}% Match
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
                      ? 'bg-surface-container-low text-primary'
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

              {/* Title & award */}
              <div>
                <h2 className="text-headline-sm font-bold leading-snug text-primary">
                  {opp.title}
                </h2>
                <div className="mt-1 flex items-center gap-1.5 text-secondary">
                  <span className="material-symbols-outlined text-[16px]">
                    {opp.awardIcon}
                  </span>
                  <span className="font-label-sm text-label-sm font-bold">
                    {opp.award}
                  </span>
                </div>
              </div>

              <p className="line-clamp-2 font-body-sm text-body-sm text-on-surface-variant">
                {opp.summary}
              </p>

              {/* Deadline strip */}
              <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-tertiary-fixed-dim" />
                  <div className="flex flex-col">
                    <span className="font-label-xs text-label-xs text-on-surface-variant">
                      Deadline
                    </span>
                    <span className="font-label-sm text-label-sm font-bold text-tertiary">
                      {opp.deadline} • {opp.daysLeft} days left
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-container px-4 font-label-md text-label-md font-bold text-on-primary transition-all hover:opacity-95 active:scale-[0.98]"
                >
                  <span>Details</span>
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_forward
                  </span>
                </button>
                <button
                  type="button"
                  title="Share opportunity"
                  className="flex h-10 items-center justify-center gap-1 rounded-lg bg-surface-container-low px-3 font-label-sm text-label-sm text-primary transition-colors hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    share
                  </span>
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {/* End of results */}
      <div className="mt-2 flex flex-col items-center justify-center rounded-xl bg-surface-container-low p-4 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-secondary">
          <span className="material-symbols-outlined text-[22px]">checklist</span>
        </div>
        <span className="font-label-md text-label-md font-bold text-primary">
          You’re all caught up for this week!
        </span>
        <p className="mt-0.5 max-w-xs font-body-sm text-body-sm text-on-surface-variant">
          We scan over 4,000 opportunities daily. Check back Monday for updated
          admission sprints.
        </p>
      </div>
    </div>
  )
}
