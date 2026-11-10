/*
 * Local data store for admin-managed content (opportunities, courses, services).
 * Seed data comes from mockData; admin additions are persisted to localStorage
 * so they survive reloads and appear for students. Replace with API calls when
 * a backend is wired up.
 */

import { courses as seedCourses, opportunities as seedOpportunities, services as seedServices } from '../data/mockData'
import type { Course, Opportunity, Service } from '../data/mockData'

const OPPS_KEY = 'gsp_opps'
const COURSES_KEY = 'gsp_courses'
const SERVICES_KEY = 'gsp_services'

function read<T extends { id: string }>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return [...seed]
    const parsed = JSON.parse(raw) as T[]
    // Merge: seed items not already present (by id) + stored
    const storedIds = new Set(parsed.map((x: { id: string }) => x.id))
    const merged = [...parsed]
    for (const s of seed) {
      if (!storedIds.has(s.id)) merged.push(s)
    }
    return merged
  } catch {
    return [...seed]
  }
}

function write<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getOpportunities(): Opportunity[] {
  return read(OPPS_KEY, seedOpportunities)
}
export function saveOpportunity(opp: Opportunity): void {
  const list = getOpportunities()
  const idx = list.findIndex((o) => o.id === opp.id)
  if (idx >= 0) list[idx] = opp
  else list.unshift(opp)
  write(OPPS_KEY, list)
}
export function deleteOpportunity(id: string): void {
  write(OPPS_KEY, getOpportunities().filter((o) => o.id !== id))
}

export function getCourses(): Course[] {
  return read(COURSES_KEY, seedCourses)
}
export function saveCourse(course: Course): void {
  const list = getCourses()
  const idx = list.findIndex((c) => c.id === course.id)
  if (idx >= 0) list[idx] = course
  else list.unshift(course)
  write(COURSES_KEY, list)
}
export function deleteCourse(id: string): void {
  write(COURSES_KEY, getCourses().filter((c) => c.id !== id))
}

export function getServices(): Service[] {
  return read(SERVICES_KEY, seedServices)
}
export function saveService(service: Service): void {
  const list = getServices()
  const idx = list.findIndex((s) => s.id === service.id)
  if (idx >= 0) list[idx] = service
  else list.unshift(service)
  write(SERVICES_KEY, list)
}
export function deleteService(id: string): void {
  write(SERVICES_KEY, getServices().filter((s) => s.id !== id))
}

export function resetStore(): void {
  localStorage.removeItem(OPPS_KEY)
  localStorage.removeItem(COURSES_KEY)
  localStorage.removeItem(SERVICES_KEY)
}
