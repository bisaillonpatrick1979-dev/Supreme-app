'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, Send, FileCheck, FileX, Printer, Download } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Quote, Client, Project, QuoteLineItem, QuoteStatus } from '@/types/database'
import Link from 'next/link'

const statusVariant = (s: string): 'muted' | 'info' | 'warning' | 'success' | 'danger' => {
  const map: Record<string, 'muted' | 'info' | 'warning' | 'success' | 'danger'> = {
    draft: 'muted', sent: 'info', accepted: 'success', rejected: 'danger', expired: 'warning',
  }
  return map[s] ?? 'muted'
}

const statusLabel: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré',
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [quote, setQuote] = useState<(Quote & { client: Client; project: Project; line_items: QuoteLineItem[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadQuote() }, [id])

  const loadQuote = async () => {
    const { data } = await supabase
      .from('quotes')
      .select('*, client:clients(*), project:projects(*, client:clients(*))')
      .eq('id', id)
      .single()

    if (data) {
      const { data: items } = await supabase.from('quote_line_items').select('*').eq('quote_id', id).order('order_index')
      setQuote({ ...data, line_items: items ?? [] } as any)
    }
    setLoading(false)
  }

  const updateStatus = async (status: QuoteStatus) => {
    const updates: Record<string, unknown> = { status }
    if (status === 'sent') updates.sent_at = new Date().toISOString()
    if (status === 'accepted') updates.accepted_at = new Date().toISOString()
    await supabase.from('quotes').update(updates).eq('id', id)
    toast.success('Statut mis à jour')
    loadQuote()
  }

  const convertToInvoice = async () => {
    if (!quote) return
    const { data: { user } } = await supabase.auth.getUser()
    const invNum = `INV-${Date.now().toString().slice(-6)}`
    const { data: inv } = await supabase.from('invoices').insert([{
      project_id: quote.project_id, client_id: quote.client_id,
      invoice_number: invNum, status: 'draft',
      issue_date: new Date().toISOString().split('T')[0],
      subtotal: quote.subtotal, tax_gst: quote.tax_gst, tax_qst: quote.tax_qst, total: quote.total,
      notes: quote.notes, created_by: user?.id,
    }]).select().single()

    if (inv && quote.line_items?.length) {
      await supabase.from('invoice_line_items').insert(
        quote.line_items.map(({ id: _id, quote_id: _qid, ...rest }) => ({ ...rest, invoice_id: inv.id }))
      )
    }
    await updateStatus('accepted')
    toast.success('Facture créée! Redirection vers facturation...')
    setTimeout(() => router.push('/admin/billing'), 1500)
  }

  const printQuote = () => window.print()

  const downloadPDF = async () => {
    if (!quote) return
    const { generatePDF } = await import('@/lib/pdf/generate')
    const clientName = quote.client.company_name ?? `${quote.client.first_name} ${quote.client.last_name}`
    generatePDF({
      type: 'quote',
      number: quote.quote_number,
      issue_date: quote.issue_date,
      expiry_date: quote.expiry_date,
      client: {
        name: clientName,
        address: quote.client.address,
        city: quote.client.city,
        province: quote.client.province,
        email: quote.client.email,
        phone: quote.client.phone,
      },
      project: (quote.project as any)?.name ?? null,
      items: (quote.line_items ?? []).map(li => ({
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unit_price: li.unit_price,
        total: li.total,
      })),
      subtotal: quote.subtotal,
      tax_gst: quote.tax_gst,
      tax_qst: quote.tax_qst,
      total: quote.total,
      notes: quote.notes,
      terms: quote.terms,
    })
  }

  if (loading) return <div className="hm-content"><div className="hm-skeleton h-96" /></div>
  if (!quote) return <div className="hm-content"><p>Devis non trouvé</p></div>

  const client = quote.client
  const project = quote.project as any

  return (
    <>
      <AdminHeader
        title={`Devis ${quote.quote_number}`}
        subtitle={`${client?.company_name ?? `${client?.first_name} ${client?.last_name}`} • ${project?.name}`}
      />
      <div className="hm-content print:p-0">
        {/* Actions bar */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link href="/admin/billing/quotes" className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <ArrowLeft className="w-4 h-4" /> Retour aux devis
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(quote.status)}>{statusLabel[quote.status]}</Badge>
            {quote.status === 'draft' && (
              <Button variant="secondary" onClick={() => updateStatus('sent')}>
                <Send className="w-4 h-4" /> Marquer envoyé
              </Button>
            )}
            {quote.status === 'sent' && (
              <>
                <Button variant="secondary" onClick={() => updateStatus('rejected')}>
                  <FileX className="w-4 h-4" /> Refusé
                </Button>
                <Button onClick={convertToInvoice}>
                  <FileCheck className="w-4 h-4" /> Accepter → Facturer
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={printQuote}>
              <Printer className="w-4 h-4" /> Imprimer
            </Button>
            <Button variant="secondary" onClick={downloadPDF}>
              <Download className="w-4 h-4" /> PDF
            </Button>
          </div>
        </div>

        {/* Quote document */}
        <div className="hm-card max-w-4xl mx-auto print:shadow-none print:border-none" id="quote-document">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="text-2xl font-black hm-gradient-text mb-1">HAILITE XTERIORS</div>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Roofing & Siding Solutions</p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>hailiteexteriors@gmail.com</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black" style={{ color: 'rgb(var(--color-primary))' }}>SOUMISSION</p>
              <p className="text-lg font-mono font-bold mt-1" style={{ color: 'rgb(var(--color-text))' }}>{quote.quote_number}</p>
              <div className="mt-2 space-y-0.5 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                <p>Émis le: {formatDate(quote.issue_date)}</p>
                {quote.expiry_date && <p>Expire le: {formatDate(quote.expiry_date)}</p>}
              </div>
            </div>
          </div>

          {/* Client & Project */}
          <div className="grid grid-cols-2 gap-8 mb-8 p-4 rounded-xl" style={{ background: 'rgb(var(--color-bg-secondary))' }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>Facturé à</p>
              <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {client?.company_name ?? `${client?.first_name} ${client?.last_name}`}
              </p>
              {client?.company_name && <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{client.first_name} {client.last_name}</p>}
              {client?.email && <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{client.email}</p>}
              {client?.phone && <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{client.phone}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>Chantier</p>
              <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{project?.name}</p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{project?.address}</p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{project?.city}, {project?.province}</p>
              <p className="text-xs mt-1 font-mono" style={{ color: 'rgb(var(--color-primary))' }}>{project?.project_number}</p>
            </div>
          </div>

          {/* Line items */}
          <table className="w-full mb-6">
            <thead>
              <tr style={{ borderBottom: '2px solid rgb(var(--color-primary))' }}>
                <th className="text-left py-2 text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Description</th>
                <th className="text-right py-2 text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Qté</th>
                <th className="text-right py-2 text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Unité</th>
                <th className="text-right py-2 text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Prix unit.</th>
                <th className="text-right py-2 text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.line_items?.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}>
                  <td className="py-2.5 text-sm" style={{ color: 'rgb(var(--color-text))' }}>{item.description}</td>
                  <td className="py-2.5 text-sm text-right" style={{ color: 'rgb(var(--color-text-secondary))' }}>{item.quantity}</td>
                  <td className="py-2.5 text-sm text-right" style={{ color: 'rgb(var(--color-text-muted))' }}>{item.unit}</td>
                  <td className="py-2.5 text-sm text-right" style={{ color: 'rgb(var(--color-text-secondary))' }}>{formatCurrency(item.unit_price)}</td>
                  <td className="py-2.5 text-sm text-right font-medium" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-72 space-y-2">
              {[
                { label: 'Sous-total', value: formatCurrency(quote.subtotal) },
                { label: 'TPS (5%)', value: formatCurrency(quote.tax_gst) },
                { label: 'TVQ (9.975%)', value: formatCurrency(quote.tax_qst) },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>{r.label}</span>
                  <span style={{ color: 'rgb(var(--color-text))' }}>{r.value}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <span style={{ color: 'rgb(var(--color-text))' }}>TOTAL</span>
                <span style={{ color: 'rgb(var(--color-success))' }}>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgb(var(--color-bg-secondary))' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>Notes</p>
              <p className="text-sm whitespace-pre-line" style={{ color: 'rgb(var(--color-text-secondary))' }}>{quote.notes}</p>
            </div>
          )}

          {/* Terms */}
          {quote.terms && (
            <div className="p-4 rounded-lg" style={{ border: '1px solid rgb(var(--color-border))' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>Conditions générales</p>
              <p className="text-xs whitespace-pre-line" style={{ color: 'rgb(var(--color-text-muted))' }}>{quote.terms}</p>
            </div>
          )}

          {/* Signature line */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div>
              <p className="text-xs mb-8" style={{ color: 'rgb(var(--color-text-muted))' }}>Signature du client</p>
              <div className="border-b" style={{ borderColor: 'rgb(var(--color-border))' }} />
              <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Date: _______________</p>
            </div>
            <div>
              <p className="text-xs mb-8" style={{ color: 'rgb(var(--color-text-muted))' }}>Signature Hailite Xteriors</p>
              <div className="border-b" style={{ borderColor: 'rgb(var(--color-border))' }} />
              <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Date: _______________</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
