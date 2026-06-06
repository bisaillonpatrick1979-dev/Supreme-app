'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Employee, UserRole } from '@/types/database'

interface AuthUser {
  supabaseUser: User
  role: UserRole
  employee?: Employee
}

interface AuthContextType {
  authUser: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  authUser: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadUser = async (user: User | null) => {
      if (!user) {
        setAuthUser(null)
        setLoading(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      const role: UserRole = userData?.role ?? 'employee'

      let employee: Employee | undefined
      if (role === 'employee') {
        const { data } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', user.id)
          .single()
        employee = data ?? undefined
      }

      setAuthUser({ supabaseUser: user, role, employee })
      setLoading(false)
    }

    supabase.auth.getUser().then(({ data: { user } }) => loadUser(user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setAuthUser(null)
  }

  return (
    <AuthContext.Provider value={{ authUser, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
