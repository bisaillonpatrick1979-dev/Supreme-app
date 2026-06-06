import { createClient } from '@/lib/supabase/server'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { Users, HardHat, FileText, DollarSign, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { ProjectStatusBadge, InvoiceStatusBadge } from '@/components/ui/Badge'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [
    { count: clientCount },
    { count: projectCount },
    { count: employeeCount },
    { data: activeProjects },
    { data: recentInvoices },
    { data: pendingSTInvoices },
    { data: todayPunches },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).neq('status', 'cancelled'),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('projects').select('*, client:clients(first_name,last_name,company_name)')
      .in('status', ['in_progress', 'contracted']).limit(5),
    supabase.from('invoices').select('*, client:clients(first_name,last_name,company_name)')
      .in('status', ['pending', 'overdue']).order('issue_date', { ascending: false }).limit(5),
    supabase.from('st_invoices').select('*, subcontractor:subcontractors(company_name)')
      .eq('status', 'pending').limit(5),
    supabase.from('punch_records').select('*, employee:employees(first_name,last_name)')
      .eq('punch_type', 'in')
      .gte('punched_at', new Date().toISOString().split('T')[0])
      .limit(10),
  ])

  // Revenue stats
  const { data: paidInvoices } = await supabase
    .from('invoices')
    .select('total')
    .eq('status', 'paid')
    .gte('paid_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  const monthRevenue = paidInvoices?.reduce((s, i) => s + i.total, 0) ?? 0

  const { data: pendingInvoices } = await supabase
    .from('invoices')
    .select('total')
    .in('status', ['pending', 'approved'])

  const pendingRevenue = pendingInvoices?.reduce((s, i) => s + i.total, 0) ?? 0

  return (
    <>
      <AdminHeader title="Dashboard" subtitle="Vue d'ensemble de Hailite Xteriors" />
      <div className="hm-content">
        {/* KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Clients actifs" value={clientCount ?? 0} icon={Users} color="info" />
          <StatCard label="Chantiers actifs" value={projectCount ?? 0} icon={HardHat} color="primary" />
          <StatCard label="Employés actifs" value={employeeCount ?? 0} icon={Users} color="success" />
          <StatCard label="Revenu ce mois" value={formatCurrency(monthRevenue)} icon={DollarSign} color="success" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard label="Facturation en attente" value={formatCurrency(pendingRevenue)} icon={Clock} color="warning" />
          <StatCard label="Sous-traitants à payer" value={pendingSTInvoices?.length ?? 0} icon={AlertTriangle} color="danger" />
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Active projects */}
          <div className="lg:col-span-2 hm-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Chantiers Actifs</h3>
              <Link href="/admin/projects" className="text-xs" style={{ color: 'rgb(var(--color-primary))' }}>
                Voir tout →
              </Link>
            </div>
            <div className="space-y-2">
              {activeProjects?.map(p => (
                <Link key={p.id} href={`/admin/projects/${p.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ background: 'rgb(var(--color-bg-secondary))' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{p.name}</p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {p.client?.company_name ?? `${p.client?.first_name} ${p.client?.last_name}`} • {p.city}
                    </p>
                  </div>
                  <ProjectStatusBadge status={p.status} />
                </Link>
              ))}
              {!activeProjects?.length && (
                <p className="text-sm text-center py-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Aucun chantier actif
                </p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Invoices */}
            <div className="hm-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>Factures en attente</h3>
                <Link href="/admin/billing" className="text-xs" style={{ color: 'rgb(var(--color-primary))' }}>
                  Voir →
                </Link>
              </div>
              <div className="space-y-2">
                {recentInvoices?.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p style={{ color: 'rgb(var(--color-text))' }}>{inv.invoice_number}</p>
                      <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {inv.client?.company_name ?? `${inv.client?.first_name} ${inv.client?.last_name}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                        {formatCurrency(inv.total)}
                      </p>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
                {!recentInvoices?.length && (
                  <p className="text-xs text-center py-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Aucune facture en attente
                  </p>
                )}
              </div>
            </div>

            {/* Today punches */}
            <div className="hm-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  {"Pointages d'aujourd'hui"}
                </h3>
                <span className="hm-badge hm-badge-success">
                  {todayPunches?.length ?? 0} actifs
                </span>
              </div>
              <div className="space-y-1.5">
                {todayPunches?.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full status-dot status-dot-active" />
                    <span style={{ color: 'rgb(var(--color-text))' }}>
                      {p.employee?.first_name} {p.employee?.last_name}
                    </span>
                  </div>
                ))}
                {!todayPunches?.length && (
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {"Aucun pointage aujourd'hui"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
