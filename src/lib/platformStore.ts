/*
 * GSP platform data stores.
 *
 * These entities are persisted in the browser (localStorage) so every action
 * survives refreshes without requiring a service-role key. The matching
 * Supabase tables are included in supabase/v1_schema.sql for a future
 * server-side migration; the access layer can be swapped without touching pages.
 */

import {
  liveSessions as seedSessions,
  upcomingSprints as seedSprints,
  initialPosts as seedPosts,
} from '../data/mockData'
import type {
  LiveSession,
  Sprint,
  Post,
  PostReply,
} from '../data/mockData'
import type { UserRole } from './auth'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ---------- Info / live sessions ----------
const SESSIONS_KEY = 'gsp_sessions'

export function getInfoSessions(): LiveSession[] {
  try {
    const parsed = read<LiveSession[]>(SESSIONS_KEY, [])
    const ids = new Set(parsed.map((s) => s.id))
    const merged = [...parsed]
    for (const s of seedSessions) if (!ids.has(s.id)) merged.push(s)
    return merged.map((s) => ({ ...s, published: s.published ?? true }))
  } catch {
    return seedSessions.map((s) => ({ ...s, published: true }))
  }
}
export function getPublishedSessions(): LiveSession[] {
  return getInfoSessions().filter((s) => s.published !== false)
}
export function saveInfoSession(s: LiveSession): void {
  const list = getInfoSessions()
  const idx = list.findIndex((x) => x.id === s.id)
  if (idx >= 0) list[idx] = s
  else list.unshift(s)
  write(SESSIONS_KEY, list)
}
export function deleteInfoSession(id: string): void {
  write(SESSIONS_KEY, getInfoSessions().filter((s) => s.id !== id))
}

const RSVP_KEY = 'gsp_session_rsvps'
export function getSessionRsvps(userId: string): string[] {
  return read<Record<string, string[]>>(RSVP_KEY, {})[userId] ?? []
}
export function toggleSessionRsvp(userId: string, sessionId: string): boolean {
  const map = read<Record<string, string[]>>(RSVP_KEY, {})
  const list = map[userId] ?? []
  const next = list.includes(sessionId)
    ? list.filter((id) => id !== sessionId)
    : [...list, sessionId]
  map[userId] = next
  write(RSVP_KEY, map)
  return next.includes(sessionId)
}

// ---------- Sprints ----------
const SPRINTS_KEY = 'gsp_sprints'
const ENROLLED_KEY = 'gsp_enrolled'

function capacityFromSpots(spots?: string): number {
  const match = spots?.match(/(\d+)\s*(spots|students|remaining)/i)
  return match ? Number(match[1]) : 50
}

export function getSprints(): (Sprint & { enrolledUsers: string[] })[] {
  const base = read<Sprint[]>(SPRINTS_KEY, [])
  const ids = new Set(base.map((s) => s.id))
  const merged = [...base]
  for (const s of seedSprints) if (!ids.has(s.id)) merged.push(s)
  const enrolledMap = read<Record<string, string[]>>(ENROLLED_KEY, {})
  return merged.map((s) => ({
    ...s,
    published: s.published ?? true,
    capacity: s.capacity ?? capacityFromSpots(s.spots),
    objectives: s.objectives ?? [],
    milestones: s.milestones ?? [],
    mentorIds: s.mentorIds ?? [],
    mentorNames: s.mentorNames ?? [],
    liveSessionIds: s.liveSessionIds ?? [],
    enrolledUsers: enrolledMap[s.id] ?? [],
  }))
}
export function getPublishedSprints(): ReturnType<typeof getSprints> {
  return getSprints().filter((s) => s.published !== false)
}
export function saveSprint(s: Sprint): void {
  const list = getSprints().map(({ enrolledUsers: _e, ...rest }) => rest)
  const idx = list.findIndex((x) => x.id === s.id)
  if (idx >= 0) list[idx] = s
  else list.unshift(s)
  write(SPRINTS_KEY, list)
}
export function deleteSprint(id: string): void {
  const list = getSprints()
    .filter((s) => s.id !== id)
    .map(({ enrolledUsers: _e, ...rest }) => rest)
  write(SPRINTS_KEY, list)
  const map = read<Record<string, string[]>>(ENROLLED_KEY, {})
  delete map[id]
  write(ENROLLED_KEY, map)
}
export function joinSprint(
  userId: string,
  sprintId: string,
): { ok: boolean; error?: string } {
  const sprint = getSprints().find((s) => s.id === sprintId)
  if (!sprint) return { ok: false, error: 'Sprint not found.' }
  if (sprint.published === false) return { ok: false, error: 'This sprint is not open.' }
  const map = read<Record<string, string[]>>(ENROLLED_KEY, {})
  const list = map[sprintId] ?? []
  if (list.includes(userId)) return { ok: true }
  if (sprint.capacity && list.length >= sprint.capacity) {
    return { ok: false, error: 'This sprint is full.' }
  }
  map[sprintId] = [...list, userId]
  write(ENROLLED_KEY, map)
  return { ok: true }
}
export function leaveSprint(userId: string, sprintId: string): void {
  const map = read<Record<string, string[]>>(ENROLLED_KEY, {})
  if (map[sprintId]) map[sprintId] = map[sprintId].filter((u) => u !== userId)
  write(ENROLLED_KEY, map)
}
export function getUserSprints(userId: string): (Sprint & { enrolledUsers: string[] })[] {
  return getSprints().filter((s) => s.enrolledUsers.includes(userId))
}

