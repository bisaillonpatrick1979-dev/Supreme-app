'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Clock, Calendar, DollarSign, User,
  LogOut, Sun, Moon, ChevronRight
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { cn, getInitials } from '@/lib/utils/format'

const navItems = [
  { href: '/employee/dashboard', icon: LayoutDashboard, label: 'Mon Dashboard' },
  { href: '/employee/punch', icon: Clock, label: 'Pointer' },
  { href: '/employee/calendar', icon: Calendar, label: 'Mon Calendrier' },
  { href: '/employee/payroll', icon: DollarSign, label: 'Ma Paye' },
  { href: '/employee/profile', icon: User, label: 'Mon Profil' },
]

export function EmployeeSidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { signOut, authUser } = useAuth()

  const employee = authUser?.employee
  const initials = employee ? getInitials(employee.first_name, employee.last_name) : '??'
  const fullName = employee ? `${employee.first_name} ${employee.last_name}` : 'Employé'

  return (
    <aside className="hm-sidebar">
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: 'rgb(var(--color-sidebar-border))' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))', color: 'white' }}>
            HX
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'rgb(var(--color-text))' }}>HailiteManager</p>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Portail Employé</p>
          </div>
        </div>
      </div>

      {/* Employee profile mini */}
      <div className="p-4 border-b" style={{ borderColor: 'rgb(var(--color-sidebar-border))' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>{fullName}</p>
            <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {employee?.employee_type === 'salaried' ? 'Salarié' : 'Horaire'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('hm-nav-item', active && 'hm-nav-item-active')}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t space-y-0.5" style={{ borderColor: 'rgb(var(--color-sidebar-border))' }}>
        <button className="hm-nav-item w-full" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === 'dark' ? 'Thème clair' : 'Thème sombre'}</span>
        </button>
        <button className="hm-nav-item w-full" onClick={() => signOut()}>
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
