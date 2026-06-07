'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Users, HardHat, FileText, ClipboardList } from 'lucide-react'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { useAuth } from '@/context/AuthContext'
import { getInitials } from '@/lib/utils/format'
import { useRouter } from 'next/navigation'

interface SearchResult {
  type: 'client' | 'project' | 'invoice' | 'quote'
  id: string
  label: string
  subtitle: string
  href: string
}

const typeIcon: Record<string, React.ElementType> = {
  client: Users,
  project: HardHat,
  invoice: FileText,
  quote: ClipboardList,
}

const typeLabel: Record<string, string> = {
  client: 'Client',
  project: 'Chantier',
  invoice: 'Facture',
  quote: 'Devis',
}

interface AdminHeaderProps {
  title: string
  subtitle?: string
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const { authUser } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const initials = authUser?.employee
    ? getInitials(authUser.employee.first_name, authUser.employee.last_name)
    : 'AD'

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const { results: r } = await res.json()
        setResults(r ?? [])
        setOpen(true)
      } finally {
        setSearching(false)
      }
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = useCallback((href: string) => {
    setQuery('')
    setResults([])
    setOpen(false)
    router.push(href)
  }, [router])

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
        <div ref={searchRef} className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'rgb(var(--color-text-muted))' }} />
          <input
            placeholder="Recherche rapide…"
            className="hm-input pl-9 w-64 text-sm"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgb(var(--color-primary))' }} />
          )}

          {/* Dropdown */}
          {open && results.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 w-80 rounded-xl overflow-hidden z-50 shadow-xl"
              style={{
                background: 'rgb(var(--color-bg-elevated))',
                border: '1px solid rgb(var(--color-border))',
              }}>
              {results.map(r => {
                const Icon = typeIcon[r.type]
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-80 transition-opacity border-b"
                    style={{ borderColor: 'rgb(var(--color-border-subtle))' }}
                    onClick={() => handleSelect(r.href)}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'rgb(var(--color-primary-muted))' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-primary))' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                        {r.label}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {typeLabel[r.type]} • {r.subtitle}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {open && query.length >= 2 && results.length === 0 && !searching && (
            <div className="absolute top-full mt-1.5 left-0 w-64 rounded-xl z-50 shadow-xl"
              style={{
                background: 'rgb(var(--color-bg-elevated))',
                border: '1px solid rgb(var(--color-border))',
              }}>
              <p className="text-sm text-center py-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Aucun résultat pour «&nbsp;{query}&nbsp;»
              </p>
            </div>
          )}
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))' }}>
          {initials}
        </div>
      </div>
    </header>
  )
}