// ---------- Community ----------
const POSTS_KEY = 'gsp_posts'
const REPLIES_KEY = 'gsp_replies'

export function getPosts(): Post[] {
  try {
    const parsed = read<Post[]>(POSTS_KEY, [])
    const ids = new Set(parsed.map((p) => p.id))
    const merged = [...parsed]
    for (const p of seedPosts) if (!ids.has(p.id)) merged.push(p)
    return merged.map((p) => ({
      ...p,
      tags: p.tags ?? [p.tag],
      body: p.body ?? p.excerpt,
      authorRole: p.authorRole ?? (p.badge?.toLowerCase().includes('mentor') ? 'mentor' : 'student'),
    }))
  } catch {
    return seedPosts
  }
}
export function getPost(id: string): Post | null {
  return getPosts().find((p) => p.id === id) ?? null
}
export function savePost(post: Post): void {
  const list = getPosts()
  const idx = list.findIndex((p) => p.id === post.id)
  if (idx >= 0) list[idx] = post
  else list.unshift(post)
  write(POSTS_KEY, list)
}
export function deletePost(id: string): void {
  write(POSTS_KEY, getPosts().filter((p) => p.id !== id))
  write(REPLIES_KEY, read<PostReply[]>(REPLIES_KEY, []).filter((r) => r.postId !== id))
}

