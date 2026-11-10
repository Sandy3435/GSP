import { useMemo, useState } from 'react'
import { serviceCategories, services } from '../data/mockData'
import type { ServiceCategory } from '../data/mockData'

const badgeTones: Record<string, string> = {
  popular: 'bg-secondary-container text-on-secondary-container',
  comprehensive: 'bg-surface-container-high text-primary',
  live: 'bg-secondary-container text-on-secondary-container',
  neutral: 'bg-surface-container text-on-surface-variant',
}

const ctaTones: Record<string, string> = {
  primary: 'bg-primary-container text-on-primary shadow-sm hover:opacity-95',
  secondary: 'bg-primary text-on-primary shadow-sm hover:opacity-95',
  sage: 'bg-surface-container-high text-on-surface hover:bg-surface-container',
}

export default function ServicesPage() {
  const [category, setCategory] = useState<ServiceCategory | 'all'>('all')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return services.filter((svc) => {
      const matchesCategory = category === 'all' || svc.category === category
      const matchesQuery =
        !q ||
        svc.title.toLowerCase().includes(q) ||
        svc.description.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }, [category, query])

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Active order tracker */}
      <div className="flex items-center justify-between gap-space-sm rounded-xl bg-surface-container-lowest p-space-sm shadow-sm">
        <div className="flex min-w-0 items-center gap-space-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-container">
            <span className="material-symbols-outlined text-[18px] text-on-secondary-container">
              hourglass_top
            </span>
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-label-xs text-label-xs font-bold text-primary">
                1 Active Order
              </span>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
            </div>
            <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
              Common App Audit: Delivered tomorrow, 3 PM
            </p>
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded bg-secondary-container/50 px-2 py-1 font-label-xs text-label-xs font-bold text-secondary transition-colors hover:bg-secondary-container"
        >
          View
        </button>
      </div>

      {/* Header & search */}
      <section className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
        <div className="flex items-start justify-between gap-space-sm">
          <h1 className="text-headline-lg-mobile font-bold tracking-tight text-on-surface">
            1-on-1 Services &amp; Reviews
          </h1>
          <div className="shrink-0 rounded-xl bg-surface-container-low p-2 text-primary">
            <span className="material-symbols-outlined text-[26px]">school</span>
          </div>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Vetted Ivy+ and top college mentors. Transparent student rates with
          financial aid vouchers accepted.
        </p>
        <div className="relative w-full">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-outline">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services, mentors, topics..."
            className="h-11 w-full rounded-xl bg-surface-container-lowest pl-11 pr-4 font-body-sm text-body-sm text-on-surface shadow-sm transition-all placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-secondary/40"
          />
        </div>
      </section>

      {/* Category filter pills */}
      <div className="no-scrollbar -mx-margin flex items-center gap-2 overflow-x-auto px-margin py-1">
        {serviceCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 font-label-xs text-label-xs font-bold transition-all ${
              category === cat.id
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'bg-surface-container-lowest text-on-surface-variant shadow-sm hover:bg-surface-container'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Service list */}
      <div className="flex flex-col gap-space-md">
        {visible.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-space-md text-center">
            <p className="font-label-md text-label-md font-semibold text-on-surface">
              No services match “{query}”
            </p>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              Try a different search term or category.
            </p>
          </div>
        )}

        {visible.map((svc) => (
          <article
            key={svc.id}
            className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
          >
            {svc.badge && (
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-xs text-label-xs font-extrabold ${badgeTones[svc.badgeTone]}`}
                >
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {svc.badgeIcon}
                  </span>
                  {svc.badge}
                </span>
              </div>
            )}

            <div className="flex items-start justify-between gap-3">
              <h3 className="flex-1 text-headline-sm font-semibold text-on-surface">
                {svc.title}
              </h3>
              <div className="shrink-0 text-right">
                <span className="block text-headline-sm font-bold text-primary">
                  {svc.price}
                </span>
                <span className="block font-label-xs text-label-xs text-on-surface-variant">
                  {svc.priceUnit}
                </span>
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {svc.description}
            </p>

            {svc.features && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {svc.features.map((feat) => (
                  <div
                    key={feat.label}
                    className="flex items-center gap-2 rounded-lg bg-surface-container-low p-2"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      {feat.icon}
                    </span>
                    <span className="font-label-xs text-label-xs font-semibold text-on-surface">
                      {feat.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className={`mt-1 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg font-label-md text-label-md font-bold transition-all active:scale-[0.98] ${ctaTones[svc.ctaTone]}`}
            >
              <span>{svc.cta}</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
