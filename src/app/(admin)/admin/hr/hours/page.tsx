'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { CheckCircle, Clock, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate, formatHours, getInitials } from '@/lib/utils/format'
import type { WorkSession, Employee } from '@/types/database'

interface SessionWithEmployee extends WorkSession {
  employee: Employee
}

export default function HoursAdminPage() {
  const [sessions, setSessions] = useState<SessionWithEmployee[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterApproved, setFilterApproved] = useState<'all' | 'pending' | 'approved'>('all')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const supabase = createClient()

  useEffect(() => { loadData() }, [filterEmployee, dateFrom, dateTo])

  const loadData = async () => {
    setLoading(true)
    let query = supabase
      .from('work_sessions')
      .select('*, employee:employees(*)')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false })

    if (filterEmployee) query = query.eq('employee_id', filterEmployee)

    const [{ data: sess }, { data: emps }] = await Promise.all([
      query,
      supabase.from('employees').select('*').eq('is_active', true),
    ])
    setSessions((sess ?? []) as SessionWithEmployee[])
    setEmployees(emps ?? [])
    setLoading(false)
  }

  const approveSession = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('work_sessions').update({
      is_approved: true, approved_by: user?.id, approved_at: new Date().toISOString(),
    }).eq('id', id)
    if (!error) { toast.success('Session approuvée'); loadData() }
  }

  const approveAll = async () => {
    const pending = sessions.filter(s => !s.is_approved)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('work_sessions').update({
      is_approved: true, approved_by: user?.id, approved_at: new Date().toISOString(),
    }).in('id', pending.map(s => s.id))
    if (!error) { toast.success(`${pending.length} sessions approuvées!`); loadData() }
  }

  const filtered = sessions.filter(s => {
    if (filterApproved === 'pending') return !s.is_approved
    if (filterApproved === 'approved') return s.is_approved
    return true
  })

  // Summary stats
  const totalHours = filtered.reduce((s, ws) => s + ws.hours_total, 0)
  const totalOT = filtered.reduce((s, ws) => s + ws.hours_overtime, 0)
  const totalPay = filtered.reduce((s, ws) => s + ws.gross_pay, 0)
  const pendingCount = filtered.filter(s => !s.is_approved).length

  const columns = [
    { key: 'employee', header: 'Employé', render: (s: SessionWithEmployee) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))' }}>
          {getInitials(s.employee?.first_name ?? '?', s.employee?.last_name ?? '?')}
        </div>
        <span className="text-sm font-medium">{s.employee?.first_name} {s.employee?.last_name}</span>
      </div>
    )},
    { key: 'date', header: 'Date', render: (s: WorkSession) => <span className="text-sm">{formatDate(s.date)}</span>, sortable: true },
    { key: 'hours_regular', header: 'Reg.', render: (s: WorkSession) => <span className="text-sm">{formatHours(s.hours_regular)}</span> },
    { key: 'hours_overtime', header: 'Supp.', render: (s: WorkSession) => (
      <span className="text-sm" style={{ color: s.hours_overtime > 0 ? 'rgb(var(--color-warning))' : 'rgb(var(--color-text-muted))' }}>
        {s.hours_overtime > 0 ? formatHours(s.hours_overtime) : '—'}
      </span>
    )},
    { key: 'hours_total', header: 'Total', render: (s: WorkSession) => <span className="text-sm font-semibold">{formatHours(s.hours_total)}</span> },
    { key: 'gross_pay', header: 'Brut', render: (s: WorkSession) => (
      <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-success))' }}>{formatCurrency(s.gross_pay)}</span>
    )},
    { key: 'status', header: 'Statut', render: (s: WorkSession) => (
      <Badge variant={s.is_approved ? 'success' : 'warning'}>{s.is_approved ? 'Approuvé' : 'En attente'}</Badge>
    )},
    { key: 'actions', header: '', render: (s: WorkSession) => (
      !s.is_approved ? (
        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); approveSession(s.id) }}>
          <CheckCircle className="w-3 h-3" /> Approuver
        </Button>
      ) : null
    )},
  ]

  return (
    <>
      <AdminHeader title="Heures de travail" subtitle="Approbation des sessions d'employés" />
      <div className="hm-content">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="hm-card">
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Heures totales</p>
            <p className="text-2xl font-bold mt-1">{formatHours(totalHours)}</p>
          </div>
          <div className="hm-card">
            <p className="text-xs" style={{ color: 'rgb(var(--color-warning))' }}>Heures supp.</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'rgb(var(--color-warning))' }}>{formatHours(totalOT)}</p>
          </div>
          <div className="hm-card">
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Masse salariale brute</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'rgb(var(--color-success))' }}>{formatCurrency(totalPay)}</p>
          </div>
          <div className="hm-card">
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>En attente d&apos;approbation</p>
            <p className="text-2xl font-bold mt-1" style={{ color: pendingCount > 0 ? 'rgb(var(--color-warning))' : 'rgb(var(--color-success))' }}>
              {pendingCount}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="hm-card mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>Filtres</span>
            </div>
            <input type="date" className="hm-input" style={{ width: '160px' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>→</span>
            <input type="date" className="hm-input" style={{ width: '160px' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <select className="hm-select" style={{ width: '200px' }} value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
              <option value="">Tous les employés</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgb(var(--color-bg-secondary))' }}>
              {(['all', 'pending', 'approved'] as const).map(f => (
                <button key={f} onClick={() => setFilterApproved(f)}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                  style={{
                    background: filterApproved === f ? 'rgb(var(--color-bg-card))' : 'transparent',
                    color: filterApproved === f ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
                  }}>
                  {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : 'Approuvés'}
                </button>
              ))}
            </div>
            {pendingCount > 0 && (
              <Button size="sm" onClick={approveAll}>
                <CheckCircle className="w-3 h-3" /> Approuver tout ({pendingCount})
              </Button>
            )}
          </div>
        </div>

        <div className="hm-card">
          <DataTable
            data={filtered as unknown as Record<string, unknown>[]}
            columns={columns as any}
            loading={loading}
            emptyMessage="Aucune session pour cette période"
          />
        </div>
      </div>
    </>
  )
}
