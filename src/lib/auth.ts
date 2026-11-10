/*
 * Mock authentication layer.
 *
 * This mirrors the shape of a real auth API (Supabase/Firebase/custom) so it can
 * be swapped out without touching the UI. Passwords are stored in plain text here
 * for demo purposes only — a real backend must hash them (bcrypt/argon2).
 */

export type UserRole = 'student' | 'admin'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}

export interface Profile {
  userId: string
  firstName: string
  lastName: string
  bio: string
  gpa: number | null
  sat: number | null
  act: number | null
  intendedMajor: string
  graduationYear: number | null
  firstGen: boolean
  lowIncome: boolean
  urm: boolean
  interests: string[]
  targetSchools: string[]
  location: string
  avatarUrl: string | null
}

const USERS_KEY = 'gsp_users'
const SESSION_KEY = 'gsp_session'
const PROFILES_KEY = 'gsp_profiles'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function uid(): string {
  return 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function getUsers(): AuthUser[] {
  return readJson<AuthUser[]>(USERS_KEY, [])
}

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function getCurrentUser(): AuthUser | null {
  const id = getSessionUserId()
  if (!id) return null
  return getUsers().find((u) => u.id === id) ?? null
}

export function getProfile(userId: string): Profile | null {
  const profiles = readJson<Profile[]>(PROFILES_KEY, [])
  return profiles.find((p) => p.userId === userId) ?? null
}

export function saveProfile(profile: Profile): void {
  const profiles = readJson<Profile[]>(PROFILES_KEY, [])
  const idx = profiles.findIndex((p) => p.userId === profile.userId)
  if (idx >= 0) profiles[idx] = profile
  else profiles.push(profile)
  writeJson(PROFILES_KEY, profiles)
}

export function signup(input: {
  name: string
  email: string
  password: string
  adminCode?: string
}): { ok: true; user: AuthUser } | { ok: false; error: string } {
  const users = getUsers()
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false, error: 'An account with that email already exists.' }
  }
  if (input.password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' }
  }
  const role: UserRole =
    input.adminCode && input.adminCode === 'GSP-ADMIN-2026' ? 'admin' : 'student'
  const user: AuthUser = {
    id: uid(),
    email: input.email.trim(),
    name: input.name.trim(),
    role,
    createdAt: new Date().toISOString(),
  }
  // Store password alongside (mock only)
  writeJson(USERS_KEY, [...users, { ...user, _password: input.password } as AuthUser & { _password: string }])
  // Create empty profile
  saveProfile({
    userId: user.id,
    firstName: input.name.split(' ')[0] ?? '',
    lastName: input.name.split(' ').slice(1).join(' '),
    bio: '',
    gpa: null,
    sat: null,
    act: null,
    intendedMajor: '',
    graduationYear: null,
    firstGen: false,
    lowIncome: false,
    urm: false,
    interests: [],
    targetSchools: [],
    location: '',
    avatarUrl: null,
  })
  localStorage.setItem(SESSION_KEY, user.id)
  return { ok: true, user }
}

export function login(
  email: string,
  password: string,
): { ok: true; user: AuthUser } | { ok: false; error: string } {
  const users = readJson<(AuthUser & { _password?: string })[]>(USERS_KEY, [])
  const found = users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  )
  if (!found) return { ok: false, error: 'No account found with that email.' }
  if (found._password !== password) {
    return { ok: false, error: 'Incorrect password.' }
  }
  localStorage.setItem(SESSION_KEY, found.id)
  const { _password, ...user } = found
  return { ok: true, user: user as AuthUser }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function updateUserName(userId: string, name: string): void {
  const users = readJson<(AuthUser & { _password?: string })[]>(USERS_KEY, [])
  const idx = users.findIndex((u) => u.id === userId)
  if (idx >= 0) {
    users[idx].name = name
    writeJson(USERS_KEY, users)
  }
}
