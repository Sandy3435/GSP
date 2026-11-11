import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  deleteCourse,
  deleteOpportunity,
  deleteService,
  getCourses,
  getOpportunities,
  getServices,
  newContentId,
  saveCourse,
  saveOpportunity,
  saveService,
} from '../lib/store'
import {
  getBookings,
  getInfoSessions,
  getMentorTracks,
  getSprints,
  saveInfoSession,
  deleteInfoSession,
  saveSprint,
  deleteSprint,
  setMentorTracks,
  updateBooking,
  deleteBooking,
} from '../lib/platformStore'
import type { Booking, BookingStatus } from '../lib/platformStore'
import { getProfile, listUsers, updateUserRole } from '../lib/auth'
import type { AuthUser, Profile, UserRole } from '../lib/auth'
import type {
  Course,
  CourseLesson,
  CourseResource,
  LiveSession,
  Opportunity,
  Service,
  Sprint,
} from '../data/mockData'
import { SectionHeader } from '../components/ui'

type AdminTab =
  | 'overview'
  | 'opportunities'
  | 'courses'
  | 'sprints'
  | 'sessions'
  | 'mentors'
  | 'services'
  | 'bookings'
  | 'students'

const tabs: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'opportunities', label: 'Opportunities', icon: 'explore' },
  { id: 'courses', label: 'Courses', icon: 'auto_stories' },
  { id: 'sprints', label: 'Sprints', icon: 'school' },
  { id: 'sessions', label: 'Live Sessions', icon: 'sensors' },
  { id: 'mentors', label: 'Mentors', icon: 'supervisor_account' },
  { id: 'services', label: 'Services', icon: 'handshake' },
  { id: 'bookings', label: 'Bookings', icon: 'calendar_month' },
  { id: 'students', label: 'Students', icon: 'group' },
]

const MENTOR_TRACKS = [
  'Undergraduate Admissions',
  'Graduate Admissions',
  'Scholarship Applications',
  'Essay Writing',
  'SAT Preparation',
  'Research',
  'Financial Aid',
  'Interview Preparation',
]

export default function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers] = useState<AuthUser[]>([])
  const [sprints, setSprints] = useState<ReturnType<typeof getSprints>>([])
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])

  const reload = () => {
    getOpportunities().then(setOpps)
    getCourses().then(setCourses)
    getServices().then(setServices)
    listUsers().then(setUsers)
    setSprints(getSprints())
    setSessions(getInfoSessions())
    setBookings(getBookings())
  }

  useEffect(() => {
    reload()
  }, [])

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-space-xl text-center">
        <span className="material-symbols-outlined text-[48px] text-error">lock</span>
        <h2 className="text-headline-sm font-bold text-on-surface">Admin access required</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          You need an admin account to view this page.
        </p>
      </div>
    )
  }

  const students = users.filter((u) => u.role === 'student')
  const mentors = users.filter((u) => u.role === 'mentor')

  return (
    <div className="flex flex-col gap-space-lg pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary">
            Admin Dashboard
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Version 1.0 platform management.
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary">
          <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
        </div>
      </div>

      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl bg-surface-container p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 font-label-sm text-label-sm transition-all ${
              tab === t.id
                ? 'bg-surface-container-lowest font-bold text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <Overview
          students={students.length}
          mentors={mentors.length}
          opps={opps.length}
          courses={courses.length}
          sprints={sprints.length}
          sessions={sessions.length}
          bookings={bookings.length}
          onJump={setTab}
        />
      )}
      {tab === 'opportunities' && <OpportunitiesAdmin opps={opps} onChange={reload} />}
      {tab === 'courses' && <CoursesAdmin courses={courses} onChange={reload} />}
      {tab === 'sprints' && (
        <SprintsAdmin
          sprints={sprints}
          mentors={mentors}
          sessions={sessions}
          users={users}
          onChange={reload}
        />
      )}
      {tab === 'sessions' && (
        <SessionsAdmin sessions={sessions} opps={opps} onChange={reload} />
      )}
      {tab === 'mentors' && (
        <MentorsAdmin
          mentors={mentors}
          students={students}
          sprints={sprints}
          services={services}
          onChange={reload}
        />
      )}
      {tab === 'services' && (
        <ServicesAdmin services={services} mentors={mentors} onChange={reload} />
      )}
      {tab === 'bookings' && (
        <BookingsAdmin bookings={bookings} mentors={mentors} onChange={reload} />
      )}
      {tab === 'students' && <StudentsAdmin students={students} />}
    </div>
  )
}

/* ------------------------------- Overview -------------------------------- */

function Overview({
  students,
  mentors,
  opps,
  courses,
  sprints,
  sessions,
  bookings,
  onJump,
}: {
  students: number
  mentors: number
  opps: number
  courses: number
  sprints: number
  sessions: number
  bookings: number
  onJump: (tab: AdminTab) => void
}) {
  const stats = [
    { label: 'Students', value: students, icon: 'group', tab: 'students' as AdminTab },
    { label: 'Mentors', value: mentors, icon: 'supervisor_account', tab: 'mentors' as AdminTab },
    { label: 'Opportunities', value: opps, icon: 'explore', tab: 'opportunities' as AdminTab },
    { label: 'Courses', value: courses, icon: 'auto_stories', tab: 'courses' as AdminTab },
    { label: 'Sprints', value: sprints, icon: 'school', tab: 'sprints' as AdminTab },
    { label: 'Live sessions', value: sessions, icon: 'sensors', tab: 'sessions' as AdminTab },
    { label: 'Bookings', value: bookings, icon: 'calendar_month', tab: 'bookings' as AdminTab },
  ]
  return (
    <div className="flex flex-col gap-space-md">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onJump(s.tab)}
            className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-space-md text-left shadow-sm transition-transform active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-primary">
              <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
            </div>
            <div>
              <p className="text-headline-lg font-bold text-primary">{s.value}</p>
              <p className="font-label-xs text-label-xs text-on-surface-variant">{s.label}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
        <p className="font-label-sm text-label-sm font-bold text-primary">Version 1.0 scope</p>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
          Payments, membership tiers, mentor commissions, student-created sprints, and
          advanced milestone enforcement are intentionally excluded from this release.
        </p>
      </div>
    </div>
  )
}

