import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPublishedOpportunities } from '../lib/store'
import { matchScore } from '../lib/matching'
import {
  getSavedOpportunityIds,
  saveOpportunityForUser,
  unsaveOpportunityForUser,
} from '../lib/platformStore'
import type { Opportunity } from '../data/mockData'
import { MatchBadge } from '../components/ui'

const DEFAULT_DOCS = [
  'High school transcript',
  'Two teacher or counselor recommendations',
  'Personal statement / essay',
  'Proof of income or financial aid documents (if applicable)',
]

export default function OpportunityDetailPage() {
  const { oppId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getPublishedOpportunities().then(setOpps)
  }, [])

  useEffect(() => {
    if (user) setSaved(getSavedOpportunityIds(user.id).includes(oppId ?? ''))
  }, [user, oppId])

  const opp = opps.find((o) => o.id === oppId)

  const score = useMemo(
    () => (opp ? matchScore(profile, opp.eligibility) : 0),
    [opp, profile],
  )

  if (!opp) {
    return (
      <div className="flex flex-col items-center gap-3 py-space-xl text-center">
        <span className="material-symbols-outlined text-[44px] text-outline">search_off</span>
        <p className="text-headline-sm font-bold text-on-surface">Opportunity not found</p>
        <Link
          to="/opportunities"
          className="rounded-lg bg-primary-container px-4 py-2 font-label-md text-label-md font-bold text-on-primary"
        >
          Back to opportunities
        </Link>
      </div>
    )
  }

  const docs = opp.requiredDocuments?.length ? opp.requiredDocuments : DEFAULT_DOCS
  const tips: string[] = []
  if (opp.eligibility?.firstGenOnly || profile?.firstGen) {
    tips.push('As a first-generation student, prioritise the first-gen essay prompt and ask your counselor to confirm fee-waiver eligibility.')
  }
  if (opp.eligibility?.lowIncomeOnly || profile?.lowIncome) {
    tips.push('Gather your family’s most recent tax returns early — income documentation is usually the slowest item to obtain.')
  }
  if (opp.eligibility?.minGpa != null) {
    tips.push(
      profile?.gpa != null && profile.gpa >= opp.eligibility.minGpa
        ? `Your GPA (${profile.gpa}) clears the ${opp.eligibility.minGpa} minimum. Keep an unofficial transcript handy.`
        : `This programme asks for a ${opp.eligibility.minGpa} GPA. Speak with your counselor about contextual review options.`,
    )
  }
  if (opp.eligibility?.requiresLeadership) {
    tips.push('Select 2–3 activities where you held a named leadership role; quantify your impact in the activity description.')
  }
  if (opp.eligibility?.nationalities?.length && profile?.nationality) {
    tips.push(`Your nationality (${profile.nationality}) is relevant to this opportunity’s eligibility — verify the official rules before applying.`)
  }
  if (tips.length === 0) {
    tips.push('Complete the academic and activities sections of your profile so GSP can personalise document guidance.')
  }

  const toggleSave = () => {
    if (!user) return
    if (saved) {
      unsaveOpportunityForUser(user.id, opp.id)
      setSaved(false)
    } else {
      saveOpportunityForUser(user.id, opp.id)
      setSaved(true)
    }
  }

  return (
    <div className="flex flex-col gap-space-lg pb-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant"
          aria-label="Back"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <button
          type="button"
          onClick={toggleSave}
          className={`flex h-9 items-center gap-1.5 rounded-lg px-3 font-label-sm text-label-sm font-bold ${
            saved
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
          >
            {saved ? 'bookmark' : 'bookmark_border'}
          </span>
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <MatchBadge score={score} />
          <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-xs text-label-xs font-semibold text-on-surface-variant">
            {opp.category ?? 'Scholarship'}
          </span>
          {opp.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-container-low px-2 py-0.5 font-label-xs text-label-xs text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-headline-lg-mobile font-bold leading-tight text-primary">
          {opp.title}
        </h1>
        <div className="flex items-center gap-2 text-secondary">
          <span className="material-symbols-outlined text-[18px]">{opp.awardIcon}</span>
          <span className="font-label-md text-label-md font-bold">{opp.award}</span>
        </div>
        <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
          {opp.summary}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-container-low p-3">
            <p className="font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant">Deadline</p>
            <p className="mt-0.5 font-label-md text-label-md font-bold text-tertiary">{opp.deadline}</p>
            <p className="font-label-xs text-label-xs text-on-surface-variant">{opp.daysLeft} days left</p>
          </div>
          <div className="rounded-xl bg-surface-container-low p-3">
            <p className="font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant">Your match</p>
            <p className="mt-0.5 font-label-md text-label-md font-bold text-primary">{score}%</p>
            <p className="font-label-xs text-label-xs text-on-surface-variant">
              Based on your profile
            </p>
          </div>
        </div>
        {opp.applicationLink && (
          <a
            href={opp.applicationLink}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary shadow-sm"
          >
            Open official application
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </a>
        )}
      </section>

      <Section title="Eligibility requirements" icon="rule">
        <ul className="flex flex-col gap-2">
          <Requirement text={opp.eligibility?.minGpa ? `Minimum GPA: ${opp.eligibility.minGpa}` : 'Open GPA requirement'} />
          {opp.eligibility?.majors?.length ? (
            <Requirement text={`Intended majors: ${opp.eligibility.majors.join(', ')}`} />
          ) : null}
          {opp.eligibility?.firstGenOnly && <Requirement text="First-generation college student" />}
          {opp.eligibility?.lowIncomeOnly && <Requirement text="Low-income / Pell-eligible" />}
          {opp.eligibility?.urmOnly && <Requirement text="Underrepresented minority" />}
          {opp.eligibility?.countries?.length ? (
            <Requirement text={`Country eligibility: ${opp.eligibility.countries.join(', ')}`} />
          ) : null}
          {opp.eligibility?.nationalities?.length ? (
            <Requirement text={`Nationality eligibility: ${opp.eligibility.nationalities.join(', ')}`} />
          ) : null}
          {opp.eligibility?.minActivities ? (
            <Requirement text={`At least ${opp.eligibility.minActivities} extracurricular activities`} />
          ) : null}
          {opp.eligibility?.requiresLeadership && <Requirement text="Demonstrated leadership experience" />}
        </ul>
      </Section>

      <Section title="Required documents" icon="description">
        <ul className="flex flex-col gap-2">
          {docs.map((doc) => (
            <Requirement key={doc} text={doc} />
          ))}
        </ul>
      </Section>

      <Section title="Personalised guidance" icon="tips_and_updates">
        <ul className="flex flex-col gap-2">
          {tips.map((tip) => (
            <li
              key={tip}
              className="flex items-start gap-2 rounded-xl bg-secondary-container/30 p-3 font-body-sm text-body-sm text-on-surface"
            >
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-secondary">lightbulb</span>
              {tip}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Application instructions" icon="checklist">
        <p className="whitespace-pre-line font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
          {opp.instructions ||
            'Create an account on the official application portal, complete each section, upload the required documents, and submit before the deadline. Keep a copy of your submission confirmation.'}
        </p>
      </Section>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-secondary">{icon}</span>
        <h2 className="text-headline-sm font-semibold text-primary">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Requirement({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface">
      <span className="material-symbols-outlined mt-0.5 text-[17px] text-secondary">check_circle</span>
      {text}
    </li>
  )
}
