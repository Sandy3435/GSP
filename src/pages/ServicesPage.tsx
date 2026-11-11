import { useEffect, useMemo, useState } from 'react'
import { serviceCategories } from '../data/mockData'
import { getPublishedServices } from '../lib/store'
import { createBooking, getStudentBookings } from '../lib/platformStore'
import { useAuth } from '../context/AuthContext'
import type { Service, ServiceCategory } from '../data/mockData'
import type { Booking } from '../lib/platformStore'

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
  const { user } = useAuth()
  const [category, setCategory] = useState<ServiceCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selected, setSelected] = useState<Service | null>(null)

  const reload = () => {
    getPublishedServices().then(setServices)
    if (user) setBookings(getStudentBookings(user.id))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return services.filter((svc) => {
      const matchesCategory = category === 'all' || svc.category === category
      const matchesQuery =
        !q || svc.title.toLowerCase().includes(q) || svc.description.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }, [category, query, services])

  return (
    <div className="flex flex-col gap-space-lg pb-4">
      {bookings.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <p className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
            My service requests
          </p>
          {bookings.map((booking) => (
            <div key={booking.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-2.5">
              <div className="min-w-0">
                <p className="truncate font-label-sm text-label-sm font-semibold text-on-surface">
                  {booking.serviceTitle}
                </p>
                <p className="font-label-xs text-label-xs text-on-surface-variant">
                  {booking.date} • {booking.time}
                  {booking.mentorName ? ` • ${booking.mentorName}` : ' • Mentor to be assigned'}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 font-label-xs text-[10px] font-bold capitalize ${
                booking.status === 'confirmed'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : booking.status === 'cancelled'
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-tertiary-fixed text-on-tertiary-fixed'
              }`}>
                {booking.status}
              </span>
            </div>
          ))}
        </section>
      )}

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
          Request support from GSP mentors. All services are included in Version 1.0 —
          no payment is collected in the platform.
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
          <article key={svc.id} className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            {svc.badge && (
              <div className="mb-1 flex items-center gap-1.5">
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-xs text-label-xs font-extrabold ${badgeTones[svc.badgeTone]}`}>
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {svc.badgeIcon ?? 'star'}
                  </span>
                  {svc.badge}
                </span>
              </div>
            )}

            <div className="flex items-start justify-between gap-3">
              <h3 className="flex-1 text-headline-sm font-semibold text-on-surface">{svc.title}</h3>
              <div className="shrink-0 text-right">
                <span className="block text-headline-sm font-bold text-primary">{svc.price}</span>
                <span className="block font-label-xs text-label-xs text-on-surface-variant">{svc.priceUnit}</span>
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{svc.description}</p>

            {svc.mentorName && (
              <div className="flex items-center gap-1.5 font-label-xs text-label-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-secondary">school</span>
                Mentor: <span className="font-semibold text-on-surface">{svc.mentorName}</span>
              </div>
            )}

            {svc.features && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {svc.features.map((feat) => (
                  <div key={feat.label} className="flex items-center gap-2 rounded-lg bg-surface-container-low p-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">{feat.icon}</span>
                    <span className="font-label-xs text-label-xs font-semibold text-on-surface">{feat.label}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelected(svc)}
              className={`mt-1 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg font-label-md text-label-md font-bold transition-all active:scale-[0.98] ${ctaTones[svc.ctaTone]}`}
            >
              <span>{svc.cta}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </article>
        ))}
      </div>

      {selected && user && (
        <BookingModal
          service={selected}
          onClose={() => setSelected(null)}
          onBooked={() => {
            setSelected(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function BookingModal({
  service,
  onClose,
  onBooked,
}: {
  service: Service
  onClose: () => void
  onBooked: () => void
}) {
  const { user } = useAuth()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!user) return
    if (!date || !time) {
      setError('Choose a preferred date and time.')
      return
    }
    createBooking({
      serviceId: service.id,
      serviceTitle: service.title,
      studentId: user.id,
      studentName: user.name,
      mentorId: service.mentorId,
      mentorName: service.mentorName,
      date,
      time,
      notes: notes.trim(),
    })
    onBooked()
  }

  return (
    <div className="fixed inset-0 z-[60] mx-auto flex max-w-[430px] items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full flex-col gap-3 overflow-y-auto rounded-2xl bg-surface-container-lowest p-space-md shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-headline-sm font-bold text-on-surface">Request a booking</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <p className="rounded-lg bg-surface-container-low p-2.5 font-label-sm text-label-sm font-semibold text-primary">
          {service.title}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">Preferred date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-xl bg-surface-container-low px-3 font-body-sm text-body-sm text-on-surface" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">Preferred time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-xl bg-surface-container-low px-3 font-body-sm text-body-sm text-on-surface" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">What do you need help with?</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Share context so your mentor can prepare…" className="w-full resize-none rounded-xl bg-surface-container-low p-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40" />
        </div>
        {error && <p className="font-label-xs text-label-xs text-error">{error}</p>}
        <button type="button" onClick={submit} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary">
          <span className="material-symbols-outlined text-[18px]">event_available</span>
          Submit request
        </button>
      </div>
    </div>
  )
}
