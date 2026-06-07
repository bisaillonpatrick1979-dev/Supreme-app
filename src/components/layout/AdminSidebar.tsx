'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, HardHat, UserCog,
  BarChart3, Package, Boxes, LogOut, Sun, Moon,
  ChevronRight, ClipboardList, Clock, Settings, Bell, Wrench
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils/format'

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/crm', icon: Users, label: 'CRM Clients' },
  {
    href: '/admin/billing', icon: FileText, label: 'Facturation',
    children: [
      { href: '/admin/billing/quotes', icon: ClipboardList, label: 'Devis' },
    ],
  },
  { href: '/admin/projects', icon: HardHat, label: 'Chantiers' },
  {
    href: '/admin/hr', icon: UserCog, label: 'Ressources Humaines',
    children: [
      { href: '/admin/hr/hours', icon: Clock, label: 'Heures' },
      { href: '/admin/hr/notifications', icon: Bell, label: 'Notifications' },
    ],
  },
  { href: '/admin/subcontractors', icon: Wrench, label: 'Sous-traitants' },
  { href: '/admin/accounting', icon: BarChart3, label: 'Comptabilité' },
  { href: '/admin/catalog', icon: Package, label: 'Catalogue' },
  { href: '/admin/inventory', icon: Boxes, label: 'Inventaire' },
  { href: '/admin/stats', icon: BarChart3, label: 'Statistiques' },
  { href: '/admin/settings', icon: Settings, label: 'Paramètres' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { signOut } = useAuth()

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
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Administration</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn('hm-nav-item', active && 'hm-nav-item-active')}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-50" />}
              </Link>
              {active && item.children?.map(child => {
                const childActive = pathname === child.href || pathname.startsWith(child.href + '/')
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn('hm-nav-item pl-9', childActive && 'hm-nav-item-active')}
                  >
                    <child.icon className="w-3 h-3 shrink-0" />
                    <span className="flex-1 text-xs">{child.label}</span>
                  </Link>
                )
              })}
            </div>
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
