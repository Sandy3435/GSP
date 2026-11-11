/*
 * Content store for opportunities, courses, and services.
 *
 * Supabase is the source of truth when configured. Seed content is merged in
 * so a fresh project still has something to show; records deleted through the
 * admin dashboard are remembered locally and never reappear.
 */

import { isSupabaseConfigured, supabase } from './supabase'
import {
  courses as seedCourses,
  opportunities as seedOpportunities,
  services as seedServices,
} from '../data/mockData'
import type { Course, Opportunity, Service } from '../data/mockData'

const OPPS_KEY = 'gsp_opps'
const COURSES_KEY = 'gsp_courses'
const SERVICES_KEY = 'gsp_services'
const HIDDEN_KEY = 'gsp_hidden_content'
const ID_MAP_KEY = 'gsp_id_map'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function deleteIdFor(kind: string, id: string): string {
  if (UUID_RE.test(id)) return id
  return readIdMap()[`${kind}:${id}`] ?? ''
}

/*
 * Seed content has readable ids (e.g. "questbridge"). Postgres needs UUIDs, so
 * the first edit of a seed item claims a stable UUID which is reused on every
 * later save. The merge step uses the same map to avoid re-adding the seed.
 */
function readIdMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ID_MAP_KEY) ?? '{}')
  } catch {
    return {}
  }
}
function writeIdMap(map: Record<string, string>): void {
  localStorage.setItem(ID_MAP_KEY, JSON.stringify(map))
}
function dbIdFor(kind: string, id: string): string {
  if (UUID_RE.test(id)) return id
  const map = readIdMap()
  const key = `${kind}:${id}`
  if (!map[key]) {
    map[key] =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    writeIdMap(map)
  }
  return map[key]
}

function readLocal<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? (JSON.parse(raw) as T[]) : []
    return parsed.length ? parsed : [...seed]
  } catch {
    return [...seed]
  }
}
function writeLocal<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function hiddenIds(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '{}')
  } catch {
    return {}
  }
}
function hide(kind: string, id: string): void {
  const map = hiddenIds()
  map[kind] = [...(map[kind] ?? []), id]
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(map))
}
function isHidden(kind: string, id: string): boolean {
  return (hiddenIds()[kind] ?? []).includes(id)
}
function mergeSeeds<T extends { id: string }>(kind: string, rows: T[], seeds: T[]): T[] {
  const ids = new Set(rows.map((r) => r.id))
  const map = readIdMap()
  return [
    ...rows,
    ...seeds.filter(
      (s) =>
        !ids.has(s.id) &&
        !isHidden(kind, s.id) &&
        !(map[`${kind}:${s.id}`] && ids.has(map[`${kind}:${s.id}`])),
    ),
  ]
}

/*
 * Local records win over the server copy. This keeps extended fields (documents,
 * lesson lists, mentor assignments...) visible even when a database has not yet
 * been migrated with supabase/v1_schema.sql.
 */
function overlay<T extends { id: string }>(rows: T[], local: T[]): T[] {
  const byId = new Map(local.map((r) => [r.id, r]))
  return rows.map((r) => (byId.has(r.id) ? { ...r, ...byId.get(r.id) } : r))
}

type Row = Record<string, unknown>

async function upsertRow(table: string, full: Row, core: Row): Promise<void> {
  const first = await supabase.from(table).upsert(full)
  if (!first.error) return
  if (/column|schema cache|does not exist/i.test(first.error.message)) {
    const retry = await supabase.from(table).upsert(core)
    if (retry.error) console.error(`${table} upsert:`, retry.error.message)
    else console.warn(`${table}: extended columns missing — run supabase/v1_schema.sql`)
    return
  }
  console.error(`${table} upsert:`, first.error.message)
}

function writeLocalRow<T extends { id: string }>(key: string, row: T): void {
  const list = readLocal<T>(key, [])
  const idx = list.findIndex((r) => r.id === row.id)
  if (idx >= 0) list[idx] = row
  else list.unshift(row)
  writeLocal(key, list)
}

// ---------- Opportunities ----------
function mapOpportunity(r: Record<string, unknown>): Opportunity {
  return {
    id: r.id as string,
    title: (r.title as string) ?? '',
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
    category: (r.category as string) ?? 'Scholarship',
    requiredDocuments: (r.required_documents as string[]) ?? [],
    instructions: (r.instructions as string) ?? '',
    applicationLink: (r.application_link as string) ?? '',
    published: (r.published as boolean) ?? true,
    eligibility: (r.eligibility as Opportunity['eligibility']) ?? {},
  }
}

export async function getOpportunities(): Promise<Opportunity[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false })
    const local = readLocal<Opportunity>(OPPS_KEY, [])
    if (error || !data) return readLocal(OPPS_KEY, seedOpportunities)
    return mergeSeeds(
      'opps',
      overlay(
        data.map((r) => mapOpportunity(r as Record<string, unknown>)),
        local,
      ),
      [...local, ...seedOpportunities],
    )
  }
  return mergeSeeds('opps', readLocal(OPPS_KEY, []), seedOpportunities)
}

export async function getPublishedOpportunities(): Promise<Opportunity[]> {
  return (await getOpportunities()).filter((o) => o.published !== false)
}

