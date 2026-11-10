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

interface AuthContextValue {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  login: (email: string, password: string) => { ok: boolean; error?: string }
  signup: (input: { name: string; email: string; password: string; adminCode?: string }) => { ok: boolean; error?: string }
  logout: () => void
  refreshProfile: () => void
  updateProfile: (profile: Profile) => void
  updateName: (name: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    const u = getCurrentUser()
    setUser(u)
    setProfile(u ? getProfile(u.id) : null)
  }, [])

  useEffect(() => {
    refresh()
    setLoading(false)
  }, [refresh])

  const login = useCallback(
    (email: string, password: string) => {
      const res = authLogin(email, password)
      if (res.ok) {
        refresh()
        return { ok: true }
      }
      return { ok: false, error: res.error }
    },
    [refresh],
  )

  const signup = useCallback(
    (input: { name: string; email: string; password: string; adminCode?: string }) => {
      const res = authSignup(input)
      if (res.ok) {
        refresh()
        return { ok: true }
      }
      return { ok: false, error: res.error }
    },
    [refresh],
  )

  const logout = useCallback(() => {
    authLogout()
    setUser(null)
    setProfile(null)
  }, [])

  const updateProfile = useCallback(
    (p: Profile) => {
      authSaveProfile(p)
      setProfile(p)
    },
    [],
  )

  const updateName = useCallback(
    (name: string) => {
      if (user) {
        updateUserName(user.id, name)
        refresh()
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
