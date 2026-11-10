import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getOpportunities, saveOpportunity, deleteOpportunity } from '../lib/store'
import { getCourses, saveCourse, deleteCourse } from '../lib/store'
import { getServices, saveService, deleteService } from '../lib/store'
import { getUsers, getProfile } from '../lib/auth'
import type { Opportunity, Course, Service } from '../data/mockData'
import type { OpportunityEligibility } from '../lib/matching'
import { SectionHeader } from '../components/ui'

type AdminTab = 'overview' | 'opportunities' | 'courses' | 'services' | 'users'

const tabs: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'opportunities', label: 'Opportunities', icon: 'explore' },
  { id: 'courses', label: 'Courses', icon: 'auto_stories' },
  { id: 'services', label: 'Services', icon: 'handshake' },
  { id: 'users', label: 'Users', icon: 'group' },
]

export default function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate((n) => n + 1)

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

  const opps = getOpportunities()
  const courses = getCourses()
  const services = getServices()
  const users = getUsers().filter((u) => u.role === 'student')

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary">
            Admin Dashboard
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Manage the entire platform.
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary">
          <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
        </div>
      </div>

      {/* Tabs */}
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
        <Overview opps={opps} courses={courses} services={services} users={users} />
      )}
      {tab === 'opportunities' && <OpportunitiesAdmin opps={opps} onChange={refresh} />}
      {tab === 'courses' && <CoursesAdmin courses={courses} onChange={refresh} />}
      {tab === 'services' && <ServicesAdmin services={services} onChange={refresh} />}
      {tab === 'users' && <UsersAdmin users={users} />}
    </div>
  )
}

