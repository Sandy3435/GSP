/*
 * Data store for opportunities, courses, services.
 * Uses Supabase when configured, otherwise falls back to localStorage + seed data.
 */

import { isSupabaseConfigured, supabase } from './supabase'
import { courses as seedCourses, opportunities as seedOpportunities, services as seedServices } from '../data/mockData'
import type { Course, Opportunity, Service } from '../data/mockData'

// ---------- localStorage fallback helpers ----------
const OPPS_KEY = 'gsp_opps'
const COURSES_KEY = 'gsp_courses'
const SERVICES_KEY = 'gsp_services'

function readLocal<T extends { id: string }>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return [...seed]
    const parsed = JSON.parse(raw) as T[]
    const storedIds = new Set(parsed.map((x) => x.id))
    const merged = [...parsed]
    for (const s of seed) {
      if (!storedIds.has(s.id)) merged.push(s)
    }
    return merged
  } catch {
    return [...seed]
  }
}
function writeLocal<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ---------- Opportunities ----------
export async function getOpportunities(): Promise<Opportunity[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('opportunities').select('*').order('created_at', { ascending: false })
    if (error || !data) return seedOpportunities
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      title: r.title as string,
      match: (r.match as number) ?? 80,
      tags: (r.tags as string[]) ?? [],
      award: (r.award as string) ?? '',
      awardIcon: (r.award_icon as string) ?? 'workspace_premium',
      summary: (r.summary as string) ?? '',
      deadline: (r.deadline as string) ?? '',
      daysLeft: (r.days_left as number) ?? 30,
      fullRide: (r.full_ride as boolean) ?? false,
      flyIn: (r.fly_in as boolean) ?? false,
      noEssay: (r.no_essay as boolean) ?? false,
      eligibility: (r.eligibility as Opportunity['eligibility']) ?? {},
    }))
  }
  return readLocal(OPPS_KEY, seedOpportunities)
}

export async function saveOpportunity(opp: Opportunity & { eligibility?: Opportunity['eligibility'] }): Promise<void> {
  if (isSupabaseConfigured) {
    const { data: u } = await supabase.auth.getUser()
    await supabase.from('opportunities').upsert({
      id: opp.id.startsWith('opp_') ? undefined : opp.id,
      title: opp.title,
      match: opp.match,
      tags: opp.tags,
      award: opp.award,
      award_icon: opp.awardIcon,
      summary: opp.summary,
      deadline: opp.deadline,
      days_left: opp.daysLeft,
      full_ride: opp.fullRide ?? false,
      fly_in: opp.flyIn ?? false,
      no_essay: opp.noEssay ?? false,
      eligibility: opp.eligibility ?? {},
      created_by: u.user?.id ?? null,
    })
    return
  }
  const list = readLocal(OPPS_KEY, seedOpportunities)
  const idx = list.findIndex((o) => o.id === opp.id)
  if (idx >= 0) list[idx] = opp
  else list.unshift(opp)
  writeLocal(OPPS_KEY, list)
}

export async function deleteOpportunity(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.from('opportunities').delete().eq('id', id)
    return
  }
  writeLocal(OPPS_KEY, readLocal(OPPS_KEY, seedOpportunities).filter((o) => o.id !== id))
}

// ---------- Courses ----------
export async function getCourses(): Promise<Course[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
    if (error || !data) return seedCourses
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      title: r.title as string,
      description: (r.description as string) ?? '',
      category: (r.category as Course['category']) ?? 'foundations',
      modules: (r.modules as number) ?? 4,
      price: r.price != null ? String(r.price) : undefined,
      free: (r.free as boolean) ?? true,
      topics: (r.topics as string[]) ?? [],
      stats: (r.stats as Course['stats']) ?? [],
      cta: (r.cta as string) ?? 'View Syllabus',
      ctaIcon: (r.cta_icon as string) ?? 'arrow_forward',
      gradient: (r.gradient as string) ?? 'from-primary-container via-primary to-secondary-fixed',
      icon: (r.icon as string) ?? 'auto_stories',
    }))
  }
  return readLocal(COURSES_KEY, seedCourses)
}

export async function saveCourse(course: Course): Promise<void> {
  if (isSupabaseConfigured) {
    const { data: u } = await supabase.auth.getUser()
    await supabase.from('courses').upsert({
      id: course.id.startsWith('course_') ? undefined : course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      modules: course.modules,
      price: course.price ? Number(course.price) : null,
      free: course.free ?? true,
      topics: course.topics,
      stats: course.stats,
      cta: course.cta,
      cta_icon: course.ctaIcon,
      gradient: course.gradient,
      icon: course.icon,
      created_by: u.user?.id ?? null,
    })
    return
  }
  const list = readLocal(COURSES_KEY, seedCourses)
  const idx = list.findIndex((c) => c.id === course.id)
  if (idx >= 0) list[idx] = course
  else list.unshift(course)
  writeLocal(COURSES_KEY, list)
}

export async function deleteCourse(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.from('courses').delete().eq('id', id)
    return
  }
  writeLocal(COURSES_KEY, readLocal(COURSES_KEY, seedCourses).filter((c) => c.id !== id))
}

// ---------- Services ----------
export async function getServices(): Promise<Service[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: false })
    if (error || !data) return seedServices
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      title: r.title as string,
      description: (r.description as string) ?? '',
      category: (r.category as Service['category']) ?? 'writing',
      price: (r.price as string) ?? '',
      priceUnit: (r.price_unit as string) ?? '',
      badge: (r.badge as string) ?? undefined,
      badgeIcon: (r.badge_icon as string) ?? undefined,
      badgeTone: (r.badge_tone as Service['badgeTone']) ?? 'neutral',
      features: (r.features as Service['features']) ?? [],
      cta: (r.cta as string) ?? 'Book now',
      ctaTone: (r.cta_tone as Service['ctaTone']) ?? 'primary',
    }))
  }
  return readLocal(SERVICES_KEY, seedServices)
}

export async function saveService(service: Service): Promise<void> {
  if (isSupabaseConfigured) {
    const { data: u } = await supabase.auth.getUser()
    await supabase.from('services').upsert({
      id: service.id.startsWith('svc_') ? undefined : service.id,
      title: service.title,
      description: service.description,
      category: service.category,
      price: service.price,
      price_unit: service.priceUnit,
      badge: service.badge,
      badge_icon: service.badgeIcon,
      badge_tone: service.badgeTone,
      features: service.features ?? [],
      cta: service.cta,
      cta_tone: service.ctaTone,
      created_by: u.user?.id ?? null,
    })
    return
  }
  const list = readLocal(SERVICES_KEY, seedServices)
  const idx = list.findIndex((s) => s.id === service.id)
  if (idx >= 0) list[idx] = service
  else list.unshift(service)
  writeLocal(SERVICES_KEY, list)
}

export async function deleteService(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.from('services').delete().eq('id', id)
    return
  }
  writeLocal(SERVICES_KEY, readLocal(SERVICES_KEY, seedServices).filter((s) => s.id !== id))
}

export function resetStore(): void {
  localStorage.removeItem(OPPS_KEY)
  localStorage.removeItem(COURSES_KEY)
  localStorage.removeItem(SERVICES_KEY)
}
