import { createClient } from '@/lib/supabase/server'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { formatCurrency, formatHours } from '@/lib/utils/format'
import { TrendingUp, Users, HardHat, Clock } from 'lucide-react'

export default async function StatsPage() {
  const supabase = await createClient()
  const now = new Date()

  const [
    { data: projects },
    { data: employees },
    { data: invoices },
    { data: workSessions },
    { data: clients },
  ] = await Promise.all([
    supabase.from('projects').select('status, contract_value, estimated_value, created_at'),
    supabase.from('employees').select('employee_type, is_active, hourly_rate, salary_annual'),
    supabase.from('invoices').select('total, status, created_at'),
    supabase.from('work_sessions').select('hours_total, hours_overtime, gross_pay, employee_id, date'),
    supabase.from('clients').select('lead_status, client_type, created_at'),
  ])

  // Project stats
  const projectsByStatus = ['lead','quoted','contracted','in_progress','completed','cancelled'].map(s => ({
    status: s,
    count: projects?.filter(p => p.status === s).length ?? 0,
    value: projects?.filter(p => p.status === s).reduce((sum, p) => sum + (p.contract_value ?? p.estimated_value ?? 0), 0) ?? 0,
  }))

  // Revenue stats
  const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0) ?? 0
  const avgInvoice = invoices?.length ? (invoices.reduce((s, i) => s + i.total, 0) / invoices.length) : 0

  // Payroll stats
  const totalHours = workSessions?.reduce((s, ws) => s + ws.hours_total, 0) ?? 0
  const totalOT = workSessions?.reduce((s, ws) => s + ws.hours_overtime, 0) ?? 0
  const totalPayroll = workSessions?.reduce((s, ws) => s + ws.gross_pay, 0) ?? 0

  // Client conversion
  const convertedClients = clients?.filter(c => c.lead_status === 'converted').length ?? 0
  const totalLeads = clients?.length ?? 0
  const conversionRate = totalLeads > 0 ? ((convertedClients / totalLeads) * 100).toFixed(1) : '0'

  const statGroups = [
    {
      title: 'Revenus', color: 'rgb(var(--color-success))',
      stats: [
        { label: 'Revenus encaissés', value: formatCurrency(totalRevenue) },
        { label: 'Factures moyennes', value: formatCurrency(avgInvoice) },
        { label: 'Factures totales', value: invoices?.length ?? 0 },
        { label: 'Factures payées', value: invoices?.filter(i => i.status === 'paid').length ?? 0 },
      ]
    },
    {
      title: 'Chantiers', color: 'rgb(var(--color-primary))',
      stats: [
        { label: 'Total projets', value: projects?.length ?? 0 },
        { label: 'En cours', value: projects?.filter(p => p.status === 'in_progress').length ?? 0 },
        { label: 'Complétés', value: projects?.filter(p => p.status === 'completed').length ?? 0 },
        { label: 'Valeur contractuelle totale', value: formatCurrency(projects?.filter(p => p.contract_value).reduce((s, p) => s + (p.contract_value ?? 0), 0) ?? 0) },
      ]
    },
    {
      title: 'Main d\'œuvre', color: 'rgb(var(--color-info))',
      stats: [
        { label: 'Heures travaillées (total)', value: formatHours(totalHours) },
        { label: 'Heures supplémentaires', value: formatHours(totalOT) },
        { label: 'Masse salariale brute', value: formatCurrency(totalPayroll) },
        { label: '% heures supplémentaires', value: totalHours > 0 ? `${((totalOT / totalHours) * 100).toFixed(1)}%` : '0%' },
      ]
    },
    {
      title: 'CRM', color: 'rgb(var(--color-warning))',
      stats: [
        { label: 'Total leads/clients', value: totalLeads },
        { label: 'Taux de conversion', value: `${conversionRate}%` },
        { label: 'Clients convertis', value: convertedClients },
        { label: 'Leads actifs', value: clients?.filter(c => ['new','contacted','qualified'].includes(c.lead_status ?? '')).length ?? 0 },
      ]
    },
  ]

  return (
    <>
      <AdminHeader title="Statistiques" subtitle="Analytiques et KPIs de Hailite Xteriors" />
      <div className="hm-content">
        {/* Stat groups */}
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          {statGroups.map(group => (
            <div key={group.title} className="hm-card">
              <h3 className="font-semibold mb-4" style={{ color: group.color }}>{group.title}</h3>
              <div className="grid grid-cols-2 gap-4">
                {group.stats.map(s => (
                  <div key={s.label}>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{s.label}</p>
                    <p className="text-xl font-bold mt-1" style={{ color: 'rgb(var(--color-text))' }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Project pipeline */}
        <div className="hm-card">
          <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Pipeline des chantiers</h3>
          <div className="space-y-3">
            {projectsByStatus.filter(s => s.count > 0).map(s => {
              const maxCount = Math.max(...projectsByStatus.map(ps => ps.count), 1)
              const labels: Record<string, string> = {
                lead: 'Leads', quoted: 'Soumis', contracted: 'Contractés',
                in_progress: 'En cours', completed: 'Complétés', cancelled: 'Annulés',
              }
              return (
                <div key={s.status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>{labels[s.status]}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{s.count} projets</span>
                      {s.value > 0 && (
                        <span className="text-xs font-semibold" style={{ color: 'rgb(var(--color-success))' }}>
                          {formatCurrency(s.value)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: 'rgb(var(--color-bg-elevated))' }}>
                    <div className="h-2 rounded-full transition-all" style={{
                      width: `${(s.count / maxCount) * 100}%`,
                      background: s.status === 'completed' ? 'rgb(var(--color-success))'
                        : s.status === 'in_progress' ? 'rgb(var(--color-primary))'
                        : s.status === 'cancelled' ? 'rgb(var(--color-danger))'
                        : 'rgb(var(--color-warning))',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