function Overview({
  opps,
  courses,
  services,
  users,
}: {
  opps: Opportunity[]
  courses: Course[]
  services: Service[]
  users: { id: string }[]
}) {
  const stats = [
    { label: 'Students', value: users.length, icon: 'group', tone: 'bg-secondary-container text-on-secondary-container' },
    { label: 'Opportunities', value: opps.length, icon: 'explore', tone: 'bg-tertiary-fixed text-on-tertiary-fixed' },
    { label: 'Courses', value: courses.length, icon: 'auto_stories', tone: 'bg-primary-fixed text-on-primary-fixed' },
    { label: 'Services', value: services.length, icon: 'handshake', tone: 'bg-surface-container-high text-primary' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-space-md shadow-sm"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.tone}`}>
            <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
          </div>
          <div>
            <p className="text-headline-lg font-bold text-primary">{s.value}</p>
            <p className="font-label-xs text-label-xs text-on-surface-variant">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function OpportunitiesAdmin({ opps, onChange }: { opps: Opportunity[]; onChange: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [award, setAward] = useState('')
  const [summary, setSummary] = useState('')
  const [deadline, setDeadline] = useState('')
  const [daysLeft, setDaysLeft] = useState('30')
  const [match, setMatch] = useState('85')
  const [tags, setTags] = useState('')
  const [minGpa, setMinGpa] = useState('')
  const [majors, setMajors] = useState('')
  const [firstGenOnly, setFirstGenOnly] = useState(false)
  const [lowIncomeOnly, setLowIncomeOnly] = useState(false)
  const [urmOnly, setUrmOnly] = useState(false)
  const [interests, setInterests] = useState('')

  const reset = () => {
    setTitle('')
    setAward('')
    setSummary('')
    setDeadline('')
    setDaysLeft('30')
    setMatch('85')
    setTags('')
    setMinGpa('')
    setMajors('')
    setFirstGenOnly(false)
    setLowIncomeOnly(false)
    setUrmOnly(false)
    setInterests('')
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const eligibility: OpportunityEligibility = {}
    if (minGpa) eligibility.minGpa = Number(minGpa)
    if (majors.trim()) eligibility.majors = majors.split(',').map((s) => s.trim()).filter(Boolean)
    if (firstGenOnly) eligibility.firstGenOnly = true
    if (lowIncomeOnly) eligibility.lowIncomeOnly = true
    if (urmOnly) eligibility.urmOnly = true
    if (interests.trim()) eligibility.interests = interests.split(',').map((s) => s.trim()).filter(Boolean)

    const opp: Opportunity = {
      id: 'opp_' + Date.now(),
      title: title.trim(),
      match: Number(match) || 80,
      tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
      award: award.trim() || 'Award TBD',
      awardIcon: 'workspace_premium',
      summary: summary.trim() || 'No summary provided.',
      deadline: deadline.trim() || 'TBD',
      daysLeft: Number(daysLeft) || 30,
      eligibility,
    } as Opportunity & { eligibility: OpportunityEligibility }
    saveOpportunity(opp)
    reset()
    setShowForm(false)
    onChange()
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <SectionHeader icon="explore" title={`Opportunities (${opps.length})`} />
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary-container px-3 font-label-sm text-label-sm font-bold text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">
            {showForm ? 'close' : 'add'}
          </span>
          {showForm ? 'Cancel' : 'Add opportunity'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm"
        >
          <h3 className="font-label-md text-label-md font-bold text-primary">
            New opportunity
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Title" value={title} onChange={setTitle} required />
            <AdminField label="Award value" value={award} onChange={setAward} placeholder="$20,000 award" />
            <AdminField label="Deadline" value={deadline} onChange={setDeadline} placeholder="Oct 15" />
            <AdminField label="Days left" value={daysLeft} onChange={setDaysLeft} type="number" />
            <AdminField label="Match %" value={match} onChange={setMatch} type="number" />
            <AdminField label="Tags (comma separated)" value={tags} onChange={setTags} placeholder="Full-Ride, Leadership" />
          </div>
          <AdminField label="Summary" value={summary} onChange={setSummary} textarea />
          <div className="rounded-xl bg-surface-container-low p-space-md">
            <p className="mb-2 font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Eligibility (matching rules)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AdminField label="Min GPA" value={minGpa} onChange={setMinGpa} type="number" step="0.01" />
              <AdminField label="Majors (comma)" value={majors} onChange={setMajors} placeholder="STEM, Engineering" />
              <AdminField label="Interests (comma)" value={interests} onChange={setInterests} placeholder="STEM Research" />
              <div className="flex flex-col gap-2">
                <Toggle label="First-gen only" value={firstGenOnly} onChange={setFirstGenOnly} />
                <Toggle label="Low-income only" value={lowIncomeOnly} onChange={setLowIncomeOnly} />
                <Toggle label="URM only" value={urmOnly} onChange={setUrmOnly} />
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">publish</span>
            Publish opportunity
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {opps.map((opp) => (
          <div
            key={opp.id}
            className="flex items-start justify-between gap-3 rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-label-md text-label-md font-bold text-on-surface">
                {opp.title}
              </p>
              <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                {opp.award} • {opp.deadline} • {opp.match}% match
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                deleteOpportunity(opp.id)
                onChange()
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
              aria-label="Delete"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function CoursesAdmin({ courses, onChange }: { courses: Course[]; onChange: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [modules, setModules] = useState('6')
  const [price, setPrice] = useState('')
  const [free, setFree] = useState(true)
  const [topics, setTopics] = useState('')

  const reset = () => {
    setTitle('')
    setDescription('')
    setModules('6')
    setPrice('')
    setFree(true)
    setTopics('')
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const course: Course = {
      id: 'course_' + Date.now(),
      category: 'foundations',
      modules: Number(modules) || 4,
      price: free ? undefined : price,
      free,
      title: title.trim(),
      description: description.trim() || 'No description.',
      topics: topics.split(',').map((s) => s.trim()).filter(Boolean),
      stats: [{ icon: 'videocam', label: `${modules} modules` }],
      cta: 'View Syllabus & Modules',
      ctaIcon: 'arrow_forward',
      gradient: 'from-primary-container via-primary to-secondary-fixed',
      icon: 'auto_stories',
    }
    saveCourse(course)
    reset()
    setShowForm(false)
    onChange()
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <SectionHeader icon="auto_stories" title={`Courses (${courses.length})`} />
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary-container px-3 font-label-sm text-label-sm font-bold text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">
            {showForm ? 'close' : 'add'}
          </span>
          {showForm ? 'Cancel' : 'Add course'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm"
        >
          <h3 className="font-label-md text-label-md font-bold text-primary">New course</h3>
          <AdminField label="Title" value={title} onChange={setTitle} required />
          <AdminField label="Description" value={description} onChange={setDescription} textarea />
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Modules" value={modules} onChange={setModules} type="number" />
            <AdminField label="Topics (comma)" value={topics} onChange={setTopics} />
          </div>
          <Toggle label="Free course" value={free} onChange={setFree} />
          {!free && <AdminField label="Price" value={price} onChange={setPrice} placeholder="$49" />}
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">publish</span>
            Publish course
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {courses.map((c) => (
          <div
            key={c.id}
            className="flex items-start justify-between gap-3 rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-label-md text-label-md font-bold text-on-surface">
                {c.title}
              </p>
              <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                {c.modules} modules • {c.free ? 'Free' : c.price}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                deleteCourse(c.id)
                onChange()
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
              aria-label="Delete"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ServicesAdmin({ services, onChange }: { services: Service[]; onChange: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [priceUnit, setPriceUnit] = useState('')
  const [category, setCategory] = useState<Service['category']>('writing')
  const [cta, setCta] = useState('')

  const reset = () => {
    setTitle('')
    setDescription('')
    setPrice('')
    setPriceUnit('')
    setCategory('writing')
    setCta('')
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const service: Service = {
      id: 'svc_' + Date.now(),
      category,
      badgeTone: 'neutral',
      title: title.trim(),
      price: price.trim() || '$0',
      priceUnit: priceUnit.trim() || 'per session',
      description: description.trim() || 'No description.',
      cta: cta.trim() || 'Book now',
      ctaTone: 'primary',
    }
    saveService(service)
    reset()
    setShowForm(false)
    onChange()
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <SectionHeader icon="handshake" title={`Services (${services.length})`} />
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary-container px-3 font-label-sm text-label-sm font-bold text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">
            {showForm ? 'close' : 'add'}
          </span>
          {showForm ? 'Cancel' : 'Add service'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm"
        >
          <h3 className="font-label-md text-label-md font-bold text-primary">New service</h3>
          <AdminField label="Title" value={title} onChange={setTitle} required />
          <AdminField label="Description" value={description} onChange={setDescription} textarea />
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Price" value={price} onChange={setPrice} placeholder="$45" />
            <AdminField label="Price unit" value={priceUnit} onChange={setPriceUnit} placeholder="/ draft" />
            <AdminField label="CTA label" value={cta} onChange={setCta} placeholder="Book Essay Review" />
            <div className="flex flex-col gap-1">
              <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Service['category'])}
                className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
              >
                <option value="writing">Essay &amp; Writing</option>
                <option value="audit">App Review</option>
                <option value="mentorship">1-on-1 Mentorship</option>
                <option value="intl">Financial &amp; Int'l</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">publish</span>
            Publish service
          </button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {services.map((s) => (
          <div
            key={s.id}
            className="flex items-start justify-between gap-3 rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-label-md text-label-md font-bold text-on-surface">
                {s.title}
              </p>
              <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                {s.price} {s.priceUnit} • {s.category}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                deleteService(s.id)
                onChange()
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
              aria-label="Delete"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersAdmin({ users }: { users: { id: string; name: string; email: string; createdAt: string }[] }) {
  return (
    <div className="flex flex-col gap-space-md">
      <SectionHeader icon="group" title={`Students (${users.length})`} />
      <div className="flex flex-col gap-2">
        {users.map((u) => {
          const p = getProfile(u.id)
          return (
            <div
              key={u.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container">
                  <span
                    className="material-symbols-outlined text-[18px] text-on-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    person
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-label-md text-label-md font-bold text-on-surface">
                    {u.name}
                  </p>
                  <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                    {u.email} • GPA {p?.gpa ?? '—'} • {p?.intendedMajor || 'Undecided'}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-secondary-container px-2 py-0.5 font-label-xs text-label-xs font-bold text-on-secondary-container">
                {p?.firstGen ? 'First-gen' : 'Student'}
              </span>
            </div>
          )
        })}
        {users.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-space-md text-center">
            <p className="font-label-md text-label-md font-semibold text-on-surface">
              No students yet
            </p>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              Students will appear here once they sign up.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

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
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full resize-none rounded-xl bg-surface-container-low p-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
        />
      ) : (
        <input
          type={type}
          step={step}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
        />
      )}
    </div>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-3.5 py-2.5 text-left"
    >
      <span className="font-body-sm text-body-sm text-on-surface">{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          value ? 'bg-primary-container' : 'bg-surface-container-highest'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}
