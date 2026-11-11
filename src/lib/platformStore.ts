/*
 * GSP platform data stores.
 *
 * Reads come from the localStorage cache so page code stays synchronous.
 * `hydratePlatformStore` refreshes that cache from Supabase when a user signs
 * in, and every mutation writes through to Supabase in the background.
 * localStorage remains the fallback when Supabase is not configured or a
 * table has not been migrated yet.
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
import { isSupabaseConfigured, supabase } from './supabase'

type Row = Record<string, unknown>

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

// ---------- write-through helpers ----------
const warned = new Set<string>()
function warnOnce(label: string, message: string): void {
  const key = `${label}:${message}`
  if (warned.has(key)) return
  warned.add(key)
  console.warn(`[platform:${label}] ${message}`)
}

type SyncResult = { error: { message: string } | null }
function sync(label: string, run: () => PromiseLike<SyncResult>): void {
  if (!isSupabaseConfigured) return
  Promise.resolve(run())
    .then((res) => {
      if (res?.error) warnOnce(label, res.error.message)
    })
    .catch((err: unknown) => warnOnce(label, String(err)))
}

/*
 * Upsert that can retry without its jsonb `data` column. Keeps the app working
 * on databases that have not been re-migrated with the latest v1_schema.sql.
 */
function syncUpsert(label: string, table: string, row: Row, fallback?: Row): void {
  if (!isSupabaseConfigured) return
  Promise.resolve(supabase.from(table).upsert(row))
    .then(({ error }) => {
      if (!error) return
      if (!fallback || !/column|schema cache|does not exist/i.test(error.message)) {
        warnOnce(label, error.message)
        return
      }
      Promise.resolve(supabase.from(table).upsert(fallback))
        .then(({ error: retryError }) => {
          if (retryError) warnOnce(label, retryError.message)
          else warnOnce(label, 'run supabase/v1_schema.sql to store full objects')
        })
        .catch((err: unknown) => warnOnce(label, String(err)))
    })
    .catch((err: unknown) => warnOnce(label, String(err)))
}

// Records hidden locally (e.g. deleting a seeded item that has no server row).
const HIDDEN_KEY = 'gsp_platform_hidden'
function hiddenIds(): Record<string, string[]> {
  return read<Record<string, string[]>>(HIDDEN_KEY, {})
}
function hide(kind: string, id: string): void {
  const map = hiddenIds()
  const list = map[kind] ?? []
  if (!list.includes(id)) map[kind] = [...list, id]
  write(HIDDEN_KEY, map)
}
function isHidden(kind: string, id: string): boolean {
  return (hiddenIds()[kind] ?? []).includes(id)
}

function mergeRows<T extends { id: string }>(server: T[], local: T[]): T[] {
  const localById = new Map(local.map((r) => [r.id, r]))
  const serverIds = new Set(server.map((r) => r.id))
  const merged = server.map((r) => {
    const l = localById.get(r.id)
    return l ? { ...l, ...r } : r
  })
  return [...merged, ...local.filter((r) => !serverIds.has(r.id))]
}

function withoutData(row: Row): Row {
  const { data: _data, ...rest } = row
  return rest
}

// ---------- row mappers ----------
function mapSession(r: Row): LiveSession {
  const d = (r.data ?? {}) as LiveSession
  return {
    ...d,
    id: r.id as string,
    title: (r.title as string) ?? d.title ?? '',
    host: (r.host as string) ?? d.host ?? '',
    description: (r.description as string) ?? d.description ?? '',
    date: (r.date as string) ?? d.date,
    time: (r.time as string) ?? d.time,
    meetingLink: (r.meeting_link as string) ?? d.meetingLink,
    relatedOpportunityId: (r.opportunity_id as string) ?? d.relatedOpportunityId,
    audience: ((r.audience as LiveSession['audience']) ?? d.audience) || 'all',
    published: (r.published as boolean) ?? d.published ?? true,
  }
}

