import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { courseTabs } from '../data/mockData'
import { getPublishedCourses } from '../lib/store'
import { getCompletedLessons } from '../lib/platformStore'
import { useAuth } from '../context/AuthContext'
import type { Course, CourseCategory } from '../data/mockData'
import { ProgressRing } from '../components/ui'

export default function CoursesPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<CourseCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [completed, setCompleted] = useState<string[]>([])

  useEffect(() => {
    getPublishedCourses().then(setCourses)
  }, [])
  useEffect(() => {
    if (user) setCompleted(getCompletedLessons(user.id))
  }, [user])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses.filter((course) => {
      const matchesTab =
        tab === 'all' ||
        (tab === 'progress'
          ? (course.lessons ?? []).some((l) => completed.includes(l.id))
          : course.category === tab)
      const matchesQuery =
        !q || course.title.toLowerCase().includes(q) || course.description.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [tab, query, courses, completed])

  const inProgress = courses.find((c) =>
    (c.lessons ?? []).some((l) => completed.includes(l.id)) &&
    (c.lessons ?? []).some((l) => !completed.includes(l.id)),
  )
  const hero = inProgress ?? courses[0]
  const heroDone = hero ? (hero.lessons ?? []).filter((l) => completed.includes(l.id)).length : 0
  const heroTotal = hero ? (hero.lessons?.length ?? hero.modules) : 0
  const heroPct = heroTotal ? Math.round((heroDone / heroTotal) * 100) : 0
  const nextLesson = hero?.lessons?.find((l) => !completed.includes(l.id))

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-space-lg pb-4">
      <section className="flex flex-col gap-space-md">
        <div className="flex flex-col gap-1">
          <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary md:text-headline-lg">
            Learning Pathways &amp; Labs
          </h1>
          <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
            Master each phase of holistic college admissions with self-paced
            masterclasses, peer reviews, and interactive workbooks.
          </p>
        </div>

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

        <div className="no-scrollbar -mx-margin flex flex-wrap items-center gap-2 overflow-x-auto px-margin py-1 md:mx-0 md:px-0">
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
            </button>
          ))}
        </div>
      </section>

      {hero && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-bold uppercase tracking-wider text-primary">
              <span className="material-symbols-outlined text-[16px] text-secondary">play_circle</span>
              {inProgress ? 'Continue Learning' : 'Start Learning'}
            </span>
            <span className="font-label-xs text-label-xs text-on-surface-variant">
              {heroDone}/{heroTotal} lessons complete
            </span>
          </div>
          <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-block rounded-full bg-secondary-container px-2 py-0.5 font-label-xs text-label-xs text-on-secondary-container">
                  {hero.modules} modules • Free access
                </span>
                <h2 className="text-headline-sm font-semibold leading-snug text-on-surface">
                  {hero.title}
                </h2>
              </div>
              <ProgressRing value={heroPct} />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-container-low p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-lowest text-secondary shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-label-xs text-label-xs text-on-surface-variant">Up Next</p>
                  <p className="truncate font-label-md text-label-md text-on-surface">
                    {nextLesson?.title ?? 'Review completed lessons'}
                  </p>
                </div>
              </div>
            </div>
            <Link
              to={`/courses/${hero.id}`}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary shadow-sm transition-transform active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              {inProgress ? 'Resume Course' : 'Open Course'}
            </Link>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm font-semibold text-on-surface">Core Pathways &amp; Labs</h2>
          <span className="font-label-sm text-label-sm font-semibold text-secondary">
            {courses.length} courses
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

        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2 xl:grid-cols-3">
          {visible.map((course) => {
            const total = course.lessons?.length ?? course.modules
            const done = (course.lessons ?? []).filter((l) => completed.includes(l.id)).length
            return (
              <article
                key={course.id}
                className="flex flex-col gap-4 overflow-hidden rounded-2xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md"
              >
              <div className={`relative -mx-5 -mt-5 mb-1 h-36 overflow-hidden bg-gradient-to-br ${course.gradient}`}>
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
                  <span className="rounded-full bg-secondary-container px-2.5 py-0.5 font-label-xs text-[10px] font-bold text-on-secondary-container shadow-xs">
                    100% Free
                  </span>
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

              <div className="flex flex-wrap gap-1.5">
                {course.topics.map((topic) => (
                  <span key={topic} className="rounded-lg bg-surface-container-low px-2.5 py-1 font-label-xs text-label-xs text-on-surface">
                    {topic}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 font-label-xs text-label-xs text-on-surface-variant">
                {course.stats.map((stat) => (
                  <span key={stat.label} className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-secondary">{stat.icon}</span>
                    {stat.label}
                  </span>
                ))}
                {done > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <span className="material-symbols-outlined text-[15px]">task_alt</span>
                    {done}/{total} lessons
                  </span>
                )}
              </div>

              <Link
                to={`/courses/${course.id}`}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container font-label-md text-label-md font-bold text-primary transition-all hover:bg-surface-container-high active:scale-[0.99]"
              >
                <span>{done > 0 ? 'Continue course' : 'View syllabus & modules'}</span>
                <span className="material-symbols-outlined text-[16px]">{course.ctaIcon}</span>
              </Link>
            </article>
          )
        })}
        </div>
      </section>
    </div>
  )
}
