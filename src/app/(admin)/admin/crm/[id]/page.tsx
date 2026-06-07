import { createClient } from '@/lib/supabase/server'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { InvoiceStatusBadge, ProjectStatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Phone, Mail, MapPin, Building2, User, Calendar,
  FileText, HardHat, ArrowLeft, ExternalLink,
} from 'lucide-react'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: client },
    { data: projects },
    { data: invoices },
    { data: quotes },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('projects').select('id, project_number, name, status, contract_value, start_date, end_date').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('id, invoice_number, total, status, issue_date, due_date').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('quotes').select('id, quote_number, total, status, issue_date').eq('client_id', id).order('created_at', { ascending: false }),
  ])

  if (!client) notFound()

  const clientName = client.company_name || `${client.first_name} ${client.last_name}`
  const typeLabel: Record<string, string> = { residential: 'Résidentiel', commercial: 'Commercial', industrial: 'Industriel' }
  const leadLabel: Record<string, string> = { new: 'Nouveau', contacted: 'Contacté', qualified: 'Qualifié', converted: 'Converti', lost: 'Perdu' }
  const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0) ?? 0

  return (
    <>
      <AdminHeader
        title={clientName}
        subtitle={`${typeLabel[client.client_type] ?? ''} • ${leadLabel[client.lead_status ?? 'new'] ?? ''}`}
      />
      <div className="hm-content">
        <Link href="/admin/crm" className="inline-flex items-center gap-1.5 text-sm mb-5 hover:opacity-80 transition-opacity"
          style={{ color: 'rgb(var(--color-text-muted))' }}>
          <ArrowLeft className="w-4 h-4" /> Retour au CRM
        </Link>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left — contact info */}
          <div className="space-y-4">
            {/* Identity */}
            <div className="hm-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))' }}>
                  {clientName[0]}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{clientName}</p>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{typeLabel[client.client_type]}</p>
                </div>
              </div>

              <div className="space-y-3">
                {client.company_name && (client.first_name || client.last_name) && (
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary))' }} />
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {client.first_name} {client.last_name}
                    </p>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary))' }} />
                    <a href={`mailto:${client.email}`} className="text-sm hover:underline"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}>{client.email}</a>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary))' }} />
                    <a href={`tel:${client.phone}`} className="text-sm hover:underline"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}>{formatPhone(client.phone)}</a>
                  </div>
                )}
                {client.phone_alt && (
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{formatPhone(client.phone_alt)} (alt.)</p>
                  </div>
                )}
                {(client.address || client.city) && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary))' }} />
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {[client.address, client.city, client.province, client.postal_code].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                {client.lead_source && (
                  <div className="flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary))' }} />
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>Source: {client.lead_source}</p>
                  </div>
                )}
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary))' }} />
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Client depuis {formatDate(client.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Revenue summary */}
            <div className="hm-card">
              <h3 className="font-semibold mb-3 text-sm" style={{ color: 'rgb(var(--color-text))' }}>Résumé financier</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>Revenu encaissé</span>
                  <span className="font-semibold" style={{ color: 'rgb(var(--color-success))' }}>{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>Chantiers</span>
                  <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{projects?.length ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>Factures</span>
                  <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{invoices?.length ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>Devis</span>
                  <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{quotes?.length ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="hm-card">
                <h3 className="font-semibold mb-2 text-sm" style={{ color: 'rgb(var(--color-text))' }}>Notes</h3>
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgb(var(--color-text-secondary))' }}>{client.notes}</p>
              </div>
            )}
          </div>

          {/* Right — activity */}
          <div className="lg:col-span-2 space-y-4">
            {/* Projects */}
            <div className="hm-card">
              <div className="flex items-center gap-2 mb-4">
                <HardHat className="w-4 h-4" style={{ color: 'rgb(var(--color-primary))' }} />
                <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  Chantiers ({projects?.length ?? 0})
                </h3>
              </div>
              {!projects?.length ? (
                <p className="text-sm py-4 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>Aucun chantier</p>
              ) : (
                <div className="space-y-2">
                  {projects.map(p => (
                    <Link key={p.id} href={`/admin/projects/${p.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ background: 'rgb(var(--color-bg-secondary))' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                          {p.name}
                          <span className="ml-2 text-xs font-mono" style={{ color: 'rgb(var(--color-text-muted))' }}>#{p.project_number}</span>
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {p.start_date ? formatDate(p.start_date) : '—'}
                          {p.contract_value ? ` • ${formatCurrency(p.contract_value)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProjectStatusBadge status={p.status as any} />
                        <ExternalLink className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices */}
            <div className="hm-card">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4" style={{ color: 'rgb(var(--color-primary))' }} />
                <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  Factures ({invoices?.length ?? 0})
                </h3>
              </div>
              {!invoices?.length ? (
                <p className="text-sm py-4 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>Aucune facture</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="hm-table">
                    <thead>
                      <tr>
                        <th>Numéro</th>
                        <th>Date</th>
                        <th>Échéance</th>
                        <th>Montant</th>
                        <th>Statut</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => (
                        <tr key={inv.id}>
                          <td className="font-mono text-sm font-semibold" style={{ color: 'rgb(var(--color-primary))' }}>{inv.invoice_number}</td>
                          <td className="text-xs">{formatDate(inv.issue_date)}</td>
                          <td className="text-xs">{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                          <td className="font-semibold">{formatCurrency(inv.total)}</td>
                          <td><InvoiceStatusBadge status={inv.status as any} /></td>
                          <td>
                            <Link href={`/admin/billing/${inv.id}`}
                              className="text-xs hover:underline" style={{ color: 'rgb(var(--color-primary))' }}>
                              Voir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quotes */}
            {quotes && quotes.length > 0 && (
              <div className="hm-card">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
                  <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    Devis ({quotes.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="hm-table">
                    <thead>
                      <tr><th>Numéro</th><th>Date</th><th>Montant</th><th>Statut</th><th></th></tr>
                    </thead>
                    <tbody>
                      {quotes.map(q => (
                        <tr key={q.id}>
                          <td className="font-mono text-sm font-semibold" style={{ color: 'rgb(var(--color-warning))' }}>{q.quote_number}</td>
                          <td className="text-xs">{formatDate(q.issue_date)}</td>
                          <td className="font-semibold">{formatCurrency(q.total)}</td>
                          <td><InvoiceStatusBadge status={q.status as any} /></td>
                          <td>
                            <Link href={`/admin/billing/quotes/${q.id}`}
                              className="text-xs hover:underline" style={{ color: 'rgb(var(--color-warning))' }}>
                              Voir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
