'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { InvoiceStatusBadge } from '@/components/ui/Badge'
import { ArrowLeft, Printer, Download, ExternalLink, CheckCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import Link from 'next/link'
import type { Invoice, InvoiceLineItem } from '@/types/database'

interface FullInvoice extends Omit<Invoice, 'client' | 'project' | 'line_items'> {
  line_items: InvoiceLineItem[]
  client: NonNullable<Invoice['client']>
  project: NonNullable<Invoice['project']> | undefined
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<FullInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [creatingLink, setCreatingLink] = useState(false)
  const supabase = createClient()

  const loadInvoice = useCallback(async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*, line_items:invoice_line_items(*), client:clients(*), project:projects(name,address,city)')
      .eq('id', id)
      .single()
    setInvoice(data as FullInvoice)
    setLoading(false)
  }, [id, supabase])

  useEffect(() => { loadInvoice() }, [loadInvoice])

  const handleApprove = async () => {
    setApproving(true)
    const { error } = await supabase.from('invoices').update({ status: 'approved' }).eq('id', id)
    if (!error) { toast.success('Facture approuvée'); loadInvoice() }
    setApproving(false)
  }

  const handleCreateStripeLink = async () => {
    setCreatingLink(true)
    const res = await fetch('/api/stripe/payment-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_id: id }),
    })
    if (res.ok) {
      const { payment_link } = await res.json()
      toast.success('Lien de paiement créé!')
      window.open(payment_link, '_blank')
      loadInvoice()
    } else {
      toast.error('Erreur création lien Stripe')
    }
    setCreatingLink(false)
  }

  const handleDownloadPDF = async () => {
    if (!invoice) return
    const { generatePDF } = await import('@/lib/pdf/generate')
    generatePDF({
      type: 'invoice',
      number: invoice.invoice_number,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      client: {
        name: invoice.client.company_name ?? `${invoice.client.first_name} ${invoice.client.last_name}`,
        address: invoice.client.address,
        city: invoice.client.city,
        province: invoice.client.province,
        email: invoice.client.email,
        phone: invoice.client.phone,
      },
      project: invoice.project?.name ?? null,
      items: (invoice.line_items ?? []).map(li => ({
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unit_price: li.unit_price,
        total: li.total,
      })),
      subtotal: invoice.subtotal,
      tax_gst: invoice.tax_gst,
      tax_qst: invoice.tax_qst,
      total: invoice.total,
      notes: invoice.notes,
    })
  }

  if (loading) return (
    <div className="hm-content">
      <div className="hm-skeleton h-8 w-64 mb-6" />
      <div className="hm-skeleton h-96" />
    </div>
  )

  if (!invoice) return (
    <div className="hm-content">
      <p style={{ color: 'rgb(var(--color-text-muted))' }}>Facture introuvable.</p>
    </div>
  )

  const clientName = invoice.client.company_name ?? `${invoice.client.first_name} ${invoice.client.last_name}`

  return (
    <>
      <AdminHeader title={invoice.invoice_number} subtitle={clientName} />
      <div className="hm-content">
        <Link href="/admin/billing"
          className="flex items-center gap-2 text-sm mb-6"
          style={{ color: 'rgb(var(--color-text-muted))' }}>
          <ArrowLeft className="w-4 h-4" /> Facturation
        </Link>

        <div className="grid lg:grid-cols-4 gap-4">
          {/* Invoice document */}
          <div className="lg:col-span-3 hm-card" id="invoice-print">
            {/* Header */}
            <div className="flex items-start justify-between mb-8 pb-6 border-b"
              style={{ borderColor: 'rgb(var(--color-border))' }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))' }}>
                  HX
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>Hailite Xteriors Inc.</p>
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Revêtement & Toiture</p>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>hailiteexteriors@gmail.com</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ color: 'rgb(var(--color-primary))' }}>FACTURE</p>
                <p className="text-lg font-semibold mt-1" style={{ color: 'rgb(var(--color-text))' }}>{invoice.invoice_number}</p>
                <div className="mt-2"><InvoiceStatusBadge status={invoice.status} /></div>
              </div>
            </div>

            {/* Billing info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>FACTURÉ À</p>
                <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{clientName}</p>
                {invoice.client.address && <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>{invoice.client.address}</p>}
                {invoice.client.city && <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{invoice.client.city}, {invoice.client.province ?? 'QC'}</p>}
                {invoice.client.email && <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>{invoice.client.email}</p>}
                {invoice.client.phone && <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{invoice.client.phone}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>Date</span>
                  <span style={{ color: 'rgb(var(--color-text))' }}>{formatDate(invoice.issue_date)}</span>
                </div>
                {invoice.due_date && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>Échéance</span>
                    <span style={{ color: 'rgb(var(--color-text))' }}>{formatDate(invoice.due_date)}</span>
                  </div>
                )}
                {invoice.project && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>Chantier</span>
                    <span style={{ color: 'rgb(var(--color-text))' }}>{invoice.project.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Line items */}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  <th className="text-left text-xs font-bold pb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>DESCRIPTION</th>
                  <th className="text-right text-xs font-bold pb-2 w-16" style={{ color: 'rgb(var(--color-text-muted))' }}>QTÉ</th>
                  <th className="text-right text-xs font-bold pb-2 w-20" style={{ color: 'rgb(var(--color-text-muted))' }}>P.U.</th>
                  <th className="text-right text-xs font-bold pb-2 w-24" style={{ color: 'rgb(var(--color-text-muted))' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.line_items ?? []).map((li, i) => (
                  <tr key={li.id} className="border-b" style={{
                    borderColor: 'rgb(var(--color-border-subtle))',
                    background: i % 2 === 1 ? 'rgb(var(--color-bg-secondary))' : 'transparent',
                  }}>
                    <td className="py-3 pr-4">
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{li.description}</p>
                      <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{li.unit}</p>
                    </td>
                    <td className="py-3 text-right text-sm" style={{ color: 'rgb(var(--color-text))' }}>{li.quantity}</td>
                    <td className="py-3 text-right text-sm" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(li.unit_price)}</td>
                    <td className="py-3 text-right text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(li.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                {[
                  ['Sous-total', invoice.subtotal],
                  ['TPS (5 %)', invoice.tax_gst],
                  ['TVQ (9,975 %)', invoice.tax_qst],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between text-sm">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>{label}</span>
                    <span style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(Number(val))}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  <span className="font-bold" style={{ color: 'rgb(var(--color-text))' }}>TOTAL</span>
                  <span className="text-xl font-bold" style={{ color: 'rgb(var(--color-primary))' }}>
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
                {invoice.paid_amount > 0 && (
                  <div className="flex justify-between text-sm pt-1">
                    <span style={{ color: 'rgb(var(--color-success))' }}>Payé</span>
                    <span style={{ color: 'rgb(var(--color-success))' }}>{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <p className="text-xs font-bold mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>NOTES</p>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{invoice.notes}</p>
              </div>
            )}

            <div className="mt-8 pt-4 border-t text-center" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Merci de votre confiance — Hailite Xteriors Inc. • hailiteexteriors@gmail.com
              </p>
            </div>
          </div>

          {/* Actions sidebar */}
          <div className="space-y-4">
            <div className="hm-card space-y-2">
              <h3 className="font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>Actions</h3>
              <Button variant="secondary" className="w-full justify-start gap-2" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Imprimer
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-2" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4" /> Télécharger PDF
              </Button>
              {invoice.status === 'draft' && (
                <Button variant="secondary" className="w-full justify-start gap-2" loading={approving} onClick={handleApprove}>
                  <CheckCircle className="w-4 h-4" /> Approuver
                </Button>
              )}
              {invoice.status === 'approved' && !invoice.stripe_payment_link && (
                <Button className="w-full justify-start gap-2" loading={creatingLink} onClick={handleCreateStripeLink}>
                  <Send className="w-4 h-4" /> Créer lien paiement
                </Button>
              )}
              {invoice.stripe_payment_link && (
                <a href={invoice.stripe_payment_link} target="_blank" rel="noreferrer">
                  <Button variant="secondary" className="w-full justify-start gap-2">
                    <ExternalLink className="w-4 h-4" /> Ouvrir lien paiement
                  </Button>
                </a>
              )}
            </div>

            <div className="hm-card space-y-3">
              <p className="text-xs font-bold" style={{ color: 'rgb(var(--color-text-muted))' }}>RÉSUMÉ</p>
              <div>
                <p className="text-xs mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Statut</p>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Total</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: 'rgb(var(--color-primary))' }}>
                  {formatCurrency(invoice.total)}
                </p>
              </div>
              {invoice.payment_method && (
                <div>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Mode de paiement</p>
                  <p className="text-sm capitalize mt-0.5" style={{ color: 'rgb(var(--color-text))' }}>
                    {invoice.payment_method}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
