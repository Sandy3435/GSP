import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { matchScore } from '../lib/matching'
import { getPublishedOpportunities } from '../lib/store'
import type { AcademicInstitution, Activity, Profile } from '../lib/auth'
import type { Opportunity } from '../data/mockData'
import { MatchBadge, SectionHeader } from '../components/ui'

const MAJORS = [
  'Undecided',
  'Computer Science',
  'Engineering',
  'Biology / Pre-Med',
  'Business / Economics',
  'Humanities / English',
  'Social Sciences / Psychology',
  'Arts / Design',
  'Mathematics / Physics',
  'Other',
]

const INTERESTS = [
  'STEM Research',
  'Writing & Journalism',
  'Community Service',
  'Entrepreneurship',
  'Arts & Music',
  'Athletics',
  'Debate & Public Speaking',
  'Leadership',
  'Environmental Science',
  'Social Justice',
]

const EDUCATION_LEVELS = ['High school', 'Gap year', 'Undergraduate', 'Transfer student']

const BIO_EXAMPLE =
  'Example: I am a first-generation student from Brooklyn, NY who fell in love with public health while volunteering at a community clinic. I want to study Biology and eventually work on health equity policy. Outside class I captain the debate team and run a peer tutoring programme.'

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function emptySchool(type: AcademicInstitution['type'] = 'high_school'): AcademicInstitution {
  return {
    id: newId('school'),
    name: '',
    type,
    country: '',
    startYear: '',
    endYear: '',
    gpa: '',
    gpaScale: '4.0',
    status: 'In progress',
  }
}

function emptyActivity(): Activity {
  return {
    id: newId('activity'),
    title: '',
    organization: '',
    role: '',
    description: '',
    hoursPerWeek: '',
    weeksPerYear: '',
    gradeLevels: '',
  }
}

