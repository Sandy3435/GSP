import { useEffect, useMemo, useState } from 'react'
import { courseTabs } from '../data/mockData'
import { getCourses } from '../lib/store'
import type { Course, CourseCategory } from '../data/mockData'
import { ProgressRing } from '../components/ui'

export default function CoursesPage() {
  const [tab, setTab] = useState<CourseCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    getCourses().then((data) => {
      setCourses(data)
    })
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses.filter((course) => {
      const matchesTab =
        tab === 'all' ||
        (tab === 'progress'
          ? course.category === 'foundations' || course.category === 'essay'
          : course.category === tab)
      const matchesQuery =
        !q || course.title.toLowerCase().includes(q) || course.description.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [tab, query, courses])

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Header / intro */}
      <section className="flex flex-col gap-space-md">
        <div className="flex flex-col gap-1">
          <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary">
            Learning Pathways &amp; Labs
          </h1>
          <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
            Master each phase of holistic college admissions with self-paced
            masterclasses, peer reviews, and interactive workbooks.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-outline">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search course topics, syllabus, mentors..."
            className="h-11 w-full rounded-xl bg-surface-container-lowest pl-11 pr-4 font-body-sm text-body-sm text-on-surface shadow-sm transition-all placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-secondary/40"
          />
        </div>

        {/* Filter chips */}
        <div className="no-scrollbar -mx-margin flex items-center gap-2 overflow-x-auto px-margin py-1">
          {courseTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 font-label-sm text-label-sm transition-all ${
                tab === t.id
                  ? 'bg-primary-container font-bold text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              {t.label}
              {t.id === 'progress' && (
                <span
                  className={`rounded-full px-1.5 py-0.5 font-label-xs text-[10px] font-bold ${
                    tab === t.id
                      ? 'bg-surface-container-lowest/25 text-on-primary'
                      : 'bg-secondary-container text-on-secondary-container'
                  }`}
                >
                  2
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Continue learning hero */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-bold uppercase tracking-wider text-primary">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              play_circle
            </span>
            Continue Learning
          </span>
          <span className="font-label-xs text-label-xs text-on-surface-variant">
            Last viewed 2h ago
          </span>
        </div>
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="inline-block rounded-full bg-secondary-container px-2 py-0.5 font-label-xs text-label-xs text-on-secondary-container">
                Module 3 of 6 • Active
              </span>
              <h2 className="text-headline-sm font-semibold leading-snug text-on-surface">
                College Admissions Foundations: Zero to Submit
              </h2>
            </div>
            <ProgressRing value={48} />
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-container-low p-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-lowest text-secondary shadow-xs">
                <span className="material-symbols-outlined text-[18px]">
                  play_arrow
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                  Up Next
                </p>
                <p className="truncate font-label-md text-label-md text-on-surface">
                  Lesson 3.2: Deciphering Holistic Admissions &amp; Rubrics
                </p>
              </div>
            </div>
            <span className="whitespace-nowrap rounded-md bg-surface-container-lowest px-2 py-1 font-label-xs text-label-xs text-on-surface-variant">
              12m left
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-primary-container to-secondary"
              style={{ width: '48%' }}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md text-on-primary shadow-sm transition-transform active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">
                play_arrow
              </span>
              <span>Resume Course</span>
            </button>
            <button
              type="button"
              aria-label="Course Workbook"
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-surface-container px-3.5 font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-primary active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]">
                menu_book
              </span>
              <span className="font-label-sm text-label-sm">Workbook</span>
            </button>
          </div>
        </div>
      </section>

      {/* Core pathways */}
      <section className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm font-semibold text-on-surface">
            Core Pathways &amp; Labs
          </h2>
          <span className="font-label-sm text-label-sm font-semibold text-secondary">
            4 Masterclasses
          </span>
        </div>

        {visible.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-space-md text-center">
            <p className="font-label-md text-label-md font-semibold text-on-surface">
              No pathways match “{query}”
            </p>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              Try a different search term or filter.
            </p>
          </div>
        )}

        {visible.map((course) => (
          <article
            key={course.id}
            className="flex flex-col gap-4 overflow-hidden rounded-2xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Visual header */}
            <div
              className={`relative -mx-5 -mt-5 mb-1 h-36 overflow-hidden bg-gradient-to-br ${course.gradient}`}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[64px] text-white/25"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {course.icon}
                </span>
              </div>
              <div className="absolute left-3 top-3">
                <span className="rounded-full bg-primary-container/90 px-2.5 py-1 font-label-xs text-label-xs font-semibold text-on-primary backdrop-blur-md">
                  {course.modules} Modules
                </span>
              </div>
              <div className="absolute right-3 top-3">
                {course.free ? (
                  <span className="rounded-full bg-secondary-container px-2.5 py-0.5 font-label-xs text-[10px] font-bold text-on-secondary-container shadow-xs">
                    100% Free
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-tertiary-fixed px-2.5 py-0.5 font-label-xs text-[10px] font-bold text-on-tertiary-fixed shadow-xs">
                    <span className="material-symbols-outlined text-[12px]">
                      payments
                    </span>
                    {course.price}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-headline-sm font-semibold leading-tight text-on-surface">
                {course.title}
              </h3>
              <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                {course.description}
              </p>
            </div>

            {course.id === 'course-essay' && (
              <div className="flex items-center gap-2 rounded-xl bg-secondary-container/40 px-3.5 py-2.5 font-label-sm text-label-sm text-on-secondary-container">
                <span className="material-symbols-outlined text-[18px] text-secondary">
                  groups
                </span>
                <span>
                  Includes <strong>2 Free Cohort Peer Reviews</strong> with alumni
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {course.topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-lg bg-surface-container-low px-2.5 py-1 font-label-xs text-label-xs text-on-surface"
                >
                  {topic}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 font-label-xs text-label-xs text-on-surface-variant">
              {course.stats.map((stat) => (
                <span key={stat.label} className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-secondary">
                    {stat.icon}
                  </span>
                  {stat.label}
                </span>
              ))}
            </div>

            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container font-label-md text-label-md text-primary transition-all hover:bg-surface-container-high active:scale-[0.99]"
            >
              <span>{course.cta}</span>
              <span className="material-symbols-outlined text-[16px]">
                {course.ctaIcon}
              </span>
            </button>
          </article>
        ))}
      </section>

      {/* Testimonial */}
      <section className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <div className="flex items-center gap-1 text-tertiary-container">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
          ))}
          <span className="ml-1.5 font-label-sm text-label-sm font-bold text-on-surface">
            4.9/5 from 1,240+ students
          </span>
        </div>
        <blockquote className="font-body-sm text-body-sm italic leading-relaxed text-on-surface">
          “The Essay Writing Lab helped me turn a dry resume into a deeply
          personal story. Accepted to Brown early decision!”
        </blockquote>
        <div className="flex items-center gap-3 pt-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high">
            <span
              className="material-symbols-outlined text-[18px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              person
            </span>
          </div>
          <div>
            <p className="font-label-sm text-label-sm font-bold text-on-surface">
              Marcus T. ’28
            </p>
            <p className="font-label-xs text-label-xs text-on-surface-variant">
              Brown University Admitted Fellow
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