function sessionRow(s: LiveSession): Row {
  return {
    id: s.id,
    title: s.title,
    description: s.description ?? '',
    host: s.host,
    date: s.date ?? '',
    time: s.time ?? '',
    meeting_link: s.meetingLink ?? '',
    opportunity_id: s.relatedOpportunityId ?? '',
    audience: s.audience ?? 'all',
    published: s.published ?? true,
    data: s,
  }
}

function mapSprint(r: Row): Sprint & { enrolledUsers: string[] } {
  const d = (r.data ?? {}) as Sprint
  return {
    ...d,
    id: r.id as string,
    title: (r.title as string) ?? d.title ?? '',
    description: (r.description as string) ?? d.description ?? '',
    capacity: (r.capacity as number) ?? d.capacity,
    published: (r.published as boolean) ?? d.published ?? true,
    objectives: (r.objectives as string[]) ?? d.objectives ?? [],
    milestones: d.milestones ?? [],
    mentorIds: (r.mentor_ids as string[]) ?? d.mentorIds ?? [],
    mentorNames: (r.mentor_names as string[]) ?? d.mentorNames ?? [],
    liveSessionIds: (r.live_session_ids as string[]) ?? d.liveSessionIds ?? [],
    enrolledUsers: [],
  }
}

function sprintRow(s: Sprint): Row {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    capacity: s.capacity ?? 0,
    published: s.published ?? true,
    objectives: s.objectives ?? [],
    milestones: s.milestones ?? [],
    mentor_ids: s.mentorIds ?? [],
    mentor_names: s.mentorNames ?? [],
    live_session_ids: s.liveSessionIds ?? [],
    duration: s.durationDays ? String(s.durationDays) : '',
    dates: [s.startDate, s.endDate].filter(Boolean).join(' – '),
    spots: s.spots ?? '',
    data: s,
  }
}

function mapPost(r: Row): Post {
  const d = (r.data ?? {}) as Post
  return {
    ...d,
    id: r.id as string,
    title: (r.title as string) ?? d.title ?? '',
    body: (r.body as string) ?? d.body ?? '',
    excerpt: (r.excerpt as string) ?? d.excerpt ?? '',
    tags: (r.tags as string[]) ?? d.tags ?? [d.tag].filter(Boolean),
    author: (r.author_name as string) ?? d.author ?? '',
    authorId: (r.author_id as string) ?? d.authorId,
    authorRole: ((r.author_role as Post['authorRole']) ?? d.authorRole) || 'student',
    badge: (r.badge as string) ?? d.badge,
    votes: (r.votes as number) ?? d.votes ?? 0,
    replies: (r.replies as number) ?? d.replies ?? 0,
    pinned: (r.pinned as boolean) ?? d.pinned ?? false,
  }
}

function postRow(p: Post): Row {
  return {
    id: p.id,
    title: p.title,
    body: p.body ?? '',
    excerpt: p.excerpt ?? '',
    tags: p.tags ?? [p.tag].filter(Boolean),
    author_id: p.authorId ?? null,
    author_name: p.author,
    author_role: p.authorRole ?? 'student',
    badge: p.badge ?? null,
    votes: p.votes,
    replies: p.replies,
    pinned: Boolean(p.pinned),
    data: p,
  }
}

function mapReply(r: Row): PostReply {
  return {
    id: r.id as string,
    postId: r.post_id as string,
    authorId: (r.author_id as string) ?? '',
    authorName: (r.author_name as string) ?? '',
    authorRole: (r.author_role as UserRole) ?? 'student',
    body: (r.body as string) ?? '',
    createdAt: (r.created_at as string) ?? '',
    votes: (r.votes as number) ?? 0,
  }
}

function replyRow(r: PostReply): Row {
  return {
    id: r.id,
    post_id: r.postId,
    author_id: r.authorId || null,
    author_name: r.authorName,
    author_role: r.authorRole,
    body: r.body,
    votes: r.votes,
    created_at: r.createdAt,
  }
}

