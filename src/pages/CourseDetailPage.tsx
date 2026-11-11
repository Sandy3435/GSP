import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPublishedCourses } from '../lib/store'
import {
  getCompletedLessons,
  toggleLessonComplete,
} from '../lib/platformStore'
import type { Course, CourseLesson } from '../data/mockData'
import { ProgressBar } from '../components/ui'

function lessonsFor(course: Course): CourseLesson[] {
  if (course.lessons && course.lessons.length > 0) return course.lessons
  const topics = course.topics.length ? course.topics : ['Orientation', 'Core concepts', 'Applied practice', 'Capstone']
  return topics.map((topic, index) => ({
    id: `${course.id}-lesson-${index}`,
    moduleTitle: `Module ${index + 1}: ${topic}`,
    title: topic,
    content: `This lesson introduces ${topic.toLowerCase()} with a short reading, a worked example, and a reflection prompt. Add your notes in the course workbook and bring questions to the community Q&A.`,
    duration: `${12 + index * 3} min`,
    resourceLabel: index === 0 ? 'Course workbook (PDF)' : undefined,
    resourceUrl: index === 0 ? '#' : undefined,
  }))
}

export default function CourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [completed, setCompleted] = useState<string[]>([])
  const [openLesson, setOpenLesson] = useState<string | null>(null)

  useEffect(() => {
    getPublishedCourses().then(setCourses)
  }, [])
  useEffect(() => {
    if (user) setCompleted(getCompletedLessons(user.id))
  }, [user])

  const course = courses.find((c) => c.id === courseId)
  const lessons = useMemo(() => (course ? lessonsFor(course) : []), [course])
  const groups = useMemo(() => {
    const map = new Map<string, CourseLesson[]>()
    for (const lesson of lessons) {
      map.set(lesson.moduleTitle, [...(map.get(lesson.moduleTitle) ?? []), lesson])
    }
    return [...map.entries()]
  }, [lessons])

  if (!course) {
    return (
      <div className="flex flex-col items-center gap-3 py-space-xl text-center">
        <span className="material-symbols-outlined text-[44px] text-outline">menu_book</span>
        <p className="text-headline-sm font-bold text-on-surface">Course not found</p>
        <Link
          to="/courses"
          className="rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md font-bold text-on-primary"
        >
          Back to courses
        </Link>
      </div>
    )
  }

  const done = lessons.filter((l) => completed.includes(l.id)).length
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0

  const toggle = (lessonId: string) => {
    if (!user) return
    setCompleted(toggleLessonComplete(user.id, lessonId))
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-space-lg pb-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant"
        aria-label="Back"
      >
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
      </button>

      <section className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${course.gradient} p-5 text-white shadow-md`}>
        <span
          className="material-symbols-outlined absolute -right-3 -top-3 text-[96px] text-white/15"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {course.icon}
        </span>
        <div className="relative z-10 flex flex-col gap-2">
          <span className="w-max rounded-full bg-white/15 px-2.5 py-0.5 font-label-xs text-label-xs font-bold backdrop-blur-sm">
            {course.modules} modules • Free access
          </span>
          <h1 className="text-headline-lg-mobile font-bold leading-tight md:text-headline-lg">{course.title}</h1>
          <p className="font-body-sm text-body-sm text-white/80">{course.description}</p>
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between font-label-xs text-label-xs">
              <span>Your progress</span>
              <span className="font-bold">{pct}%</span>
            </div>
            <ProgressBar value={pct} className="bg-white/25" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
        {groups.map(([moduleTitle, moduleLessons]) => (
          <section key={moduleTitle} className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
            <h2 className="font-label-md text-label-md font-bold text-primary">{moduleTitle}</h2>
            <div className="flex flex-col gap-2">
              {moduleLessons.map((lesson) => {
              const isDone = completed.includes(lesson.id)
              const isOpen = openLesson === lesson.id
              return (
                <div key={lesson.id} className="overflow-hidden rounded-xl bg-surface-container-low">
                  <button
                    type="button"
                    onClick={() => setOpenLesson(isOpen ? null : lesson.id)}
                    className="flex w-full items-center gap-2.5 p-3 text-left"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isDone ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isDone ? 'check' : 'play_arrow'}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-label-sm text-label-sm font-semibold text-on-surface">
                        {lesson.title}
                      </span>
                      <span className="block font-label-xs text-label-xs text-on-surface-variant">
                        {lesson.duration ?? 'Self-paced'}
                      </span>
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                      {isOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-2 border-t border-surface-container px-3 pb-3 pt-2">
                      <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                        {lesson.content}
                      </p>
                      {lesson.resourceLabel && (
                        <a
                          href={lesson.resourceUrl || '#'}
                          target={lesson.resourceUrl && lesson.resourceUrl !== '#' ? '_blank' : undefined}
                          rel="noreferrer"
                          className="flex w-max items-center gap-1 rounded-lg bg-surface-container-lowest px-2.5 py-1.5 font-label-xs text-label-xs font-bold text-primary"
                        >
                          <span className="material-symbols-outlined text-[15px]">download</span>
                          {lesson.resourceLabel}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => toggle(lesson.id)}
                        className={`flex h-9 items-center justify-center gap-1.5 rounded-lg font-label-sm text-label-sm font-bold ${
                          isDone
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-primary-container text-on-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          {isDone ? 'task_alt' : 'check_circle'}
                        </span>
                        {isDone ? 'Completed' : 'Mark as complete'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
      </div>

      {(course.resources?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
          <h2 className="font-label-md text-label-md font-bold text-primary">Downloadable resources</h2>
          {course.resources?.map((resource) => (
            <a
              key={resource.label}
              href={resource.url || '#'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl bg-surface-container-low p-3 font-label-sm text-label-sm text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">description</span>
              <span className="min-w-0 flex-1 truncate">{resource.label}</span>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">download</span>
            </a>
          ))}
        </section>
      )}
    </div>
  )
}
