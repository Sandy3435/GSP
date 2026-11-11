/*
 * Rule-based opportunity matching.
 * Given a student profile and an opportunity's eligibility criteria, returns a
 * 0-100 match score. Designed to be swappable for an ML model later.
 */

import type { Profile } from './auth'

export interface OpportunityEligibility {
  minGpa?: number
  majors?: string[]
  firstGenOnly?: boolean
  lowIncomeOnly?: boolean
  urmOnly?: boolean
  interests?: string[]
  states?: string[]
  graduationYears?: number[]
  countries?: string[]
  nationalities?: string[]
  minActivities?: number
  requiresLeadership?: boolean
}

const LEADERSHIP_WORDS = ['lead', 'president', 'captain', 'founder', 'chair', 'director', 'head', 'coordinator']

export function matchScore(
  profile: Profile | null,
  eligibility?: OpportunityEligibility,
): number {
  if (!profile) return 60
  if (!eligibility || Object.keys(eligibility).length === 0) return 78

  let score = 50

  // GPA
  if (eligibility.minGpa != null) {
    if (profile.gpa != null && profile.gpa >= eligibility.minGpa) score += 12
    else if (profile.gpa != null) score -= 6
  } else {
    score += 6
  }

  // Major
  if (eligibility.majors && eligibility.majors.length > 0) {
    if (
      profile.intendedMajor &&
      eligibility.majors.some((m) =>
        profile.intendedMajor.toLowerCase().includes(m.toLowerCase()),
      )
    ) {
      score += 12
    }
  } else {
    score += 4
  }

  // First-gen
  if (eligibility.firstGenOnly) {
    if (profile.firstGen) score += 12
    else score -= 8
  } else {
    score += 3
  }

  // Low-income
  if (eligibility.lowIncomeOnly) {
    if (profile.lowIncome) score += 12
    else score -= 8
  } else {
    score += 3
  }

  // URM
  if (eligibility.urmOnly) {
    if (profile.urm) score += 12
    else score -= 8
  } else {
    score += 3
  }

  // Interests overlap
  if (eligibility.interests && eligibility.interests.length > 0) {
    const overlap = eligibility.interests.filter((i) =>
      profile.interests.map((x) => x.toLowerCase()).includes(i.toLowerCase()),
    ).length
    score += Math.min(8, overlap * 4)
  } else {
    score += 4
  }

  // Location / state
  if (eligibility.states && eligibility.states.length > 0) {
    if (
      profile.location &&
      eligibility.states.some((s) =>
        profile.location.toLowerCase().includes(s.toLowerCase()),
      )
    ) {
      score += 6
    }
  } else {
    score += 3
  }

  // Graduation year
  if (eligibility.graduationYears && eligibility.graduationYears.length > 0) {
    if (
      profile.graduationYear != null &&
      eligibility.graduationYears.includes(profile.graduationYear)
    ) {
      score += 6
    }
  } else {
    score += 3
  }

  // Country of residence / nationality
  if (eligibility.countries && eligibility.countries.length > 0) {
    const country = `${profile.countryOfResidence} ${profile.countryOfOrigin} ${profile.location}`.toLowerCase()
    if (eligibility.countries.some((c) => country.includes(c.toLowerCase()))) score += 6
    else score -= 3
  } else {
    score += 2
  }
  if (eligibility.nationalities && eligibility.nationalities.length > 0) {
    if (eligibility.nationalities.some((n) => profile.nationality.toLowerCase().includes(n.toLowerCase()))) {
      score += 6
    } else {
      score -= 3
    }
  } else {
    score += 2
  }

  // Leadership & extracurricular depth
  const activities = profile.activities ?? []
  if (eligibility.minActivities != null) {
    if (activities.length >= eligibility.minActivities) score += 8
    else score -= 6
  } else {
    score += Math.min(6, activities.length)
  }
  if (eligibility.requiresLeadership) {
    const hasLeadership = activities.some(
      (a) =>
        LEADERSHIP_WORDS.some((w) => a.role.toLowerCase().includes(w)) ||
        LEADERSHIP_WORDS.some((w) => a.title.toLowerCase().includes(w)),
    )
    if (hasLeadership) score += 8
    else score -= 4
  }

  return Math.max(40, Math.min(99, Math.round(score)))
}