/* ----------------------------- Opportunities ----------------------------- */

const emptyOpp = (): Opportunity => ({
  id: newContentId('opp'),
  title: '',
  match: 85,
  tags: [],
  award: '',
  awardIcon: 'workspace_premium',
  summary: '',
  deadline: '',
  daysLeft: 30,
  category: 'Scholarship',
  requiredDocuments: [],
  instructions: '',
  applicationLink: '',
  published: true,
  eligibility: {},
})

function OpportunitiesAdmin({ opps, onChange }: { opps: Opportunity[]; onChange: () => void }) {
  const [draft, setDraft] = useState<Opportunity | null>(null)
  const [tags, setTags] = useState('')
  const [docs, setDocs] = useState('')
  const [majors, setMajors] = useState('')
  const [interests, setInterests] = useState('')
  const [countries, setCountries] = useState('')
  const [nationalities, setNationalities] = useState('')
  const [minGpa, setMinGpa] = useState('')
  const [minActivities, setMinActivities] = useState('')
  const [requiresLeadership, setRequiresLeadership] = useState(false)
  const [firstGenOnly, setFirstGenOnly] = useState(false)
  const [lowIncomeOnly, setLowIncomeOnly] = useState(false)
  const [urmOnly, setUrmOnly] = useState(false)

  const openCreate = () => {
    setDraft(emptyOpp())
    resetExtras(emptyOpp())
  }
  const openEdit = (opp: Opportunity) => {
    setDraft({ ...opp })
    resetExtras(opp)
  }
  const resetExtras = (opp: Opportunity) => {
    setTags(opp.tags.join(', '))
    setDocs((opp.requiredDocuments ?? []).join('\n'))
    setMajors((opp.eligibility?.majors ?? []).join(', '))
    setInterests((opp.eligibility?.interests ?? []).join(', '))
    setCountries((opp.eligibility?.countries ?? []).join(', '))
    setNationalities((opp.eligibility?.nationalities ?? []).join(', '))
    setMinGpa(opp.eligibility?.minGpa?.toString() ?? '')
    setMinActivities(opp.eligibility?.minActivities?.toString() ?? '')
    setRequiresLeadership(Boolean(opp.eligibility?.requiresLeadership))
    setFirstGenOnly(Boolean(opp.eligibility?.firstGenOnly))
    setLowIncomeOnly(Boolean(opp.eligibility?.lowIncomeOnly))
    setUrmOnly(Boolean(opp.eligibility?.urmOnly))
  }
  const patch = (p: Partial<Opportunity>) => setDraft((d) => (d ? { ...d, ...p } : d))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft || !draft.title.trim()) return
    const eligibility: Opportunity['eligibility'] = {}
    if (minGpa) eligibility.minGpa = Number(minGpa)
    if (majors.trim()) eligibility.majors = splitList(majors)
    if (interests.trim()) eligibility.interests = splitList(interests)
    if (countries.trim()) eligibility.countries = splitList(countries)
    if (nationalities.trim()) eligibility.nationalities = splitList(nationalities)
    if (minActivities) eligibility.minActivities = Number(minActivities)
    if (requiresLeadership) eligibility.requiresLeadership = true
    if (firstGenOnly) eligibility.firstGenOnly = true
    if (lowIncomeOnly) eligibility.lowIncomeOnly = true
    if (urmOnly) eligibility.urmOnly = true

    await saveOpportunity({
      ...draft,
      title: draft.title.trim(),
      tags: splitList(tags),
      requiredDocuments: splitLines(docs),
      eligibility,
    })
    setDraft(null)
    onChange()
  }

  const togglePublished = async (opp: Opportunity) => {
    await saveOpportunity({ ...opp, published: opp.published === false })
    onChange()
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <SectionHeader icon="explore" title={`Opportunities (${opps.length})`} />
        <button type="button" onClick={openCreate} className="flex h-9 items-center gap-1.5 rounded-lg bg-primary-container px-3 font-label-sm text-label-sm font-bold text-on-primary">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add
        </button>
      </div>

      {draft && (
        <form onSubmit={save} className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-label-md text-label-md font-bold text-primary">
              {opps.some((o) => o.id === draft.id) ? 'Edit opportunity' : 'New opportunity'}
            </h3>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close" className="text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <AdminField label="Title" value={draft.title} onChange={(v) => patch({ title: v })} required />
            <div className="grid grid-cols-2 gap-2">
              <AdminField label="Category" value={draft.category ?? ''} onChange={(v) => patch({ category: v })} placeholder="Scholarship" />
              <AdminField label="Award value" value={draft.award} onChange={(v) => patch({ award: v })} placeholder="$20,000 award" />
              <AdminField label="Deadline" value={draft.deadline} onChange={(v) => patch({ deadline: v })} placeholder="Oct 15" />
              <AdminField label="Days left" value={String(draft.daysLeft)} onChange={(v) => patch({ daysLeft: Number(v) || 0 })} type="number" />
            </div>
            <AdminField label="Summary" value={draft.summary} onChange={(v) => patch({ summary: v })} textarea />
            <AdminField label="Tags (comma separated)" value={tags} onChange={setTags} placeholder="Full-Ride, Leadership" />
            <AdminField label="Required documents (one per line)" value={docs} onChange={setDocs} textarea placeholder={'Transcript\nTwo recommendations\nPersonal statement'} />
            <AdminField label="Application instructions" value={draft.instructions ?? ''} onChange={(v) => patch({ instructions: v })} textarea />
            <AdminField label="Official application link" value={draft.applicationLink ?? ''} onChange={(v) => patch({ applicationLink: v })} placeholder="https://..." />
            <Toggle label="Published to students" value={draft.published !== false} onChange={(v) => patch({ published: v })} />
          </div>

          <div className="rounded-xl bg-surface-container-low p-space-md">
            <p className="mb-2 font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Matching & eligibility
            </p>
            <div className="grid grid-cols-2 gap-2">
              <AdminField label="Min GPA" value={minGpa} onChange={setMinGpa} type="number" step="0.01" />
              <AdminField label="Min activities" value={minActivities} onChange={setMinActivities} type="number" />
              <AdminField label="Majors (comma)" value={majors} onChange={setMajors} placeholder="Engineering, Biology" />
              <AdminField label="Interests (comma)" value={interests} onChange={setInterests} placeholder="STEM Research" />
              <AdminField label="Countries (comma)" value={countries} onChange={setCountries} placeholder="United States, Nigeria" />
              <AdminField label="Nationalities (comma)" value={nationalities} onChange={setNationalities} placeholder="Nigerian" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Toggle label="First-gen only" value={firstGenOnly} onChange={setFirstGenOnly} />
              <Toggle label="Low-income only" value={lowIncomeOnly} onChange={setLowIncomeOnly} />
              <Toggle label="URM only" value={urmOnly} onChange={setUrmOnly} />
              <Toggle label="Leadership required" value={requiresLeadership} onChange={setRequiresLeadership} />
            </div>
          </div>

          <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary">
            <span className="material-symbols-outlined text-[18px]">publish</span>
            {draft.published !== false ? 'Save & publish' : 'Save draft'}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {opps.map((opp) => (
          <div key={opp.id} className="flex items-start justify-between gap-2 rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate font-label-md text-label-md font-bold text-on-surface">{opp.title}</p>
                <span className={`rounded-full px-2 py-0.5 font-label-xs text-[10px] font-bold ${
                  opp.published === false ? 'bg-surface-container-high text-on-surface-variant' : 'bg-secondary-container text-on-secondary-container'
                }`}>
                  {opp.published === false ? 'Draft' : 'Published'}
                </span>
              </div>
              <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                {opp.award || 'Award TBD'} • {opp.deadline || 'TBD'} • {opp.eligibility?.minGpa ? `GPA ${opp.eligibility.minGpa}+` : 'No GPA rule'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton icon="edit" label="Edit" onClick={() => openEdit(opp)} />
              <IconButton icon={opp.published === false ? 'visibility' : 'visibility_off'} label="Toggle publish" onClick={() => togglePublished(opp)} />
              <IconButton icon="delete" label="Delete" danger onClick={async () => { await deleteOpportunity(opp.id); onChange() }} />
            </div>
          </div>
        ))}
        {opps.length === 0 && <Empty text="No opportunities yet. Add the first one." />}
      </div>
    </div>
  )
}

/* -------------------------------- Courses -------------------------------- */

const emptyCourse = (): Course => ({
  id: newContentId('course'),
  category: 'foundations',
  modules: 1,
  free: true,
  title: '',
  description: '',
  topics: [],
  stats: [],
  cta: 'View syllabus & modules',
  ctaIcon: 'arrow_forward',
  gradient: 'from-primary-container via-primary to-secondary-fixed',
  icon: 'auto_stories',
  published: true,
  lessons: [],
  resources: [],
})

function CoursesAdmin({ courses, onChange }: { courses: Course[]; onChange: () => void }) {
  const [draft, setDraft] = useState<Course | null>(null)
  const [topics, setTopics] = useState('')
  const [lesson, setLesson] = useState({ moduleTitle: '', title: '', content: '', duration: '', resourceLabel: '', resourceUrl: '' })
  const [resource, setResource] = useState({ label: '', url: '' })

  const open = (course?: Course) => {
    const next = course ? { ...course } : emptyCourse()
    setDraft(next)
    setTopics(next.topics.join(', '))
    setLesson({ moduleTitle: '', title: '', content: '', duration: '', resourceLabel: '', resourceUrl: '' })
    setResource({ label: '', url: '' })
  }
  const patch = (p: Partial<Course>) => setDraft((d) => (d ? { ...d, ...p } : d))

  const addLesson = () => {
    if (!draft || !lesson.title.trim() || !lesson.moduleTitle.trim()) return
    const newLesson: CourseLesson = {
      id: newContentId('lesson'),
      moduleTitle: lesson.moduleTitle.trim(),
      title: lesson.title.trim(),
      content: lesson.content.trim() || 'Lesson content coming soon.',
      duration: lesson.duration.trim() || undefined,
      resourceLabel: lesson.resourceLabel.trim() || undefined,
      resourceUrl: lesson.resourceUrl.trim() || undefined,
    }
    const lessons = [...(draft.lessons ?? []), newLesson]
    patch({
      lessons,
      modules: new Set(lessons.map((l) => l.moduleTitle)).size,
    })
    setLesson({ moduleTitle: '', title: '', content: '', duration: '', resourceLabel: '', resourceUrl: '' })
  }

  const addResource = () => {
    if (!draft || !resource.label.trim()) return
    const resources: CourseResource[] = [...(draft.resources ?? []), { label: resource.label.trim(), url: resource.url.trim() }]
    patch({ resources })
    setResource({ label: '', url: '' })
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft || !draft.title.trim()) return
    await saveCourse({
      ...draft,
      title: draft.title.trim(),
      topics: splitList(topics),
      modules: Math.max(1, new Set((draft.lessons ?? []).map((l) => l.moduleTitle)).size),
      stats: [{ icon: 'videocam', label: `${draft.lessons?.length ?? 0} lessons` }],
    })
    setDraft(null)
    onChange()
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <SectionHeader icon="auto_stories" title={`Courses (${courses.length})`} />
        <button type="button" onClick={() => open()} className="flex h-9 items-center gap-1.5 rounded-lg bg-primary-container px-3 font-label-sm text-label-sm font-bold text-on-primary">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add
        </button>
      </div>

      {draft && (
        <form onSubmit={save} className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-label-md text-label-md font-bold text-primary">
              {courses.some((c) => c.id === draft.id) ? 'Edit course' : 'New course'}
            </h3>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close" className="text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <AdminField label="Title" value={draft.title} onChange={(v) => patch({ title: v })} required />
          <AdminField label="Description" value={draft.description} onChange={(v) => patch({ description: v })} textarea />
          <div className="grid grid-cols-2 gap-2">
            <SelectField
              label="Category"
              value={draft.category}
              onChange={(v) => patch({ category: v as Course['category'] })}
              options={[
                { value: 'foundations', label: 'Foundations' },
                { value: 'essay', label: 'Essay Lab' },
                { value: 'research', label: 'Research' },
                { value: 'financial', label: 'Admissions Systems' },
                { value: 'progress', label: 'Progress' },
              ]}
            />
            <AdminField label="Topics (comma)" value={topics} onChange={setTopics} />
          </div>
          <Toggle label="Published to students" value={draft.published !== false} onChange={(v) => patch({ published: v })} />

          <div className="rounded-xl bg-surface-container-low p-space-md">
            <p className="mb-2 font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Modules & lessons ({draft.lessons?.length ?? 0})
            </p>
            <div className="flex flex-col gap-1">
              {(draft.lessons ?? []).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-lowest px-2.5 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate font-label-xs text-label-xs font-semibold text-on-surface">{l.moduleTitle} — {l.title}</p>
                    <p className="truncate font-label-xs text-[10px] text-on-surface-variant">{l.duration ?? 'Self-paced'}</p>
                  </div>
                  <button type="button" onClick={() => {
                    const lessons = (draft.lessons ?? []).filter((x) => x.id !== l.id)
                    patch({ lessons, modules: Math.max(1, new Set(lessons.map((x) => x.moduleTitle)).size) })
                  }} className="text-error" aria-label="Remove lesson">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <AdminField label="Module title" value={lesson.moduleTitle} onChange={(v) => setLesson({ ...lesson, moduleTitle: v })} placeholder="Module 1: Foundations" />
              <AdminField label="Lesson title" value={lesson.title} onChange={(v) => setLesson({ ...lesson, title: v })} />
              <AdminField label="Duration" value={lesson.duration} onChange={(v) => setLesson({ ...lesson, duration: v })} placeholder="12 min" />
              <AdminField label="Resource label" value={lesson.resourceLabel} onChange={(v) => setLesson({ ...lesson, resourceLabel: v })} placeholder="Worksheet PDF" />
            </div>
            <AdminField label="Lesson content" value={lesson.content} onChange={(v) => setLesson({ ...lesson, content: v })} textarea />
            <AdminField label="Resource URL" value={lesson.resourceUrl} onChange={(v) => setLesson({ ...lesson, resourceUrl: v })} placeholder="https://..." />
            <button type="button" onClick={addLesson} className="mt-2 flex h-9 items-center justify-center gap-1 rounded-lg bg-secondary-container font-label-xs text-label-xs font-bold text-on-secondary-container">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add lesson
            </button>
          </div>

          <div className="rounded-xl bg-surface-container-low p-space-md">
            <p className="mb-2 font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Downloadable resources
            </p>
            {(draft.resources ?? []).map((r) => (
              <div key={r.label} className="mb-1 flex items-center justify-between gap-2 rounded-lg bg-surface-container-lowest px-2.5 py-1.5">
                <span className="truncate font-label-xs text-label-xs text-on-surface">{r.label}</span>
                <button type="button" onClick={() => patch({ resources: (draft.resources ?? []).filter((x) => x.label !== r.label) })} className="text-error" aria-label="Remove resource">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <AdminField label="Resource label" value={resource.label} onChange={(v) => setResource({ ...resource, label: v })} />
              <AdminField label="URL" value={resource.url} onChange={(v) => setResource({ ...resource, url: v })} placeholder="https://..." />
            </div>
            <button type="button" onClick={addResource} className="mt-2 flex h-9 items-center justify-center gap-1 rounded-lg bg-surface-container-lowest font-label-xs text-label-xs font-bold text-primary">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add resource
            </button>
          </div>

          <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary">
            <span className="material-symbols-outlined text-[18px]">publish</span>
            Save course
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {courses.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-2 rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate font-label-md text-label-md font-bold text-on-surface">{c.title}</p>
                <span className={`rounded-full px-2 py-0.5 font-label-xs text-[10px] font-bold ${
                  c.published === false ? 'bg-surface-container-high text-on-surface-variant' : 'bg-secondary-container text-on-secondary-container'
                }`}>
                  {c.published === false ? 'Draft' : 'Published'}
                </span>
              </div>
              <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                {c.modules} modules • {c.lessons?.length ?? 0} lessons
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton icon="edit" label="Edit" onClick={() => open(c)} />
              <IconButton icon={c.published === false ? 'visibility' : 'visibility_off'} label="Toggle publish" onClick={async () => { await saveCourse({ ...c, published: c.published === false }); onChange() }} />
              <IconButton icon="delete" label="Delete" danger onClick={async () => { await deleteCourse(c.id); onChange() }} />
            </div>
          </div>
        ))}
        {courses.length === 0 && <Empty text="No courses yet." />}
      </div>
    </div>
  )
}

/* -------------------------------- Sprints -------------------------------- */

function SprintsAdmin({
  sprints,
  mentors,
  sessions,
  users,
  onChange,
}: {
  sprints: ReturnType<typeof getSprints>
  mentors: AuthUser[]
  sessions: LiveSession[]
  users: AuthUser[]
  onChange: () => void
}) {
  const [draft, setDraft] = useState<Sprint | null>(null)
  const [objectives, setObjectives] = useState('')
  const [milestones, setMilestones] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const open = (sprint?: Sprint) => {
    const next: Sprint = sprint
      ? { ...sprint }
      : {
          id: newContentId('sprint'),
          badge: 'New',
          badgeTone: 'secondary',
          title: '',
          meta: '',
          description: '',
          icon: 'school',
          spots: 'Open enrollment',
          spotsTone: 'secondary',
          cta: 'Register',
          objectives: [],
          capacity: 50,
          milestones: [],
          mentorIds: [],
          mentorNames: [],
          liveSessionIds: [],
          published: true,
        }
    setDraft(next)
    setObjectives((next.objectives ?? []).join('\n'))
    setMilestones((next.milestones ?? []).map((m) => `${m.title} | ${m.date}`).join('\n'))
  }
  const patch = (p: Partial<Sprint>) => setDraft((d) => (d ? { ...d, ...p } : d))

  const toggleMentor = (id: string) => {
    if (!draft) return
    const ids = draft.mentorIds ?? []
    const nextIds = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    patch({
      mentorIds: nextIds,
      mentorNames: mentors.filter((m) => nextIds.includes(m.id)).map((m) => m.name),
    })
  }
  const toggleSession = (id: string) => {
    if (!draft) return
    const ids = draft.liveSessionIds ?? []
    patch({ liveSessionIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] })
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft || !draft.title.trim()) return
    const ms = splitLines(milestones)
      .map((line, index) => {
        const [title, date] = line.split('|').map((x) => x.trim())
        return { id: `ms_${index}_${Date.now()}`, title: title || `Milestone ${index + 1}`, date: date || 'TBD' }
      })
    const enrolled = sprints.find((s) => s.id === draft.id)?.enrolledUsers.length ?? 0
    const capacity = draft.capacity ?? 50
    await saveSprint({
      ...draft,
      title: draft.title.trim(),
      objectives: splitLines(objectives),
      milestones: ms,
      spots: `${Math.max(0, capacity - enrolled)} spots remaining`,
      spotsTone: capacity - enrolled === 0 ? 'tertiary' : 'secondary',
    })
    setDraft(null)
    onChange()
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <SectionHeader icon="school" title={`Sprints (${sprints.length})`} />
        <button type="button" onClick={() => open()} className="flex h-9 items-center gap-1.5 rounded-lg bg-primary-container px-3 font-label-sm text-label-sm font-bold text-on-primary">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add
        </button>
      </div>

      {draft && (
        <form onSubmit={save} className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-label-md text-label-md font-bold text-primary">
              {sprints.some((s) => s.id === draft.id) ? 'Edit sprint' : 'New sprint'}
            </h3>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close" className="text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <AdminField label="Title" value={draft.title} onChange={(v) => patch({ title: v })} required />
          <AdminField label="Description" value={draft.description} onChange={(v) => patch({ description: v })} textarea />
          <div className="grid grid-cols-2 gap-2">
            <AdminField label="Dates / duration" value={draft.meta} onChange={(v) => patch({ meta: v })} placeholder="5 days • Oct 1–Oct 5" />
            <AdminField label="Capacity" value={String(draft.capacity ?? 50)} onChange={(v) => patch({ capacity: Number(v) || 0 })} type="number" />
            <AdminField label="Badge" value={draft.badge} onChange={(v) => patch({ badge: v })} />
            <AdminField label="Icon" value={draft.icon} onChange={(v) => patch({ icon: v })} placeholder="school" />
            <AdminField label="Start date" value={draft.startDate ?? ''} onChange={(v) => patch({ startDate: v })} type="date" />
            <AdminField label="End date" value={draft.endDate ?? ''} onChange={(v) => patch({ endDate: v })} type="date" />
          </div>
          <AdminField label="Objectives (one per line)" value={objectives} onChange={setObjectives} textarea />
          <AdminField label="Milestones (Title | Date, one per line)" value={milestones} onChange={setMilestones} textarea placeholder={'Draft outline | Oct 2\nPeer review | Oct 4'} />
          <Toggle label="Published to students" value={draft.published !== false} onChange={(v) => patch({ published: v })} />

          <div className="rounded-xl bg-surface-container-low p-space-md">
            <p className="mb-2 font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">Assign mentors</p>
            {mentors.length === 0 && <p className="font-label-xs text-label-xs text-on-surface-variant">No mentors yet. Promote a user in the Mentors tab.</p>}
            <div className="flex flex-col gap-1">
              {mentors.map((m) => (
                <Toggle key={m.id} label={m.name} value={(draft.mentorIds ?? []).includes(m.id)} onChange={() => toggleMentor(m.id)} />
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-surface-container-low p-space-md">
            <p className="mb-2 font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">Scheduled live sessions</p>
            {sessions.length === 0 && <p className="font-label-xs text-label-xs text-on-surface-variant">Create live sessions first.</p>}
            <div className="flex flex-col gap-1">
              {sessions.map((s) => (
                <Toggle key={s.id} label={`${s.title} (${s.timeBadge})`} value={(draft.liveSessionIds ?? []).includes(s.id)} onChange={() => toggleSession(s.id)} />
              ))}
            </div>
          </div>

          <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary">
            <span className="material-symbols-outlined text-[18px]">publish</span>
            Save sprint
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {sprints.map((s) => {
          const enrolledNames = s.enrolledUsers
            .map((id) => users.find((u) => u.id === id)?.name ?? id.slice(0, 8))
          return (
            <div key={s.id} className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-label-md text-label-md font-bold text-on-surface">{s.title}</p>
                    <span className={`rounded-full px-2 py-0.5 font-label-xs text-[10px] font-bold ${
                      s.published === false ? 'bg-surface-container-high text-on-surface-variant' : 'bg-secondary-container text-on-secondary-container'
                    }`}>
                      {s.published === false ? 'Draft' : 'Published'}
                    </span>
                  </div>
                  <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                    {s.meta} • {s.enrolledUsers.length}/{s.capacity} enrolled
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton icon="edit" label="Edit" onClick={() => open(s)} />
                  <IconButton icon={s.published === false ? 'visibility' : 'visibility_off'} label="Toggle publish" onClick={async () => { await saveSprint({ ...s, published: s.published === false }); onChange() }} />
                  <IconButton icon="delete" label="Delete" danger onClick={async () => { await deleteSprint(s.id); onChange() }} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                className="flex w-max items-center gap-1 font-label-xs text-label-xs font-semibold text-secondary"
              >
                <span className="material-symbols-outlined text-[15px]">group</span>
                {expanded === s.id ? 'Hide participants' : 'View participants'}
              </button>
              {expanded === s.id && (
                <div className="rounded-lg bg-surface-container-low p-2.5">
                  {enrolledNames.length === 0 ? (
                    <p className="font-label-xs text-label-xs text-on-surface-variant">No registrations yet.</p>
                  ) : (
                    <p className="font-label-xs text-label-xs text-on-surface-variant">{enrolledNames.join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ----------------------------- Live sessions ----------------------------- */

function SessionsAdmin({
  sessions,
  opps,
  onChange,
}: {
  sessions: LiveSession[]
  opps: Opportunity[]
  onChange: () => void
}) {
  const blank: LiveSession = {
    id: newContentId('session'),
    title: '',
    host: '',
    hostDetail: 'Mentor',
    timeBadge: '',
    timeTone: 'neutral',
    attendees: 0,
    description: '',
    date: '',
    time: '',
    meetingLink: '',
    relatedOpportunityId: '',
    audience: 'all',
    published: true,
  }
  const [draft, setDraft] = useState<LiveSession | null>(null)
  const patch = (p: Partial<LiveSession>) => setDraft((d) => (d ? { ...d, ...p } : d))

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft || !draft.title.trim()) return
    saveInfoSession({
      ...draft,
      title: draft.title.trim(),
      host: draft.host.trim() || 'GSP Mentor',
      timeBadge: draft.timeBadge.trim() || [draft.date, draft.time].filter(Boolean).join(' • ') || 'TBD',
    })
    setDraft(null)
    onChange()
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <SectionHeader icon="sensors" title={`Live sessions (${sessions.length})`} />
        <button type="button" onClick={() => setDraft({ ...blank })} className="flex h-9 items-center gap-1.5 rounded-lg bg-primary-container px-3 font-label-sm text-label-sm font-bold text-on-primary">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add
        </button>
      </div>

      {draft && (
        <form onSubmit={save} className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-label-md text-label-md font-bold text-primary">
              {sessions.some((s) => s.id === draft.id) ? 'Edit live session' : 'New live session'}
            </h3>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close" className="text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <AdminField label="Title" value={draft.title} onChange={(v) => patch({ title: v })} required />
          <AdminField label="Description" value={draft.description ?? ''} onChange={(v) => patch({ description: v })} textarea />
          <div className="grid grid-cols-2 gap-2">
            <AdminField label="Date" value={draft.date ?? ''} onChange={(v) => patch({ date: v })} type="date" />
            <AdminField label="Time" value={draft.time ?? ''} onChange={(v) => patch({ time: v })} type="time" />
            <AdminField label="Host / facilitator" value={draft.host} onChange={(v) => patch({ host: v })} />
            <AdminField label="Host detail" value={draft.hostDetail} onChange={(v) => patch({ hostDetail: v })} placeholder="Stanford '27" />
            <AdminField label="Time badge" value={draft.timeBadge} onChange={(v) => patch({ timeBadge: v })} placeholder="Today • 6:30 PM EST" />
            <AdminField label="Attendees" value={String(draft.attendees)} onChange={(v) => patch({ attendees: Number(v) || 0 })} type="number" />
          </div>
          <AdminField label="Meeting link" value={draft.meetingLink ?? ''} onChange={(v) => patch({ meetingLink: v })} placeholder="https://zoom.us/..." />
          <SelectField
            label="Related opportunity"
            value={draft.relatedOpportunityId ?? ''}
            onChange={(v) => patch({ relatedOpportunityId: v })}
            options={[{ value: '', label: 'None' }, ...opps.map((o) => ({ value: o.id, label: o.title }))]}
          />
          <SelectField
            label="Target audience"
            value={draft.audience ?? 'all'}
            onChange={(v) => patch({ audience: v as LiveSession['audience'] })}
            options={[
              { value: 'all', label: 'Everyone' },
              { value: 'students', label: 'Students' },
              { value: 'mentors', label: 'Mentors' },
            ]}
          />
          <SelectField
            label="Badge tone"
            value={draft.timeTone}
            onChange={(v) => patch({ timeTone: v as LiveSession['timeTone'] })}
            options={[
              { value: 'error', label: 'Live / today (red)' },
              { value: 'neutral', label: 'Upcoming (neutral)' },
              { value: 'secondary', label: 'Featured (green)' },
            ]}
          />
          <Toggle label="Published to dashboards" value={draft.published !== false} onChange={(v) => patch({ published: v })} />
          <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary">
            <span className="material-symbols-outlined text-[18px]">publish</span>
            Save session
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-2 rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate font-label-md text-label-md font-bold text-on-surface">{s.title}</p>
                <span className={`rounded-full px-2 py-0.5 font-label-xs text-[10px] font-bold ${
                  s.published === false ? 'bg-surface-container-high text-on-surface-variant' : 'bg-secondary-container text-on-secondary-container'
                }`}>
                  {s.published === false ? 'Draft' : 'Published'}
                </span>
              </div>
              <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                {s.host} • {s.timeBadge} • {s.audience ?? 'all'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton icon="edit" label="Edit" onClick={() => setDraft({ ...s })} />
              <IconButton icon={s.published === false ? 'visibility' : 'visibility_off'} label="Toggle publish" onClick={() => { saveInfoSession({ ...s, published: s.published === false }); onChange() }} />
              <IconButton icon="delete" label="Delete" danger onClick={() => { deleteInfoSession(s.id); onChange() }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------- Mentors -------------------------------- */

function MentorsAdmin({
  mentors,
  students,
  sprints,
  services,
  onChange,
}: {
  mentors: AuthUser[]
  students: AuthUser[]
  sprints: ReturnType<typeof getSprints>
  services: Service[]
  onChange: () => void
}) {
  const [selectedStudent, setSelectedStudent] = useState('')
  const [tracks, setTracks] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const map: Record<string, string[]> = {}
    for (const m of mentors) map[m.id] = getMentorTracks(m.id)
    setTracks(map)
  }, [mentors])

  const promote = async () => {
    if (!selectedStudent) return
    await updateUserRole(selectedStudent, 'mentor' as UserRole)
    setSelectedStudent('')
    onChange()
  }

  const toggleTrack = (mentorId: string, track: string) => {
    const current = tracks[mentorId] ?? []
    const next = current.includes(track) ? current.filter((t) => t !== track) : [...current, track]
    setTracks((prev) => ({ ...prev, [mentorId]: next }))
    setMentorTracks(mentorId, next)
  }

  return (
    <div className="flex flex-col gap-space-md">
      <SectionHeader icon="supervisor_account" title={`Mentors (${mentors.length})`} />

      <div className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
        <p className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Promote an existing user to mentor
        </p>
        <SelectField
          label="Student account"
          value={selectedStudent}
          onChange={setSelectedStudent}
          options={[{ value: '', label: 'Select a student…' }, ...students.map((s) => ({ value: s.id, label: `${s.name} (${s.email})` }))]}
        />
        <button type="button" onClick={promote} disabled={!selectedStudent} className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary-container font-label-sm text-label-sm font-bold text-on-primary disabled:opacity-50">
          <span className="material-symbols-outlined text-[17px]">upgrade</span>
          Grant mentor access
        </button>
        <p className="font-label-xs text-label-xs text-on-surface-variant">
          New mentors can also sign up with the code <span className="font-bold text-primary">GSP-MENTOR-2026</span>.
        </p>
      </div>

      {mentors.map((m) => {
        const assignedSprints = sprints.filter((s) => (s.mentorIds ?? []).includes(m.id))
        const assignedServices = services.filter((s) => s.mentorId === m.id)
        return (
          <div key={m.id} className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container">
                <span className="material-symbols-outlined text-[18px] text-on-secondary-container">school</span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-label-md text-label-md font-bold text-on-surface">{m.name}</p>
                <p className="truncate font-label-xs text-label-xs text-on-surface-variant">{m.email}</p>
              </div>
            </div>
            <p className="font-label-xs text-label-xs text-on-surface-variant">
              Sprints: {assignedSprints.map((s) => s.title).join(', ') || 'None'} •
              Services: {assignedServices.map((s) => s.title).join(', ') || 'None'}
            </p>
            <div>
              <p className="mb-1 font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Specialisation tracks
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MENTOR_TRACKS.map((track) => (
                  <button
                    key={track}
                    type="button"
                    onClick={() => toggleTrack(m.id, track)}
                    className={`rounded-full px-2.5 py-1 font-label-xs text-[10px] font-bold transition-colors ${
                      (tracks[m.id] ?? []).includes(track)
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    {track}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })}
      {mentors.length === 0 && <Empty text="No mentors yet. Promote a student or share the mentor signup code." />}
    </div>
  )
}

/* -------------------------------- Services ------------------------------- */

const emptyService = (): Service => ({
  id: newContentId('svc'),
  category: 'writing',
  badgeTone: 'neutral',
  title: '',
  price: '$0',
  priceUnit: 'per session',
  description: '',
  cta: 'Request service',
  ctaTone: 'primary',
  published: true,
})

function ServicesAdmin({
  services,
  mentors,
  onChange,
}: {
  services: Service[]
  mentors: AuthUser[]
  onChange: () => void
}) {
  const [draft, setDraft] = useState<Service | null>(null)
  const patch = (p: Partial<Service>) => setDraft((d) => (d ? { ...d, ...p } : d))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft || !draft.title.trim()) return
    const mentor = mentors.find((m) => m.id === draft.mentorId)
    await saveService({
      ...draft,
      title: draft.title.trim(),
      mentorName: mentor?.name,
    })
    setDraft(null)
    onChange()
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <SectionHeader icon="handshake" title={`Services (${services.length})`} />
        <button type="button" onClick={() => setDraft(emptyService())} className="flex h-9 items-center gap-1.5 rounded-lg bg-primary-container px-3 font-label-sm text-label-sm font-bold text-on-primary">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add
        </button>
      </div>

      {draft && (
        <form onSubmit={save} className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-label-md text-label-md font-bold text-primary">
              {services.some((s) => s.id === draft.id) ? 'Edit service' : 'New service'}
            </h3>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close" className="text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <AdminField label="Title" value={draft.title} onChange={(v) => patch({ title: v })} required />
          <AdminField label="Description" value={draft.description} onChange={(v) => patch({ description: v })} textarea />
          <div className="grid grid-cols-2 gap-2">
            <AdminField label="Price label" value={draft.price} onChange={(v) => patch({ price: v })} placeholder="$45" />
            <AdminField label="Price unit" value={draft.priceUnit} onChange={(v) => patch({ priceUnit: v })} placeholder="per draft" />
            <AdminField label="CTA label" value={draft.cta} onChange={(v) => patch({ cta: v })} />
            <SelectField
              label="Category"
              value={draft.category}
              onChange={(v) => patch({ category: v as Service['category'] })}
              options={[
                { value: 'writing', label: 'Essay & Writing' },
                { value: 'audit', label: 'App Review' },
                { value: 'mentorship', label: '1-on-1 Mentorship' },
                { value: 'intl', label: "Financial & Int'l" },
              ]}
            />
          </div>
          <SelectField
            label="Assigned mentor"
            value={draft.mentorId ?? ''}
            onChange={(v) => patch({ mentorId: v || undefined })}
            options={[{ value: '', label: 'Unassigned' }, ...mentors.map((m) => ({ value: m.id, label: m.name }))]}
          />
          <Toggle label="Published to students" value={draft.published !== false} onChange={(v) => patch({ published: v })} />
          <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary">
            <span className="material-symbols-outlined text-[18px]">publish</span>
            Save service
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {services.map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-2 rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate font-label-md text-label-md font-bold text-on-surface">{s.title}</p>
                <span className={`rounded-full px-2 py-0.5 font-label-xs text-[10px] font-bold ${
                  s.published === false ? 'bg-surface-container-high text-on-surface-variant' : 'bg-secondary-container text-on-secondary-container'
                }`}>
                  {s.published === false ? 'Draft' : 'Published'}
                </span>
              </div>
              <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                {s.price} {s.priceUnit} • {s.category} • {s.mentorName ?? 'Unassigned'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton icon="edit" label="Edit" onClick={() => setDraft({ ...s })} />
              <IconButton icon={s.published === false ? 'visibility' : 'visibility_off'} label="Toggle publish" onClick={async () => { await saveService({ ...s, published: s.published === false }); onChange() }} />
              <IconButton icon="delete" label="Delete" danger onClick={async () => { await deleteService(s.id); onChange() }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------- Bookings ------------------------------- */

function BookingsAdmin({
  bookings,
  mentors,
  onChange,
}: {
  bookings: Booking[]
  mentors: AuthUser[]
  onChange: () => void
}) {
  return (
    <div className="flex flex-col gap-space-md">
      <SectionHeader icon="calendar_month" title={`Service bookings (${bookings.length})`} />
      {bookings.length === 0 && <Empty text="No service requests yet. Students can request services from the Services page." />}
      {bookings.map((booking) => (
        <div key={booking.id} className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-label-md text-label-md font-bold text-on-surface">{booking.serviceTitle}</p>
              <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                {booking.studentName} • {booking.date} at {booking.time}
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
          {booking.notes && (
            <p className="rounded-lg bg-surface-container-low p-2 font-body-sm text-body-sm text-on-surface-variant">“{booking.notes}”</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <SelectField
              label="Assign mentor"
              value={booking.mentorId ?? ''}
              onChange={(v) => {
                const mentor = mentors.find((m) => m.id === v)
                updateBooking(booking.id, { mentorId: v || undefined, mentorName: mentor?.name })
                onChange()
              }}
              options={[{ value: '', label: 'Unassigned' }, ...mentors.map((m) => ({ value: m.id, label: m.name }))]}
            />
            <SelectField
              label="Status"
              value={booking.status}
              onChange={(v) => {
                updateBooking(booking.id, { status: v as BookingStatus })
                onChange()
              }}
              options={[
                { value: 'requested', label: 'Requested' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
          <button type="button" onClick={() => { deleteBooking(booking.id); onChange() }} className="flex w-max items-center gap-1 font-label-xs text-label-xs text-error">
            <span className="material-symbols-outlined text-[14px]">delete</span>
            Delete request
          </button>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------- Students ------------------------------- */

function StudentsAdmin({ students }: { students: AuthUser[] }) {
  const [profiles, setProfiles] = useState<Record<string, Profile | null>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const sprints = useMemo(() => getSprints(), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const map: Record<string, Profile | null> = {}
      for (const s of students) map[s.id] = await getProfile(s.id)
      if (!cancelled) setProfiles(map)
    })()
    return () => { cancelled = true }
  }, [students])

  return (
    <div className="flex flex-col gap-space-md">
      <SectionHeader icon="group" title={`Students (${students.length})`} />
      {students.length === 0 && (
        <Empty text="No students yet. Students appear here after they sign up." />
      )}
      {students.map((s) => {
        const p = profiles[s.id]
        const joined = sprints.filter((sp) => sp.enrolledUsers.includes(s.id))
        const open = expanded === s.id
        return (
          <div key={s.id} className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <button type="button" onClick={() => setExpanded(open ? null : s.id)} className="flex items-center gap-3 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container">
                <span className="material-symbols-outlined text-[18px] text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-label-md text-label-md font-bold text-on-surface">{s.name}</p>
                <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                  {s.email} • {p?.intendedMajor || 'Undecided'} • GPA {p?.gpa ?? '—'}
                </p>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{open ? 'expand_less' : 'expand_more'}</span>
            </button>

            {open && (
              <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-2.5">
                <InfoRow label="Education" value={p?.educationLevel ?? '—'} />
                <InfoRow label="Location" value={p?.location || '—'} />
                <InfoRow label="Countries" value={[p?.countryOfOrigin, p?.countryOfResidence].filter(Boolean).join(' → ') || '—'} />
                <InfoRow label="Nationality" value={p?.nationality || '—'} />
                <InfoRow label="First-gen / low-income / URM" value={[p?.firstGen ? 'First-gen' : null, p?.lowIncome ? 'Low-income' : null, p?.urm ? 'URM' : null].filter(Boolean).join(', ') || 'None'} />
                <InfoRow label="Interests" value={(p?.interests ?? []).join(', ') || '—'} />
                <InfoRow label="Schools" value={(p?.schools ?? []).map((x) => x.name).filter(Boolean).join(', ') || '—'} />
                <InfoRow label="Activities" value={String(p?.activities?.length ?? 0)} />
                <InfoRow label="Sprint registrations" value={joined.map((x) => x.title).join(', ') || 'None'} />
                {p?.bio && (
                  <p className="rounded-lg bg-surface-container-lowest p-2 font-body-sm text-body-sm text-on-surface-variant">{p.bio}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* --------------------------------- Shared -------------------------------- */

function AdminField({
  label,
  value,
  onChange,
  type = 'text',
  step,
  required = false,
  placeholder,
  textarea = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  step?: string
  required?: boolean
  placeholder?: string
  textarea?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {label}{required && <span className="text-error"> *</span>}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full resize-none rounded-xl bg-surface-container-low p-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
        />
      ) : (
        <input
          type={type}
          step={step}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl bg-surface-container-low px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
        />
      )}
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl bg-surface-container-low px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-2.5 py-2 text-left">
      <span className="font-label-xs text-label-xs text-on-surface">{label}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${value ? 'bg-primary-container' : 'bg-surface-container-highest'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
    </button>
  )
}

function IconButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: string
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors ${
        danger ? 'hover:bg-error-container hover:text-error' : 'hover:bg-surface-container hover:text-primary'
      }`}
    >
      <span className="material-symbols-outlined text-[17px]">{icon}</span>
    </button>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-space-md text-center">
      <p className="font-body-sm text-body-sm text-on-surface-variant">{text}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 font-label-xs text-label-xs text-on-surface-variant">{label}</span>
      <span className="text-right font-label-xs text-label-xs font-semibold text-on-surface">{value}</span>
    </div>
  )
}

function splitList(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}
function splitLines(value: string): string[] {
  return value.split('\n').map((s) => s.trim()).filter(Boolean)
}