// ---------- hydration ----------
let hydratedFor: string | null = null
let inflight: Promise<void> | null = null

function rows(
  res: { data: unknown[] | null; error: { message: string } | null },
  label: string,
): Row[] {
  if (res.error) {
    warnOnce(label, res.error.message)
    return []
  }
  return (res.data ?? []) as Row[]
}

export async function hydratePlatformStore(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  if (hydratedFor === userId) return
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const [sessions, sprints, enroll, posts, replies, rsvps, tracks, bookings, notifs, saved, progress] =
        await Promise.all([
          supabase.from('live_sessions').select('*'),
          supabase.from('sprints').select('*'),
          supabase.from('sprint_enrollments').select('*'),
          supabase.from('posts').select('*').order('created_at', { ascending: false }),
          supabase.from('post_replies').select('*').order('created_at', { ascending: true }),
          supabase.from('session_rsvps').select('*'),
          supabase.from('mentor_tracks').select('*'),
          supabase.from('service_bookings').select('*').order('created_at', { ascending: false }),
          supabase.from('notifications').select('*').order('created_at', { ascending: false }),
          supabase.from('saved_opportunities').select('*'),
          supabase.from('lesson_progress').select('*'),
        ])

      const sessionRows = rows(sessions, 'live_sessions')
      const sprintRows = rows(sprints, 'sprints')
      const enrollRows = rows(enroll, 'sprint_enrollments')
      const postRows = rows(posts, 'posts')
      const replyRows = rows(replies, 'post_replies')
      const rsvpRows = rows(rsvps, 'session_rsvps')
      const trackRows = rows(tracks, 'mentor_tracks')
      const bookingRows = rows(bookings, 'service_bookings')
      const notifRows = rows(notifs, 'notifications')
      const savedRows = rows(saved, 'saved_opportunities')
      const progressRows = rows(progress, 'lesson_progress')

      if (!sessions.error) {
        const mapped = sessionRows
          .map(mapSession)
          .filter((s) => !isHidden('sessions', s.id))
        write(
          SESSIONS_KEY,
          mergeRows(
            mapped,
            read<LiveSession[]>(SESSIONS_KEY, []).filter((s) => !isHidden('sessions', s.id)),
          ),
        )
      }

      if (!sprints.error) {
        const mapped = sprintRows
          .map(mapSprint)
          .filter((s) => !isHidden('sprints', s.id))
        write(
          SPRINTS_KEY,
          mergeRows(
            mapped,
            read<Sprint[]>(SPRINTS_KEY, []).filter((s) => !isHidden('sprints', s.id)),
          ),
        )
      }

      if (!enroll.error) {
        const map = read<Record<string, string[]>>(ENROLLED_KEY, {})
        for (const r of enrollRows) {
          const sid = r.sprint_id as string
          const uid = r.user_id as string
          map[sid] = [...new Set([...(map[sid] ?? []), uid])]
        }
        write(ENROLLED_KEY, map)
      }

      if (!posts.error) {
        const mapped = postRows.filter((p) => !isHidden('posts', p.id as string)).map(mapPost)
        write(
          POSTS_KEY,
          mergeRows(
            mapped,
            read<Post[]>(POSTS_KEY, []).filter((p) => !isHidden('posts', p.id)),
          ),
        )
      }

      if (!replies.error) {
        write(REPLIES_KEY, mergeRows(replyRows.map(mapReply), read<PostReply[]>(REPLIES_KEY, [])))
      }

      if (!rsvps.error) {
        const map = read<Record<string, string[]>>(RSVP_KEY, {})
        const mine = rsvpRows
          .filter((r) => r.user_id === userId)
          .map((r) => r.session_id as string)
        map[userId] = [...new Set([...(map[userId] ?? []), ...mine])]
        write(RSVP_KEY, map)
      }

      if (!tracks.error) {
        const map = read<Record<string, string[]>>(TRACKS_KEY, {})
        for (const r of trackRows) map[r.user_id as string] = (r.tracks as string[]) ?? []
        write(TRACKS_KEY, map)
      }

      if (!bookings.error) {
        write(
          BOOKINGS_KEY,
          mergeRows(bookingRows.map(mapBooking), read<Booking[]>(BOOKINGS_KEY, [])),
        )
      }

      if (!notifs.error) {
        const merged = mergeRows(
          notifRows.map(mapNotification),
          read<AppNotification[]>(NOTIFS_KEY, []),
        )
        write(
          NOTIFS_KEY,
          merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        )
      }

      if (!saved.error) {
        const map = read<Record<string, string[]>>(SAVED_KEY, {})
        const mine = savedRows
          .filter((r) => r.user_id === userId)
          .map((r) => r.opportunity_id as string)
        map[userId] = [...new Set([...(map[userId] ?? []), ...mine])]
        write(SAVED_KEY, map)
      }

      if (!progress.error) {
        const map = read<Record<string, string[]>>(PROGRESS_KEY, {})
        const mine = progressRows
          .filter((r) => r.user_id === userId)
          .map((r) => r.lesson_id as string)
        map[userId] = [...new Set([...(map[userId] ?? []), ...mine])]
        write(PROGRESS_KEY, map)
      }

      hydratedFor = userId
    } catch (err) {
      warnOnce('hydrate', String(err))
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/** Called on logout so the next sign-in refreshes from the server again. */
export function resetPlatformHydration(): void {
  hydratedFor = null
  inflight = null
}

// ---------- Info / live sessions ----------
const SESSIONS_KEY = 'gsp_sessions'

export function getInfoSessions(): LiveSession[] {
  try {
    const parsed = read<LiveSession[]>(SESSIONS_KEY, [])
    const ids = new Set(parsed.map((s) => s.id))
    const merged = [...parsed]
    for (const s of seedSessions) if (!ids.has(s.id)) merged.push(s)
    return merged
      .filter((s) => !isHidden('sessions', s.id))
      .map((s) => ({ ...s, published: s.published ?? true }))
  } catch {
    return seedSessions
      .filter((s) => !isHidden('sessions', s.id))
      .map((s) => ({ ...s, published: true }))
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
  const row = sessionRow(s)
  syncUpsert('save session', 'live_sessions', row, withoutData(row))
}
export function deleteInfoSession(id: string): void {
  write(
    SESSIONS_KEY,
    getInfoSessions().filter((s) => s.id !== id),
  )
  hide('sessions', id)
  sync('delete session', () => supabase.from('live_sessions').delete().eq('id', id))
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

  if (next.includes(sessionId)) {
    sync('rsvp insert', () =>
      supabase
        .from('session_rsvps')
        .upsert({ user_id: userId, session_id: sessionId }, { onConflict: 'user_id,session_id' }),
    )
  } else {
    sync('rsvp delete', () =>
      supabase
        .from('session_rsvps')
        .delete()
        .eq('user_id', userId)
        .eq('session_id', sessionId),
    )
  }
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
  return merged
    .filter((s) => !isHidden('sprints', s.id))
    .map((s) => ({
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
  const row = sprintRow(s)
  syncUpsert('save sprint', 'sprints', row, withoutData(row))
}
export function deleteSprint(id: string): void {
  const list = getSprints()
    .filter((s) => s.id !== id)
    .map(({ enrolledUsers: _e, ...rest }) => rest)
  write(SPRINTS_KEY, list)
  hide('sprints', id)

  const map = read<Record<string, string[]>>(ENROLLED_KEY, {})
  delete map[id]
  write(ENROLLED_KEY, map)

  sync('delete sprint', () => supabase.from('sprints').delete().eq('id', id))
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
  sync('enroll', () =>
    supabase
      .from('sprint_enrollments')
      .upsert({ user_id: userId, sprint_id: sprintId }, { onConflict: 'user_id,sprint_id' }),
  )
  return { ok: true }
}
export function leaveSprint(userId: string, sprintId: string): void {
  const map = read<Record<string, string[]>>(ENROLLED_KEY, {})
  if (map[sprintId]) map[sprintId] = map[sprintId].filter((u) => u !== userId)
  write(ENROLLED_KEY, map)
  sync('unenroll', () =>
    supabase
      .from('sprint_enrollments')
      .delete()
      .eq('user_id', userId)
      .eq('sprint_id', sprintId),
  )
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
    return merged
      .filter((p) => !isHidden('posts', p.id))
      .map((p) => ({
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
  const row = postRow(post)
  syncUpsert('save post', 'posts', row, withoutData(row))
}
function setPostReplyCount(postId: string, count: number): void {
  const post = getPost(postId)
  if (!post) return
  const list = read<Post[]>(POSTS_KEY, []).filter((p) => p.id !== postId)
  list.unshift({ ...post, replies: count })
  write(POSTS_KEY, list)
  sync('post reply count', () => supabase.from('posts').update({ replies: count }).eq('id', postId))
}
export function deletePost(id: string): void {
  write(
    POSTS_KEY,
    getPosts().filter((p) => p.id !== id),
  )
  write(
    REPLIES_KEY,
    read<PostReply[]>(REPLIES_KEY, []).filter((r) => r.postId !== id),
  )
  hide('posts', id)
  sync('delete post', () => supabase.from('posts').delete().eq('id', id))
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
  sync('add reply', () => supabase.from('post_replies').upsert(replyRow(reply)))

  const post = getPost(input.postId)
  if (post) {
    setPostReplyCount(input.postId, getReplies(input.postId).length)
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
  write(
    REPLIES_KEY,
    read<PostReply[]>(REPLIES_KEY, []).filter((r) => r.id !== id),
  )
  setPostReplyCount(postId, getReplies(postId).length)
  sync('delete reply', () => supabase.from('post_replies').delete().eq('id', id))
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
  sync('save opportunity', () =>
    supabase
      .from('saved_opportunities')
      .upsert({ user_id: userId, opportunity_id: oppId }, { onConflict: 'user_id,opportunity_id' }),
  )
}
export function unsaveOpportunityForUser(userId: string, oppId: string): void {
  const map = readSavedMap()
  map[userId] = (map[userId] ?? []).filter((id) => id !== oppId)
  write(SAVED_KEY, map)
  sync('unsave opportunity', () =>
    supabase
      .from('saved_opportunities')
      .delete()
      .eq('user_id', userId)
      .eq('opportunity_id', oppId),
  )
}

// ---------- Lesson progress ----------
const PROGRESS_KEY = 'gsp_lesson_progress'
export function getCompletedLessons(userId: string): string[] {
  return read<Record<string, string[]>>(PROGRESS_KEY, {})[userId] ?? []
}
export function toggleLessonComplete(userId: string, lessonId: string): string[] {
  const map = read<Record<string, string[]>>(PROGRESS_KEY, {})
  const list = map[userId] ?? []
  const nowDone = !list.includes(lessonId)
  map[userId] = nowDone ? [...list, lessonId] : list.filter((id) => id !== lessonId)
  write(PROGRESS_KEY, map)

  if (nowDone) {
    sync('lesson complete', () =>
      supabase
        .from('lesson_progress')
        .upsert({ user_id: userId, lesson_id: lessonId }, { onConflict: 'user_id,lesson_id' }),
    )
  } else {
    sync('lesson reset', () =>
      supabase
        .from('lesson_progress')
        .delete()
        .eq('user_id', userId)
        .eq('lesson_id', lessonId),
    )
  }
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

function mapNotification(r: Row): AppNotification {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    type: (r.type as AppNotification['type']) ?? 'system',
    title: (r.title as string) ?? '',
    body: (r.body as string) ?? '',
    link: (r.link as string) ?? undefined,
    read: (r.read as boolean) ?? false,
    createdAt: (r.created_at as string) ?? '',
  }
}

function notificationRow(n: AppNotification): Row {
  return {
    id: n.id,
    user_id: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link ?? null,
    read: n.read,
    created_at: n.createdAt,
  }
}

const NOTIFS_KEY = 'gsp_notifs'

export function getNotifications(userId: string): AppNotification[] {
  return read<AppNotification[]>(NOTIFS_KEY, [])
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export function addNotification(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): void {
  const all = read<AppNotification[]>(NOTIFS_KEY, [])
  const notification: AppNotification = {
    ...n,
    id: 'notif_' + Date.now() + Math.random().toString(36).slice(2, 5),
    read: false,
    createdAt: new Date().toISOString(),
  }
  all.unshift(notification)
  write(NOTIFS_KEY, all)
  sync('add notification', () => supabase.from('notifications').upsert(notificationRow(notification)))
}
export function markNotificationRead(id: string): void {
  const all = read<AppNotification[]>(NOTIFS_KEY, [])
  const idx = all.findIndex((n) => n.id === id)
  if (idx >= 0) all[idx].read = true
  write(NOTIFS_KEY, all)
  sync('read notification', () => supabase.from('notifications').update({ read: true }).eq('id', id))
}
export function markAllNotificationsRead(userId: string): void {
  const all = read<AppNotification[]>(NOTIFS_KEY, [])
  for (const n of all) if (n.userId === userId) n.read = true
  write(NOTIFS_KEY, all)
  sync('read all notifications', () =>
    supabase.from('notifications').update({ read: true }).eq('user_id', userId),
  )
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
  sync('save tracks', () =>
    supabase
      .from('mentor_tracks')
      .upsert({ user_id: userId, tracks }, { onConflict: 'user_id' }),
  )
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

function mapBooking(r: Row): Booking {
  return {
    id: r.id as string,
    serviceId: (r.service_id as string) ?? '',
    serviceTitle: (r.service_title as string) ?? '',
    studentId: (r.student_id as string) ?? '',
    studentName: (r.student_name as string) ?? '',
    mentorId: (r.mentor_id as string) ?? undefined,
    mentorName: (r.mentor_name as string) ?? undefined,
    date: (r.date as string) ?? '',
    time: (r.time as string) ?? '',
    notes: (r.notes as string) ?? '',
    status: (r.status as BookingStatus) ?? 'requested',
    createdAt: (r.created_at as string) ?? '',
  }
}

function bookingRow(b: Booking): Row {
  return {
    id: b.id,
    service_id: b.serviceId,
    service_title: b.serviceTitle,
    student_id: b.studentId,
    student_name: b.studentName,
    mentor_id: b.mentorId ?? null,
    mentor_name: b.mentorName ?? null,
    date: b.date,
    time: b.time,
    notes: b.notes,
    status: b.status,
    created_at: b.createdAt,
  }
}

function bookingPatchRow(patch: Partial<Booking>): Row {
  const row: Row = {}
  if (patch.serviceId !== undefined) row.service_id = patch.serviceId
  if (patch.serviceTitle !== undefined) row.service_title = patch.serviceTitle
  if (patch.studentId !== undefined) row.student_id = patch.studentId
  if (patch.studentName !== undefined) row.student_name = patch.studentName
  if (patch.mentorId !== undefined) row.mentor_id = patch.mentorId ?? null
  if (patch.mentorName !== undefined) row.mentor_name = patch.mentorName ?? null
  if (patch.date !== undefined) row.date = patch.date
  if (patch.time !== undefined) row.time = patch.time
  if (patch.notes !== undefined) row.notes = patch.notes
  if (patch.status !== undefined) row.status = patch.status
  return row
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
  sync('create booking', () => supabase.from('service_bookings').upsert(bookingRow(booking)))
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
  sync('update booking', () =>
    supabase.from('service_bookings').update(bookingPatchRow(patch)).eq('id', id),
  )
}
export function deleteBooking(id: string): void {
  write(
    BOOKINGS_KEY,
    getBookings().filter((b) => b.id !== id),
  )
  sync('delete booking', () => supabase.from('service_bookings').delete().eq('id', id))
}