export default function ProfilePage() {
  const { user, profile, updateProfile, refreshProfile } = useAuth()

  const [firstName, setFirstName] = useState(profile?.firstName ?? '')
  const [lastName, setLastName] = useState(profile?.lastName ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [gpa, setGpa] = useState(profile?.gpa?.toString() ?? '')
  const [sat, setSat] = useState(profile?.sat?.toString() ?? '')
  const [act, setAct] = useState(profile?.act?.toString() ?? '')
  const [intendedMajor, setIntendedMajor] = useState(profile?.intendedMajor ?? '')
  const [graduationYear, setGraduationYear] = useState(profile?.graduationYear?.toString() ?? '')
  const [firstGen, setFirstGen] = useState(profile?.firstGen ?? false)
  const [lowIncome, setLowIncome] = useState(profile?.lowIncome ?? false)
  const [urm, setUrm] = useState(profile?.urm ?? false)
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? [])
  const [targetSchools, setTargetSchools] = useState(profile?.targetSchools?.join(', ') ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [schools, setSchools] = useState<AcademicInstitution[]>(profile?.schools ?? [])
  const [activities, setActivities] = useState<Activity[]>(profile?.activities ?? [])
  const [countryOfOrigin, setCountryOfOrigin] = useState(profile?.countryOfOrigin ?? '')
  const [countryOfResidence, setCountryOfResidence] = useState(profile?.countryOfResidence ?? '')
  const [nationality, setNationality] = useState(profile?.nationality ?? '')
  const [educationLevel, setEducationLevel] = useState(profile?.educationLevel ?? 'High school')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [adminCode, setAdminCode] = useState('')
  const [adminMsg, setAdminMsg] = useState('')
  const [reportMsg, setReportMsg] = useState('')

  useEffect(() => {
    if (!profile) return
    setFirstName(profile.firstName)
    setLastName(profile.lastName)
    setBio(profile.bio)
    setGpa(profile.gpa?.toString() ?? '')
    setSat(profile.sat?.toString() ?? '')
    setAct(profile.act?.toString() ?? '')
    setIntendedMajor(profile.intendedMajor)
    setGraduationYear(profile.graduationYear?.toString() ?? '')
    setFirstGen(profile.firstGen)
    setLowIncome(profile.lowIncome)
    setUrm(profile.urm)
    setInterests(profile.interests)
    setTargetSchools(profile.targetSchools.join(', '))
    setLocation(profile.location)
    setSchools(profile.schools ?? [])
    setActivities(profile.activities ?? [])
    setCountryOfOrigin(profile.countryOfOrigin ?? '')
    setCountryOfResidence(profile.countryOfResidence ?? '')
    setNationality(profile.nationality ?? '')
    setEducationLevel(profile.educationLevel ?? 'High school')
  }, [profile])

  useEffect(() => {
    getPublishedOpportunities().then(setOpps)
  }, [])

  const draftProfile: Profile | null = useMemo(() => {
    if (!profile || !user) return null
    return {
      ...profile,
      userId: user.id,
      firstName,
      lastName,
      bio,
      gpa: gpa ? Number(gpa) : null,
      sat: sat ? Number(sat) : null,
      act: act ? Number(act) : null,
      intendedMajor,
      graduationYear: graduationYear ? Number(graduationYear) : null,
      firstGen,
      lowIncome,
      urm,
      interests,
      targetSchools: targetSchools.split(',').map((s) => s.trim()).filter(Boolean),
      location,
      schools,
      activities,
      countryOfOrigin,
      countryOfResidence,
      nationality,
      educationLevel,
    }
  }, [
    profile, user, firstName, lastName, bio, gpa, sat, act, intendedMajor,
    graduationYear, firstGen, lowIncome, urm, interests, targetSchools, location,
    schools, activities, countryOfOrigin, countryOfResidence, nationality, educationLevel,
  ])

  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  const toggleInterest = (i: string) => {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    )
  }

  const updateSchool = (id: string, patch: Partial<AcademicInstitution>) => {
    setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  const updateActivity = (id: string, patch: Partial<Activity>) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const text = await file.text()
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (rows.length === 0) {
      setReportMsg('That file is empty.')
      return
    }

    const isCsv = file.name.toLowerCase().endsWith('.csv')
    const body = isCsv ? rows.slice(1) : rows
    const parsed: Activity[] = body.map((line) => {
      const cells = isCsv
        ? line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
        : [line]
      return {
        id: newId('activity'),
        title: cells[0] ?? '',
        organization: cells[1] ?? '',
        role: cells[2] ?? '',
        description: cells[3] ?? '',
        hoursPerWeek: cells[4] ?? '',
        weeksPerYear: cells[5] ?? '',
        gradeLevels: cells[6] ?? '',
      }
    })

    const available = Math.max(0, 15 - activities.length)
    const accepted = parsed.filter((a) => a.title).slice(0, available)
    if (accepted.length === 0) {
      setReportMsg('No importable activities found. Check the CSV columns and the 15-activity limit.')
      return
    }
    setActivities((prev) => [...prev, ...accepted])
    setReportMsg(`Imported ${accepted.length} ${accepted.length === 1 ? 'activity' : 'activities'}. Remember to save your profile.`)
  }

  const handleSave = () => {
    setSaveError('')
    if (!bio.trim()) {
      setSaveError('A short bio is required. Use the example above if you need a starting point.')
      return
    }
    if (!draftProfile) return
    updateProfile(draftProfile)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const handleRedeemAdmin = async () => {
    setAdminMsg('')
    const code = adminCode.trim().toUpperCase()
    const role: 'admin' | 'mentor' | null =
      code === 'GSP-ADMIN-2026' ? 'admin' : code === 'GSP-MENTOR-2026' ? 'mentor' : null
    if (!role) {
      setAdminMsg('Invalid access code.')
      return
    }

    // 1. Preferred: security-definer function (works even while still a student).
    const rpc = await supabase.rpc('redeem_access_code', { code })
    if (!rpc.error) {
      if (!rpc.data?.ok) {
        setAdminMsg(rpc.data?.error ?? 'Invalid access code.')
        return
      }
    } else {
      // 2. Legacy admin-only function.
      const legacy = await supabase.rpc('redeem_admin_code', { code })
      if (legacy.error) {
        // 3. Fallback: update own profile (allowed by the "profiles update own" policy).
        const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id)
        if (error) {
          const message =
            role === 'mentor' && /check constraint|profiles_role_check/i.test(error.message)
              ? 'Mentor accounts need the Version 1 database migration. Run supabase/v1_schema.sql in Supabase, then try again.'
              : error.message
          setAdminMsg('Failed: ' + message)
          return
        }
      } else if (!legacy.data?.ok) {
        setAdminMsg(legacy.data?.error ?? 'Invalid access code.')
        return
      }
    }

    setAdminMsg(`${role === 'admin' ? 'Admin' : 'Mentor'} access granted! Reloading…`)
    await refreshProfile()
    window.setTimeout(() => window.location.reload(), 700)
  }

  const matched = draftProfile
    ? opps
        .map((opp) => ({ opp, score: matchScore(draftProfile, opp.eligibility) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
    : []

  const completionFields = [
    firstName,
    lastName,
    bio,
    gpa,
    intendedMajor,
    location,
    countryOfResidence,
    interests.length > 0,
    schools.length > 0,
    activities.length > 0,
  ]
  const completion = Math.round(
    (completionFields.filter(Boolean).length / completionFields.length) * 100,
  )

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-space-lg pb-6">
      {/* Header */}
      <section className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="flex items-center gap-space-md">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-container">
            <span
              className="material-symbols-outlined text-[32px] text-on-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              person
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="truncate text-headline-lg-mobile font-bold tracking-tight text-primary md:text-headline-lg">
              {firstName || user.name}
            </h1>
            <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
              {user.email}
            </p>
            <span className="mt-1 inline-flex w-max items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 font-label-xs text-label-xs font-bold text-on-secondary-container">
              <span
                className="material-symbols-outlined text-[12px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                school
              </span>
              {user.role === 'admin' ? 'Admin' : user.role === 'mentor' ? 'Mentor' : 'Student'}
            </span>
          </div>
        </div>
      </section>

      {/* Access code redemption */}
      {user.role === 'student' && (
        <section className="flex flex-col gap-2 rounded-2xl bg-surface-container-low p-space-md shadow-sm">
          <p className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Redeem access code
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              placeholder="Admin or mentor code"
              className="h-10 flex-1 rounded-lg bg-surface-container-lowest px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
            />
            <button
              type="button"
              onClick={handleRedeemAdmin}
              className="flex h-10 items-center gap-1.5 rounded-lg bg-primary-container px-3 font-label-sm text-label-sm font-bold text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Redeem
            </button>
          </div>
          {adminMsg && (
            <p className={`font-label-xs text-label-xs ${adminMsg.includes('granted') ? 'text-secondary' : 'text-error'}`}>
              {adminMsg}
            </p>
          )}
        </section>
      )}

      {/* Completion */}
      <section className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center justify-between font-label-xs text-label-xs">
            <span className="font-semibold text-on-surface">Profile completion</span>
            <span className="font-bold text-primary">{completion}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-container to-secondary transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="font-label-xs text-label-xs text-on-surface-variant">
            Complete your profile to unlock better opportunity matches.
          </p>
        </div>
      </section>

      {/* Basic information */}
      <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
        <SectionHeader icon="person" title="Basic information" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" value={firstName} onChange={setFirstName} />
          <Field label="Last name" value={lastName} onChange={setLastName} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Current educational status
          </label>
          <select
            value={educationLevel}
            onChange={(e) => setEducationLevel(e.target.value)}
            className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
          >
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Personal bio <span className="text-error">*</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder={BIO_EXAMPLE}
            className="w-full resize-none rounded-xl bg-surface-container-low p-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
          />
          <p className="font-label-xs text-label-xs text-on-surface-variant">
            Required. Write 2–4 sentences about your academic background, interests, and aspirations.
          </p>
        </div>
      </section>

      {/* Academic institutions */}
      <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="flex items-center justify-between">
          <SectionHeader icon="school" title={`Academic institutions (${schools.length}/4)`} />
          {schools.length < 4 && (
            <button
              type="button"
              onClick={() => setSchools((prev) => [...prev, emptySchool(prev.length === 0 ? 'high_school' : 'college')])}
              className="flex h-8 items-center gap-1 rounded-lg bg-primary-container px-2.5 font-label-xs text-label-xs font-bold text-on-primary"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              Add school
            </button>
          )}
        </div>
        {schools.length === 0 && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Add your high school and any colleges or dual-enrollment institutions (up to 4).
          </p>
        )}
        {schools.map((school, index) => (
          <div key={school.id} className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-space-md">
            <div className="flex items-center justify-between">
              <span className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Institution {index + 1}
              </span>
              <button
                type="button"
                onClick={() => setSchools((prev) => prev.filter((s) => s.id !== school.id))}
                className="text-error"
                aria-label="Remove institution"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="School name" value={school.name} onChange={(v) => updateSchool(school.id, { name: v })} />
              <SelectField
                label="Type"
                value={school.type}
                onChange={(v) => updateSchool(school.id, { type: v as AcademicInstitution['type'] })}
                options={[
                  { value: 'high_school', label: 'High school' },
                  { value: 'college', label: 'College / university' },
                ]}
              />
              <Field label="Country" value={school.country} onChange={(v) => updateSchool(school.id, { country: v })} />
              <Field label="Status" value={school.status} onChange={(v) => updateSchool(school.id, { status: v })} />
              <Field label="Start year" value={school.startYear} onChange={(v) => updateSchool(school.id, { startYear: v })} type="number" />
              <Field label="End year" value={school.endYear} onChange={(v) => updateSchool(school.id, { endYear: v })} type="number" />
              <Field label="GPA" value={school.gpa} onChange={(v) => updateSchool(school.id, { gpa: v })} />
              <Field label="GPA scale" value={school.gpaScale} onChange={(v) => updateSchool(school.id, { gpaScale: v })} />
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Overall GPA (0-4.0)" value={gpa} onChange={setGpa} type="number" step="0.01" />
          <Field label="Graduation year" value={graduationYear} onChange={setGraduationYear} type="number" />
          <Field label="SAT (optional)" value={sat} onChange={setSat} type="number" />
          <Field label="ACT (optional)" value={act} onChange={setAct} type="number" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Intended major
          </label>
          <select
            value={intendedMajor}
            onChange={(e) => setIntendedMajor(e.target.value)}
            className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
          >
            <option value="">Select a major</option>
            {MAJORS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <Field label="City, state / location" value={location} onChange={setLocation} placeholder="Brooklyn, NY" />
        <Field label="Target schools (comma separated)" value={targetSchools} onChange={setTargetSchools} placeholder="Stanford, MIT, Yale" />
      </section>

      {/* Activities */}
      <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="flex items-center justify-between">
          <SectionHeader icon="emoji_events" title={`Leadership & activities (${activities.length}/15)`} />
          {activities.length < 15 && (
            <button
              type="button"
              onClick={() => setActivities((prev) => [...prev, emptyActivity()])}
              className="flex h-8 items-center gap-1 rounded-lg bg-primary-container px-2.5 font-label-xs text-label-xs font-bold text-on-primary"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              Add activity
            </button>
          )}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Add up to 15 activities. Leadership roles are weighted more heavily in opportunity matching.
        </p>
        <div className="flex flex-col gap-1.5 rounded-xl bg-surface-container-low p-3">
          <label className="flex w-max cursor-pointer items-center gap-1.5 rounded-lg bg-surface-container-lowest px-2.5 py-1.5 font-label-xs text-label-xs font-bold text-primary shadow-sm">
            <span className="material-symbols-outlined text-[15px]">upload_file</span>
            Upload activities report
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleReportUpload}
            />
          </label>
          <p className="font-label-xs text-label-xs text-on-surface-variant">
            CSV columns: Title, Organisation, Role, Description, Hours/week, Weeks/year, Grades.
            A .txt file with one activity per line also works. Entries are merged up to the 15 limit.
          </p>
          {reportMsg && (
            <p className={`font-label-xs text-label-xs ${reportMsg.startsWith('Imported') ? 'text-secondary' : 'text-error'}`}>
              {reportMsg}
            </p>
          )}
        </div>
        {activities.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-space-md text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No activities added yet. Add clubs, jobs, research, volunteering, or family responsibilities.
            </p>
          </div>
        )}
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-space-md">
            <div className="flex items-center justify-between">
              <span className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Activity {index + 1}
              </span>
              <button
                type="button"
                onClick={() => setActivities((prev) => prev.filter((a) => a.id !== activity.id))}
                className="text-error"
                aria-label="Remove activity"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Title" value={activity.title} onChange={(v) => updateActivity(activity.id, { title: v })} />
              <Field label="Organisation" value={activity.organization} onChange={(v) => updateActivity(activity.id, { organization: v })} />
              <Field label="Role / position" value={activity.role} onChange={(v) => updateActivity(activity.id, { role: v })} placeholder="President" />
              <Field label="Grade levels" value={activity.gradeLevels} onChange={(v) => updateActivity(activity.id, { gradeLevels: v })} placeholder="9, 10, 11, 12" />
              <Field label="Hours / week" value={activity.hoursPerWeek} onChange={(v) => updateActivity(activity.id, { hoursPerWeek: v })} type="number" />
              <Field label="Weeks / year" value={activity.weeksPerYear} onChange={(v) => updateActivity(activity.id, { weeksPerYear: v })} type="number" />
            </div>
            <Field label="Description" value={activity.description} onChange={(v) => updateActivity(activity.id, { description: v })} textarea />
          </div>
        ))}
      </section>

      {/* Background */}
      <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
        <SectionHeader icon="public" title="Personal background" />
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Used only to match you with relevant scholarships and programmes.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country of origin" value={countryOfOrigin} onChange={setCountryOfOrigin} placeholder="Nigeria" />
          <Field label="Country of residence" value={countryOfResidence} onChange={setCountryOfResidence} placeholder="United States" />
          <Field label="Nationality" value={nationality} onChange={setNationality} placeholder="Nigerian" />
        </div>
        <Toggle label="First-generation college student" value={firstGen} onChange={setFirstGen} />
        <Toggle label="Low-income / Pell-eligible" value={lowIncome} onChange={setLowIncome} />
        <Toggle label="Underrepresented minority (URM)" value={urm} onChange={setUrm} />
      </section>

      {/* Interests */}
      <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
        <SectionHeader icon="interests" title="Interests" />
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleInterest(i)}
              className={`rounded-full px-3 py-1.5 font-label-xs text-label-xs font-bold transition-all ${
                interests.includes(i)
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </section>

      {/* Save */}
      {saveError && (
        <div className="rounded-lg bg-error-container px-3 py-2 font-label-sm text-label-sm text-on-error-container">
          {saveError}
        </div>
      )}
      <button
        type="button"
        onClick={handleSave}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-[18px]">save</span>
        <span>{saved ? 'Saved!' : 'Save profile'}</span>
      </button>

      {/* Matched opportunities */}
      <section className="flex flex-col gap-space-md">
        <SectionHeader icon="auto_awesome" title="Your top matches" />
        <div className="flex flex-col gap-3">
          {matched.map(({ opp, score }) => (
            <div
              key={opp.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-label-md text-label-md font-bold text-on-surface">
                  {opp.title}
                </p>
                <p className="truncate font-label-xs text-label-xs text-on-surface-variant">
                  {opp.award}
                </p>
              </div>
              <MatchBadge score={score} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  step,
  placeholder,
  textarea = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  step?: string
  placeholder?: string
  textarea?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className="w-full resize-none rounded-xl bg-surface-container-lowest p-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
        />
      ) : (
        <input
          type={type}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl bg-surface-container-lowest px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
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
      <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl bg-surface-container-lowest px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
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
      className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-3.5 py-3 text-left"
    >
      <span className="font-body-sm text-body-sm text-on-surface">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          value ? 'bg-primary-container' : 'bg-surface-container-highest'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}
