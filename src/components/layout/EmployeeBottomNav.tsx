'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Clock, Calendar, DollarSign, User } from 'lucide-react'
import { cn } from '@/lib/utils/format'

const items = [
  { href: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/employee/calendar', icon: Calendar, label: 'Calendrier' },
  { href: '/employee/punch', icon: Clock, label: 'Pointer', primary: true },
  { href: '/employee/payroll', icon: DollarSign, label: 'Paye' },
  { href: '/employee/profile', icon: User, label: 'Profil' },
]

export function EmployeeBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="employee-bottom-nav md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'rgb(var(--color-bg-card))',
        borderTop: '1px solid rgb(var(--color-border))',
        display: 'flex',
        height: '64px',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
      {items.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-opacity"
            style={{ color: active ? 'rgb(var(--color-primary))' : 'rgb(var(--color-text-muted))' }}
          >
            {item.primary ? (
              <div className="w-12 h-12 -mt-6 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))' }}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
            ) : (
              <item.icon className="w-5 h-5" />
            )}
            {!item.primary && (
              <span className="text-xs font-medium">{item.label}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