export function getReplies(postId: string): PostReply[] {
  return read<PostReply[]>(REPLIES_KEY, [])
    .filter((r) => r.postId === postId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}
export function addReply(input: {
  postId: string
  authorId: string
  authorName: string
  authorRole: UserRole
  body: string
}): PostReply {
  const reply: PostReply = {
    id: 'reply_' + Date.now() + Math.random().toString(36).slice(2, 6),
    postId: input.postId,
    authorId: input.authorId,
    authorName: input.authorName,
    authorRole: input.authorRole,
    body: input.body,
    createdAt: new Date().toISOString(),
    votes: 1,
  }
  write(REPLIES_KEY, [reply, ...read<PostReply[]>(REPLIES_KEY, [])])

  const post = getPost(input.postId)
  if (post) {
    savePost({ ...post, replies: getReplies(input.postId).length })
    if (post.authorId && post.authorId !== input.authorId) {
      addNotification({
        userId: post.authorId,
        type: 'community',
        title: 'New reply to your question',
        body: `${input.authorName} replied to “${post.title}”`,
        link: `/community/${post.id}`,
      })
    }
  }
  return reply
}
export function deleteReply(id: string, postId: string): void {
  write(REPLIES_KEY, read<PostReply[]>(REPLIES_KEY, []).filter((r) => r.id !== id))
  const post = getPost(postId)
  if (post) savePost({ ...post, replies: getReplies(postId).length })
}

// ---------- Saved opportunities ----------
const SAVED_KEY = 'gsp_saved_opps'

function readSavedMap(): Record<string, string[]> {
  return read<Record<string, string[]>>(SAVED_KEY, {})
}
export function getSavedOpportunityIds(userId: string): string[] {
  return readSavedMap()[userId] ?? []
}
export function saveOpportunityForUser(userId: string, oppId: string): void {
  const map = readSavedMap()
  const list = map[userId] ?? []
  if (!list.includes(oppId)) map[userId] = [...list, oppId]
  write(SAVED_KEY, map)
}
export function unsaveOpportunityForUser(userId: string, oppId: string): void {
  const map = readSavedMap()
  map[userId] = (map[userId] ?? []).filter((id) => id !== oppId)
  write(SAVED_KEY, map)
}

// ---------- Lesson progress ----------
const PROGRESS_KEY = 'gsp_lesson_progress'
export function getCompletedLessons(userId: string): string[] {
  return read<Record<string, string[]>>(PROGRESS_KEY, {})[userId] ?? []
}
export function toggleLessonComplete(userId: string, lessonId: string): string[] {
  const map = read<Record<string, string[]>>(PROGRESS_KEY, {})
  const list = map[userId] ?? []
  map[userId] = list.includes(lessonId)
    ? list.filter((id) => id !== lessonId)
    : [...list, lessonId]
  write(PROGRESS_KEY, map)
  return map[userId]
}

// ---------- Notifications ----------
export interface AppNotification {
  id: string
  userId: string
  type: 'opportunity' | 'sprint' | 'community' | 'system' | 'deadline' | 'booking'
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
}

const NOTIFS_KEY = 'gsp_notifs'

export function getNotifications(userId: string): AppNotification[] {
  return read<AppNotification[]>(NOTIFS_KEY, [])
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export function addNotification(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): void {
  const all = read<AppNotification[]>(NOTIFS_KEY, [])
  all.unshift({
    ...n,
    id: 'notif_' + Date.now() + Math.random().toString(36).slice(2, 5),
    read: false,
    createdAt: new Date().toISOString(),
  })
  write(NOTIFS_KEY, all)
}
export function markNotificationRead(id: string): void {
  const all = read<AppNotification[]>(NOTIFS_KEY, [])
  const idx = all.findIndex((n) => n.id === id)
  if (idx >= 0) all[idx].read = true
  write(NOTIFS_KEY, all)
}
export function markAllNotificationsRead(userId: string): void {
  const all = read<AppNotification[]>(NOTIFS_KEY, [])
  for (const n of all) if (n.userId === userId) n.read = true
  write(NOTIFS_KEY, all)
}
export function getUnreadCount(userId: string): number {
  return getNotifications(userId).filter((n) => !n.read).length
}

// ---------- Mentor specialisations ----------
const TRACKS_KEY = 'gsp_mentor_tracks'
export function getMentorTracks(userId: string): string[] {
  return read<Record<string, string[]>>(TRACKS_KEY, {})[userId] ?? []
}
export function setMentorTracks(userId: string, tracks: string[]): void {
  const map = read<Record<string, string[]>>(TRACKS_KEY, {})
  map[userId] = tracks
  write(TRACKS_KEY, map)
}
export function getAllMentorTracks(): Record<string, string[]> {
  return read<Record<string, string[]>>(TRACKS_KEY, {})
}

// ---------- Service bookings ----------
export type BookingStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled'

export interface Booking {
  id: string
  serviceId: string
  serviceTitle: string
  studentId: string
  studentName: string
  mentorId?: string
  mentorName?: string
  date: string
  time: string
  notes: string
  status: BookingStatus
  createdAt: string
}

const BOOKINGS_KEY = 'gsp_bookings'

export function getBookings(): Booking[] {
  return read<Booking[]>(BOOKINGS_KEY, []).sort((a, b) =>
    a.date.localeCompare(b.date),
  )
}
export function getStudentBookings(studentId: string): Booking[] {
  return getBookings().filter((b) => b.studentId === studentId)
}
export function getMentorBookings(mentorId: string): Booking[] {
  return getBookings().filter((b) => b.mentorId === mentorId)
}
export function createBooking(input: Omit<Booking, 'id' | 'createdAt' | 'status'>): Booking {
  const booking: Booking = {
    ...input,
    id: 'booking_' + Date.now(),
    status: 'requested',
    createdAt: new Date().toISOString(),
  }
  write(BOOKINGS_KEY, [...getBookings(), booking])
  addNotification({
    userId: input.studentId,
    type: 'booking',
    title: 'Service request submitted',
    body: `${input.serviceTitle} — ${input.date} at ${input.time}`,
    link: '/services',
  })
  if (input.mentorId) {
    addNotification({
      userId: input.mentorId,
      type: 'booking',
      title: 'New service request',
      body: `${input.studentName} requested ${input.serviceTitle}`,
      link: '/mentor',
    })
  }
  return booking
}
export function updateBooking(id: string, patch: Partial<Booking>): void {
  write(
    BOOKINGS_KEY,
    getBookings().map((b) => (b.id === id ? { ...b, ...patch } : b)),
  )
}
export function deleteBooking(id: string): void {
  write(BOOKINGS_KEY, getBookings().filter((b) => b.id !== id))
}
