import { createClient } from '@/lib/supabase/server'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { StatCard } from '@/components/ui/StatCard'
import { InvoiceStatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { DollarSign, TrendingUp, TrendingDown, FileText } from 'lucide-react'

export default async function AccountingPage() {
  const supabase = await createClient()

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: paidInvoices },
    { data: pendingInvoices },
    { data: stInvoices },
    { data: recentInvoices },
  ] = await Promise.all([
    supabase.from('invoices').select('total, paid_at').eq('status', 'paid').gte('paid_at', yearStart),
    supabase.from('invoices').select('total').in('status', ['pending', 'approved', 'overdue']),
    supabase.from('st_invoices').select('amount, status, subcontractor:subcontractors(company_name), project:projects(name)').in('status', ['pending', 'approved']),
    supabase.from('invoices').select('*, client:clients(first_name,last_name,company_name)').order('created_at', { ascending: false }).limit(20),
  ])

  const yearRevenue = paidInvoices?.reduce((s, i) => s + i.total, 0) ?? 0
  const monthRevenue = paidInvoices?.filter(i => i.paid_at && i.paid_at >= monthStart).reduce((s, i) => s + i.total, 0) ?? 0
  const pending = pendingInvoices?.reduce((s, i) => s + i.total, 0) ?? 0
  const stPending = stInvoices?.reduce((s, i) => s + i.amount, 0) ?? 0

  return (
    <>
      <AdminHeader title="Comptabilité" subtitle="Rapports financiers et flux de trésorerie" />
      <div className="hm-content">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Revenu ce mois" value={formatCurrency(monthRevenue)} icon={TrendingUp} color="success" />
          <StatCard label={`Revenu ${now.getFullYear()}`} value={formatCurrency(yearRevenue)} icon={DollarSign} color="info" />
          <StatCard label="À recevoir" value={formatCurrency(pending)} icon={FileText} color="warning" />
          <StatCard label="À payer (S/T)" value={formatCurrency(stPending)} icon={TrendingDown} color="danger" />
        </div>

        {/* Monthly chart placeholder */}
        <div className="hm-card mb-6">
          <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Revenus mensuels {now.getFullYear()}</h3>
          <div className="h-32 flex items-end gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const month = new Date(now.getFullYear(), i, 1).toISOString()
              const monthEnd = new Date(now.getFullYear(), i + 1, 0).toISOString()
              const total = paidInvoices?.filter(inv => inv.paid_at && inv.paid_at >= month && inv.paid_at <= monthEnd).reduce((s, inv) => s + inv.total, 0) ?? 0
              const max = Math.max(...Array.from({ length: 12 }, (_, j) => {
                const m = new Date(now.getFullYear(), j, 1).toISOString()
                const me = new Date(now.getFullYear(), j + 1, 0).toISOString()
                return paidInvoices?.filter(inv => inv.paid_at && inv.paid_at >= m && inv.paid_at <= me).reduce((s, inv) => s + inv.total, 0) ?? 0
              }), 1)
              const height = max > 0 ? Math.max(8, (total / max) * 100) : 8
              const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm transition-all" style={{
                    height: `${height}%`,
                    background: i === now.getMonth() ? 'rgb(var(--color-primary))' : 'rgb(var(--color-primary) / 0.3)',
                    minHeight: '4px',
                  }} />
                  <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{months[i]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ST invoices pending approval */}
        {stInvoices && stInvoices.length > 0 && (
          <div className="hm-card mb-6">
            <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
              {"Factures sous-traitants en attente d'approbation"}
            </h3>
            <div className="space-y-2">
              {stInvoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'rgb(var(--color-bg-secondary))' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {inv.subcontractor?.company_name}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{inv.project?.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                      {formatCurrency(inv.amount)}
                    </span>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All invoices */}
        <div className="hm-card">
          <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Toutes les factures</h3>
          <div className="overflow-x-auto">
            <table className="hm-table">
              <thead>
                <tr>
                  <th>Facture</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>TPS</th>
                  <th>TVQ</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices?.map((inv: any) => (
                  <tr key={inv.id}>
                    <td className="font-mono text-sm font-semibold" style={{ color: 'rgb(var(--color-primary))' }}>{inv.invoice_number}</td>
                    <td className="text-sm">{inv.client?.company_name ?? `${inv.client?.first_name} ${inv.client?.last_name}`}</td>
                    <td className="text-xs">{formatDate(inv.issue_date)}</td>
                    <td className="font-semibold">{formatCurrency(inv.total)}</td>
                    <td className="text-xs">{formatCurrency(inv.tax_gst)}</td>
                    <td className="text-xs">{formatCurrency(inv.tax_qst)}</td>
                    <td><InvoiceStatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