export async function saveOpportunity(opp: Opportunity): Promise<void> {
  if (isSupabaseConfigured) {
    const { data: u } = await supabase.auth.getUser()
    const dbId = dbIdFor('opps', opp.id)
    const createdBy = u.user?.id ?? null
    const core = {
      id: dbId,
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
      created_by: createdBy,
    }
    await upsertRow(
      'opportunities',
      {
        ...core,
        category: opp.category ?? 'Scholarship',
        required_documents: opp.requiredDocuments ?? [],
        instructions: opp.instructions ?? '',
        application_link: opp.applicationLink ?? '',
        published: opp.published ?? true,
      },
      core,
    )
    writeLocalRow(OPPS_KEY, { ...opp, id: dbId })
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
    const dbId = deleteIdFor('opps', id)
    if (dbId) await supabase.from('opportunities').delete().eq('id', dbId)
  }
  hide('opps', id)
  const dbId = deleteIdFor('opps', id)
  writeLocal(
    OPPS_KEY,
    readLocal(OPPS_KEY, seedOpportunities).filter((o) => o.id !== id && o.id !== dbId),
  )
}

// ---------- Courses ----------
function mapCourse(r: Record<string, unknown>): Course {
  return {
    id: r.id as string,
    title: (r.title as string) ?? '',
    description: (r.description as string) ?? '',
    category: (r.category as Course['category']) ?? 'foundations',
    modules: (r.modules as number) ?? 4,
    price: r.price != null ? String(r.price) : undefined,
    free: (r.free as boolean) ?? true,
    topics: (r.topics as string[]) ?? [],
    stats: (r.stats as Course['stats']) ?? [],
    cta: (r.cta as string) ?? 'View Syllabus',
    ctaIcon: (r.cta_icon as string) ?? 'arrow_forward',
    gradient:
      (r.gradient as string) ?? 'from-primary-container via-primary to-secondary-fixed',
    icon: (r.icon as string) ?? 'auto_stories',
    published: (r.published as boolean) ?? true,
    lessons: (r.lessons as Course['lessons']) ?? [],
    resources: (r.resources as Course['resources']) ?? [],
  }
}

export async function getCourses(): Promise<Course[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })
    const local = readLocal<Course>(COURSES_KEY, [])
    if (error || !data) return readLocal(COURSES_KEY, seedCourses)
    return mergeSeeds(
      'courses',
      overlay(
        data.map((r) => mapCourse(r as Record<string, unknown>)),
        local,
      ),
      [...local, ...seedCourses],
    )
  }
  return mergeSeeds('courses', readLocal(COURSES_KEY, []), seedCourses)
}

export async function getPublishedCourses(): Promise<Course[]> {
  return (await getCourses()).filter((c) => c.published !== false)
}

export async function saveCourse(course: Course): Promise<void> {
  if (isSupabaseConfigured) {
    const { data: u } = await supabase.auth.getUser()
    const dbId = dbIdFor('courses', course.id)
    const core = {
      id: dbId,
      title: course.title,
      description: course.description,
      category: course.category,
      modules: course.modules,
      price: course.price ? Number(String(course.price).replace(/[^0-9.]/g, '')) : null,
      free: course.free ?? true,
      topics: course.topics,
      stats: course.stats,
      cta: course.cta,
      cta_icon: course.ctaIcon,
      gradient: course.gradient,
      icon: course.icon,
      created_by: u.user?.id ?? null,
    }
    await upsertRow(
      'courses',
      {
        ...core,
        published: course.published ?? true,
        lessons: course.lessons ?? [],
        resources: course.resources ?? [],
      },
      core,
    )
    writeLocalRow(COURSES_KEY, { ...course, id: dbId })
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
    const dbId = deleteIdFor('courses', id)
    if (dbId) await supabase.from('courses').delete().eq('id', dbId)
  }
  hide('courses', id)
  const dbId = deleteIdFor('courses', id)
  writeLocal(
    COURSES_KEY,
    readLocal(COURSES_KEY, seedCourses).filter((c) => c.id !== id && c.id !== dbId),
  )
}

// ---------- Services ----------
function mapService(r: Record<string, unknown>): Service {
  return {
    id: r.id as string,
    title: (r.title as string) ?? '',
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
    mentorId: (r.mentor_id as string) ?? undefined,
    mentorName: (r.mentor_name as string) ?? undefined,
    published: (r.published as boolean) ?? true,
  }
}

export async function getServices(): Promise<Service[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false })
    const local = readLocal<Service>(SERVICES_KEY, [])
    if (error || !data) return readLocal(SERVICES_KEY, seedServices)
    return mergeSeeds(
      'services',
      overlay(
        data.map((r) => mapService(r as Record<string, unknown>)),
        local,
      ),
      [...local, ...seedServices],
    )
  }
  return mergeSeeds('services', readLocal(SERVICES_KEY, []), seedServices)
}

export async function getPublishedServices(): Promise<Service[]> {
  return (await getServices()).filter((s) => s.published !== false)
}

export async function saveService(service: Service): Promise<void> {
  if (isSupabaseConfigured) {
    const { data: u } = await supabase.auth.getUser()
    const dbId = dbIdFor('services', service.id)
    const core = {
      id: dbId,
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
    }
    await upsertRow(
      'services',
      {
        ...core,
        mentor_id: service.mentorId ?? null,
        mentor_name: service.mentorName ?? null,
        published: service.published ?? true,
      },
      core,
    )
    writeLocalRow(SERVICES_KEY, { ...service, id: dbId })
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
    const dbId = deleteIdFor('services', id)
    if (dbId) await supabase.from('services').delete().eq('id', dbId)
  }
  hide('services', id)
  const dbId = deleteIdFor('services', id)
  writeLocal(
    SERVICES_KEY,
    readLocal(SERVICES_KEY, seedServices).filter((s) => s.id !== id && s.id !== dbId),
  )
}

export function resetStore(): void {
  localStorage.removeItem(OPPS_KEY)
  localStorage.removeItem(COURSES_KEY)
  localStorage.removeItem(SERVICES_KEY)
  localStorage.removeItem(HIDDEN_KEY)
  localStorage.removeItem(ID_MAP_KEY)
}
export function newContentId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${prefix}_${Date.now()}`
}
