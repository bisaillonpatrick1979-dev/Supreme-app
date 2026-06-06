'use client'

import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { getInitials } from '@/lib/utils/format'

interface AdminHeaderProps {
  title: string
  subtitle?: string
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const { authUser } = useAuth()

  const initials = authUser?.employee
    ? getInitials(authUser.employee.first_name, authUser.employee.last_name)
    : 'AD'

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b shrink-0"
      style={{
        borderColor: 'rgb(var(--color-border))',
        backgroundColor: 'rgb(var(--color-bg-card))',
      }}>
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <input placeholder="Recherche rapide..." className="hm-input pl-9 w-64 text-sm" />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ backgroundColor: 'rgb(var(--color-danger))' }} />
        </Button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))' }}>
          {initials}
        </div>
      </div>
    </header>
  )
}
