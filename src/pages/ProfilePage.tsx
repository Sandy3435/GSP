import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { matchScore } from '../lib/matching'
import { getOpportunities } from '../lib/store'
import type { Profile } from '../lib/auth'
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

export default function ProfilePage() {
  const { user, profile, updateProfile, updateName } = useAuth()

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
  const [saved, setSaved] = useState(false)

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
  }, [profile])

  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  const toggleInterest = (i: string) => {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    )
  }

  const handleSave = () => {
    const updated: Profile = {
      userId: user.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      bio: bio.trim(),
      gpa: gpa ? Number(gpa) : null,
      sat: sat ? Number(sat) : null,
      act: act ? Number(act) : null,
      intendedMajor,
      graduationYear: graduationYear ? Number(graduationYear) : null,
      firstGen,
      lowIncome,
      urm,
      interests,
      targetSchools: targetSchools
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      location: location.trim(),
      avatarUrl: profile.avatarUrl,
    }
    updateProfile(updated)
    updateName(`${firstName} ${lastName}`.trim() || user.name)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  // Matched opportunities preview
  const matched = getOpportunities()
    .map((opp) => ({
      opp,
      score: matchScore(
        {
          ...profile,
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
          targetSchools: targetSchools
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          location,
          avatarUrl: profile.avatarUrl,
        },
        opp.eligibility as never,
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  const completion = Math.round(
    ([
      firstName,
      lastName,
      gpa,
      intendedMajor,
      location,
      interests.length > 0,
    ].filter(Boolean).length /
      6) *
      100,
  )

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Header */}
      <section className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="flex items-center gap-space-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container">
            <span
              className="material-symbols-outlined text-[32px] text-on-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              person
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary">
              {firstName || user.name}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {user.email}
            </p>
            <span className="mt-1 inline-flex w-max items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 font-label-xs text-label-xs font-bold text-on-secondary-container">
              <span
                className="material-symbols-outlined text-[12px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                school
              </span>
              {user.role === 'admin' ? 'Admin' : 'Student'}
            </span>
          </div>
        </div>

        {/* Completion */}
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

      {/* Academics */}
      <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
        <SectionHeader icon="school" title="Academics" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" value={firstName} onChange={setFirstName} />
          <Field label="Last name" value={lastName} onChange={setLastName} />
          <Field
            label="GPA (0-4.0)"
            value={gpa}
            onChange={setGpa}
            type="number"
            step="0.01"
          />
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
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Location (city, state)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Brooklyn, NY"
            className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell mentors and peers a bit about yourself…"
            className="w-full resize-none rounded-xl bg-surface-container-low p-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
          />
        </div>
      </section>

      {/* Background */}
      <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
        <SectionHeader icon="diversity_3" title="Background" />
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Used only to match you with relevant scholarships and programs.
        </p>
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

      {/* Target schools */}
      <section className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
        <SectionHeader icon="school" title="Target schools" />
        <input
          type="text"
          value={targetSchools}
          onChange={(e) => setTargetSchools(e.target.value)}
          placeholder="Stanford, MIT, Yale (comma separated)"
          className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
        />
      </section>

      {/* Save */}
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
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  step?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
      />
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
        className={`relative h-6 w-11 rounded-full transition-colors ${
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
