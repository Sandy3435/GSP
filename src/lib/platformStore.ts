/*
 * Platform-level data stores: info sessions, sprints, notifications,
 * community posts, and per-user saved opportunities.
 * Persisted to localStorage; swap for Supabase tables when ready.
 */

import { liveSessions as seedSessions, upcomingSprints as seedSprints, initialPosts as seedPosts } from '../data/mockData'
import type { LiveSession, Sprint, Post } from '../data/mockData'

// ---------- Info sessions ----------
const SESSIONS_KEY = 'gsp_sessions'

export function getInfoSessions(): LiveSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) return [...seedSessions]
    const parsed = JSON.parse(raw) as LiveSession[]
    const ids = new Set(parsed.map((s) => s.id))
    const merged = [...parsed]
    for (const s of seedSessions) if (!ids.has(s.id)) merged.push(s)
    return merged
  } catch {
    return [...seedSessions]
  }
}
export function saveInfoSession(s: LiveSession): void {
  const list = getInfoSessions()
  const idx = list.findIndex((x) => x.id === s.id)
  if (idx >= 0) list[idx] = s
  else list.unshift(s)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(list))
}
export function deleteInfoSession(id: string): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(getInfoSessions().filter((s) => s.id !== id)))
}

// ---------- Sprints ----------
const SPRINTS_KEY = 'gsp_sprints'
const ENROLLED_KEY = 'gsp_enrolled' // userId -> sprintId[]

export function getSprints(): (Sprint & { enrolledUsers: string[] })[] {
  try {
    const raw = localStorage.getItem(SPRINTS_KEY)
    const base: Sprint[] = raw ? JSON.parse(raw) : [...seedSprints]
    const ids = new Set(base.map((s) => s.id))
    const merged = [...base]
    for (const s of seedSprints) if (!ids.has(s.id)) merged.push(s)
    // attach enrolled users
    const enrolledMap = readEnrolledMap()
    return merged.map((s) => ({
      ...s,
      enrolledUsers: enrolledMap[s.id] ?? [],
    }))
  } catch {
    const enrolledMap = readEnrolledMap()
    return seedSprints.map((s) => ({ ...s, enrolledUsers: enrolledMap[s.id] ?? [] }))
  }
}
function readEnrolledMap(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(ENROLLED_KEY) ?? '{}')
  } catch {
    return {}
  }
}
function writeEnrolledMap(m: Record<string, string[]>): void {
  localStorage.setItem(ENROLLED_KEY, JSON.stringify(m))
}
export function saveSprint(s: Sprint): void {
  const list = getSprints().map(({ enrolledUsers, ...rest }) => rest)
  const idx = list.findIndex((x) => x.id === s.id)
  if (idx >= 0) list[idx] = s
  else list.unshift(s)
  localStorage.setItem(SPRINTS_KEY, JSON.stringify(list))
}
export function deleteSprint(id: string): void {
  const list = getSprints().map(({ enrolledUsers, ...rest }) => rest).filter((s) => s.id !== id)
  localStorage.setItem(SPRINTS_KEY, JSON.stringify(list))
  const m = readEnrolledMap()
  delete m[id]
  writeEnrolledMap(m)
}
export function joinSprint(userId: string, sprintId: string): void {
  const m = readEnrolledMap()
  if (!m[sprintId]) m[sprintId] = []
  if (!m[sprintId].includes(userId)) m[sprintId].push(userId)
  writeEnrolledMap(m)
}
export function leaveSprint(userId: string, sprintId: string): void {
  const m = readEnrolledMap()
  if (m[sprintId]) m[sprintId] = m[sprintId].filter((u) => u !== userId)
  writeEnrolledMap(m)
}
export function getUserSprints(userId: string): (Sprint & { enrolledUsers: string[] })[] {
  return getSprints().filter((s) => s.enrolledUsers.includes(userId))
}

// ---------- Community posts ----------
const POSTS_KEY = 'gsp_posts'

export function getPosts(): Post[] {
  try {
    const raw = localStorage.getItem(POSTS_KEY)
    if (!raw) return [...seedPosts]
    const parsed = JSON.parse(raw) as Post[]
    const ids = new Set(parsed.map((p) => p.id))
    const merged = [...parsed]
    for (const p of seedPosts) if (!ids.has(p.id)) merged.push(p)
    return merged
  } catch {
    return [...seedPosts]
  }
}
export function savePost(post: Post): void {
  const list = getPosts()
  const idx = list.findIndex((p) => p.id === post.id)
  if (idx >= 0) list[idx] = post
  else list.unshift(post)
  localStorage.setItem(POSTS_KEY, JSON.stringify(list))
}
export function deletePost(id: string): void {
  localStorage.setItem(POSTS_KEY, JSON.stringify(getPosts().filter((p) => p.id !== id)))
}

// ---------- Saved opportunities (per user) ----------
const SAVED_KEY = 'gsp_saved_opps'

function readSavedMap(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '{}')
  } catch {
    return {}
  }
}
export function getSavedOpportunityIds(userId: string): string[] {
  return readSavedMap()[userId] ?? []
}
export function saveOpportunityForUser(userId: string, oppId: string): void {
  const m = readSavedMap()
  if (!m[userId]) m[userId] = []
  if (!m[userId].includes(oppId)) m[userId].push(oppId)
  localStorage.setItem(SAVED_KEY, JSON.stringify(m))
}
export function unsaveOpportunityForUser(userId: string, oppId: string): void {
  const m = readSavedMap()
  if (m[userId]) m[userId] = m[userId].filter((id) => id !== oppId)
  localStorage.setItem(SAVED_KEY, JSON.stringify(m))
}

// ---------- Notifications ----------
export interface AppNotification {
  id: string
  userId: string
  type: 'opportunity' | 'sprint' | 'community' | 'system' | 'deadline'
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
}

const NOTIFS_KEY = 'gsp_notifs'

export function getNotifications(userId: string): AppNotification[] {
  try {
    const all = JSON.parse(localStorage.getItem(NOTIFS_KEY) ?? '[]') as AppNotification[]
    return all.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch {
    return []
  }
}
export function addNotification(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): void {
  const all = (() => {
    try { return JSON.parse(localStorage.getItem(NOTIFS_KEY) ?? '[]') as AppNotification[] } catch { return [] }
  })()
  all.unshift({ ...n, id: 'notif_' + Date.now(), read: false, createdAt: new Date().toISOString() })
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(all))
}
export function markNotificationRead(id: string): void {
  const all = (() => {
    try { return JSON.parse(localStorage.getItem(NOTIFS_KEY) ?? '[]') as AppNotification[] } catch { return [] }
  })()
  const idx = all.findIndex((n) => n.id === id)
  if (idx >= 0) all[idx].read = true
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(all))
}
export function markAllNotificationsRead(userId: string): void {
  const all = (() => {
    try { return JSON.parse(localStorage.getItem(NOTIFS_KEY) ?? '[]') as AppNotification[] } catch { return [] }
  })()
  for (const n of all) if (n.userId === userId) n.read = true
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(all))
}
export function getUnreadCount(userId: string): number {
  return getNotifications(userId).filter((n) => !n.read).length
}
