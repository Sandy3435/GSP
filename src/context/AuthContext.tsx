import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  getCurrentUser,
  getProfile,
  logout as authLogout,
  login as authLogin,
  signup as authSignup,
  saveProfile as authSaveProfile,
  updateUserName,
} from '../lib/auth'
import type { AuthUser, Profile } from '../lib/auth'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signup: (input: { name: string; email: string; password: string; adminCode?: string }) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (profile: Profile) => void
  updateName: (name: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const u = await getCurrentUser()
    setUser(u)
    if (u) {
      let p = await getProfile(u.id)
      if (!p) {
        // Create a default profile if missing (e.g., trigger didn't fire)
        const defaultProfile: Profile = {
          userId: u.id,
          firstName: u.name.split(' ')[0] ?? '',
          lastName: u.name.split(' ').slice(1).join(' '),
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
        }
        await authSaveProfile(defaultProfile)
        p = defaultProfile
      }
      setProfile(p)
    } else {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh()
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authLogin(email, password)
      if (res.ok) {
        await refresh()
        return { ok: true }
      }
      return { ok: false, error: res.error }
    },
    [refresh],
  )

  const signup = useCallback(
    async (input: { name: string; email: string; password: string; adminCode?: string }) => {
      const res = await authSignup(input)
      if (res.ok) {
        await refresh()
        return { ok: true }
      }
      return { ok: false, error: res.error }
    },
    [refresh],
  )

  const logout = useCallback(async () => {
    await authLogout()
    setUser(null)
    setProfile(null)
  }, [])

  const updateProfile = useCallback(
    (p: Profile) => {
      authSaveProfile(p).then(() => setProfile(p))
    },
    [],
  )

  const updateName = useCallback(
    (name: string) => {
      if (user) {
        updateUserName(user.id, name).then(() => refresh())
      }
    },
    [user, refresh],
  )

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    login,
    signup,
    logout,
    refreshProfile: refresh,
    updateProfile,
    updateName,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
