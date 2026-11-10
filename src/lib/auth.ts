/*
 * Authentication layer backed by Supabase Auth.
 * Falls back to a mock (localStorage) implementation when Supabase is not
 * configured, so the app still runs for demos.
 */

import { isSupabaseConfigured, supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

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

// ---------- Mock fallback (used when Supabase is not configured) ----------
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

// ---------- Public API ----------

export async function listUsers(): Promise<AuthUser[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('profiles').select('*')
    if (!data) return []
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      email: (r.email as string) ?? '',
      name: (r.name as string) ?? '',
      role: (r.role as UserRole) ?? 'student',
      createdAt: (r.created_at as string) ?? '',
    }))
  }
  return readJson<(AuthUser & { _password?: string })[]>(USERS_KEY, []).map((u) => {
    const { _password, ...rest } = u
    return rest as AuthUser
  })
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return null
    return toAuthUser(data.user)
  }
  // mock
  const id = localStorage.getItem(SESSION_KEY)
  if (!id) return null
  const users = readJson<(AuthUser & { _password?: string })[]>(USERS_KEY, [])
  const found = users.find((u) => u.id === id)
  if (!found) return null
  const { _password, ...rest } = found as AuthUser & { _password?: string }
  return rest as AuthUser
}

export async function getSessionUserId(): Promise<string | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase.auth.getSession()
    return data.session?.user?.id ?? null
  }
  return localStorage.getItem(SESSION_KEY)
}

function toAuthUser(u: User): AuthUser {
  return {
    id: u.id,
    email: u.email ?? '',
    name: (u.user_metadata?.name as string) ?? u.email?.split('@')[0] ?? 'User',
    role: (u.user_metadata?.role as UserRole) ?? 'student',
    createdAt: u.created_at,
  }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return {
      userId: data.id,
      firstName: data.first_name ?? '',
      lastName: data.last_name ?? '',
      bio: data.bio ?? '',
      gpa: data.gpa ?? null,
      sat: data.sat ?? null,
      act: data.act ?? null,
      intendedMajor: data.intended_major ?? '',
      graduationYear: data.graduation_year ?? null,
      firstGen: data.first_gen ?? false,
      lowIncome: data.low_income ?? false,
      urm: data.urm ?? false,
      interests: data.interests ?? [],
      targetSchools: data.target_schools ?? [],
      location: data.location ?? '',
      avatarUrl: data.avatar_url ?? null,
    }
  }
  const profiles = readJson<Profile[]>(PROFILES_KEY, [])
  return profiles.find((p) => p.userId === userId) ?? null
}

export async function saveProfile(profile: Profile): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: profile.userId,
        email: (await supabase.auth.getUser()).data.user?.email ?? null,
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        first_name: profile.firstName,
        last_name: profile.lastName,
        bio: profile.bio,
        gpa: profile.gpa,
        sat: profile.sat,
        act: profile.act,
        intended_major: profile.intendedMajor,
        graduation_year: profile.graduationYear,
        first_gen: profile.firstGen,
        low_income: profile.lowIncome,
        urm: profile.urm,
        interests: profile.interests,
        target_schools: profile.targetSchools,
        location: profile.location,
        avatar_url: profile.avatarUrl,
        updated_at: new Date().toISOString(),
      })
    if (error) console.error('saveProfile error:', error.message)
    return
  }
  const profiles = readJson<Profile[]>(PROFILES_KEY, [])
  const idx = profiles.findIndex((p) => p.userId === profile.userId)
  if (idx >= 0) profiles[idx] = profile
  else profiles.push(profile)
  writeJson(PROFILES_KEY, profiles)
}

export async function signup(input: {
  name: string
  email: string
  password: string
  adminCode?: string
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const role: UserRole =
    input.adminCode && input.adminCode === 'GSP-ADMIN-2026' ? 'admin' : 'student'

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: { name: input.name.trim(), role },
      },
    })
    if (error) return { ok: false, error: error.message }
    if (!data.user) return { ok: false, error: 'Signup failed.' }
    const user = toAuthUser(data.user)
    // Ensure profile exists (trigger should have created it, but upsert to be safe)
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      first_name: input.name.split(' ')[0] ?? '',
      last_name: input.name.split(' ').slice(1).join(' '),
    })
    return { ok: true, user }
  }

  // mock
  const users = readJson<(AuthUser & { _password?: string })[]>(USERS_KEY, [])
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false, error: 'An account with that email already exists.' }
  }
  if (input.password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' }
  }
  const user: AuthUser = {
    id: uid(),
    email: input.email.trim(),
    name: input.name.trim(),
    role,
    createdAt: new Date().toISOString(),
  }
  writeJson(USERS_KEY, [...users, { ...user, _password: input.password }])
  await saveProfile({
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

export async function login(
  email: string,
  password: string,
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) return { ok: false, error: error.message }
    if (!data.user) return { ok: false, error: 'Login failed.' }
    return { ok: true, user: toAuthUser(data.user) }
  }
  const users = readJson<(AuthUser & { _password?: string })[]>(USERS_KEY, [])
  const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!found) return { ok: false, error: 'No account found with that email.' }
  if (found._password !== password) return { ok: false, error: 'Incorrect password.' }
  localStorage.setItem(SESSION_KEY, found.id)
  const { _password, ...rest } = found
  return { ok: true, user: rest as AuthUser }
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut()
    return
  }
  localStorage.removeItem(SESSION_KEY)
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase
      .from('profiles')
      .update({ name, first_name: name.split(' ')[0] ?? '', last_name: name.split(' ').slice(1).join(' ') })
      .eq('id', userId)
    await supabase.auth.updateUser({ data: { name } })
    return
  }
  const users = readJson<(AuthUser & { _password?: string })[]>(USERS_KEY, [])
  const idx = users.findIndex((u) => u.id === userId)
  if (idx >= 0) {
    users[idx].name = name
    writeJson(USERS_KEY, users)
  }
}
