'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Plus, Send, FileCheck, FileX, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { calculateTaxes } from '@/lib/utils/payroll'
import type { Quote, Client, Project, CatalogItem, QuoteStatus } from '@/types/database'
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

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<(Quote & { client: Client; project: Project })[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lineItems, setLineItems] = useState([
    { description: '', quantity: '1', unit: 'sqft', unit_price: '', catalog_item_id: '' }
  ])
  const [form, setForm] = useState({
    client_id: '', project_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: '', notes: '', terms: DEFAULT_TERMS,
  })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: q }, { data: cl }, { data: pr }, { data: cat }] = await Promise.all([
      supabase.from('quotes').select('*, client:clients(*), project:projects(name,project_number,address,city)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('is_active', true),
      supabase.from('projects').select('*').neq('status', 'cancelled'),
      supabase.from('catalog_items').select('*').eq('is_active', true),
    ])
    setQuotes((q ?? []) as any)
    setClients(cl ?? [])
    setProjects(pr ?? [])
    setCatalog(cat ?? [])
    setLoading(false)
  }

  const totals = () => {
    const subtotal = lineItems.reduce((s, li) => s + (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0), 0)
    return { subtotal, ...calculateTaxes(subtotal) }
  }

  const handleSave = async () => {
    if (!form.client_id || !form.project_id) { toast.error('Client et chantier requis'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { gst, qst, total, subtotal } = totals()
    const quoteNum = `DEV-${Date.now().toString().slice(-6)}`

    const { data: quote, error } = await supabase.from('quotes').insert([{
      project_id: form.project_id, client_id: form.client_id,
      quote_number: quoteNum, status: 'draft',
      issue_date: form.issue_date,
      expiry_date: form.expiry_date || null,
      subtotal, tax_gst: gst, tax_qst: qst, total,
      notes: form.notes, terms: form.terms, created_by: user?.id,
    }]).select().single()

    if (error || !quote) { toast.error('Erreur: ' + error?.message); setSaving(false); return }

    const items = lineItems.filter(li => li.description && parseFloat(li.quantity) > 0).map((li, i) => ({
      quote_id: quote.id,
      catalog_item_id: li.catalog_item_id || null,
      description: li.description, quantity: parseFloat(li.quantity),
      unit: li.unit, unit_price: parseFloat(li.unit_price),
      total: parseFloat(li.quantity) * parseFloat(li.unit_price), order_index: i,
    }))
    if (items.length > 0) await supabase.from('quote_line_items').insert(items)

    toast.success('Devis créé!')
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  const updateStatus = async (id: string, status: QuoteStatus) => {
    await supabase.from('quotes').update({ status }).eq('id', id)
    toast.success('Statut mis à jour')
    loadData()
  }

  const convertToInvoice = async (quote: Quote & { client: Client; project: Project }) => {
    const { data: { user } } = await supabase.auth.getUser()
    const invNum = `INV-${Date.now().toString().slice(-6)}`
    const { data: inv } = await supabase.from('invoices').insert([{
      project_id: quote.project_id, client_id: quote.client_id,
      invoice_number: invNum, status: 'draft',
      issue_date: new Date().toISOString().split('T')[0],
      subtotal: quote.subtotal, tax_gst: quote.tax_gst, tax_qst: quote.tax_qst, total: quote.total,
      notes: quote.notes, created_by: user?.id,
    }]).select().single()

    if (inv) {
      // Copy line items
      const { data: items } = await supabase.from('quote_line_items').select('*').eq('quote_id', quote.id)
      if (items?.length) {
        await supabase.from('invoice_line_items').insert(items.map(({ id: _id, quote_id: _qid, ...rest }) => ({
          ...rest, invoice_id: inv.id,
        })))
      }
      await supabase.from('quotes').update({ status: 'accepted' }).eq('id', quote.id)
      toast.success('Facture créée depuis le devis!')
      loadData()
    }
  }

  const addLineItem = () => setLineItems(l => [...l, { description: '', quantity: '1', unit: 'sqft', unit_price: '', catalog_item_id: '' }])
  const updateLineItem = (i: number, key: string, val: string) => setLineItems(items => items.map((item, idx) => idx === i ? { ...item, [key]: val } : item))
  const selectCatalogItem = (i: number, itemId: string) => {
    const item = catalog.find(c => c.id === itemId)
    if (item) setLineItems(items => items.map((li, idx) => idx === i ? { ...li, catalog_item_id: itemId, description: item.name, unit: item.unit, unit_price: item.price_client.toString() } : li))
  }

  const { subtotal, gst, qst, total } = totals()

  const columns = [
    { key: 'quote_number', header: 'N° Devis', render: (q: Quote) => <span className="font-mono font-semibold text-sm" style={{ color: 'rgb(var(--color-primary))' }}>{q.quote_number}</span> },
    { key: 'client', header: 'Client', render: (q: Quote & { client: Client }) => <p className="text-sm">{q.client?.company_name ?? `${q.client?.first_name} ${q.client?.last_name}`}</p> },
    { key: 'project', header: 'Chantier', render: (q: Quote & { project: Project }) => <p className="text-sm">{q.project?.name}</p> },
    { key: 'total', header: 'Montant', render: (q: Quote) => <span className="font-semibold">{formatCurrency(q.total)}</span> },
    { key: 'status', header: 'Statut', render: (q: Quote) => <Badge variant={statusVariant(q.status)}>{statusLabel[q.status] ?? q.status}</Badge> },
    { key: 'expiry_date', header: 'Expiration', render: (q: Quote) => <span className="text-xs">{q.expiry_date ? formatDate(q.expiry_date) : '—'}</span> },
    { key: 'actions', header: '', render: (q: Quote & { client: Client; project: Project }) => (
      <div className="flex items-center gap-1">
        <Link href={`/admin/billing/quotes/${q.id}`} className="hm-btn hm-btn-ghost hm-btn-sm text-xs">Voir</Link>
        {q.status === 'draft' && (
          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); updateStatus(q.id, 'sent') }} title="Marquer comme envoyé">
            <Send className="w-3 h-3" />
          </Button>
        )}
        {q.status === 'sent' && (
          <>
            <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); convertToInvoice(q) }} title="Accepter et créer facture">
              <FileCheck className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
            </Button>
            <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); updateStatus(q.id, 'rejected') }}>
              <FileX className="w-3 h-3" style={{ color: 'rgb(var(--color-danger))' }} />
            </Button>
          </>
        )}
        {q.status === 'accepted' && (
          <span className="text-xs" style={{ color: 'rgb(var(--color-success))' }}>→ Facturé</span>
        )}
      </div>
    )},
  ]

  return (
    <>
      <AdminHeader title="Soumissions / Devis" subtitle={`${quotes.length} devis au total`} />
      <div className="hm-content">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Brouillons', value: quotes.filter(q => q.status === 'draft').length, color: 'rgb(var(--color-text-muted))' },
            { label: 'Envoyés', value: quotes.filter(q => q.status === 'sent').length, color: 'rgb(var(--color-info))' },
            { label: 'Acceptés', value: quotes.filter(q => q.status === 'accepted').length, color: 'rgb(var(--color-success))' },
            { label: 'Refusés', value: quotes.filter(q => q.status === 'rejected').length, color: 'rgb(var(--color-danger))' },
          ].map(s => (
            <div key={s.label} className="hm-card">
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{s.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="hm-page-header">
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Pipeline: Devis → Contrat → Facture
          </p>
          <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouveau devis</Button>
        </div>

        <div className="hm-card">
          <DataTable data={quotes as any} columns={columns as any} loading={loading} emptyMessage="Aucun devis. Créez votre première soumission!" />
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau Devis / Soumission" size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>Créer le devis</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Client *" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
              options={clients.map(c => ({ value: c.id, label: c.company_name ?? `${c.first_name} ${c.last_name}` }))} placeholder="Sélectionner..." />
            <Select label="Chantier *" value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
              options={projects.filter(p => !form.client_id || p.client_id === form.client_id).map(p => ({ value: p.id, label: `${p.project_number} – ${p.name}` }))} placeholder="Sélectionner..." />
            <Input label="Date d'émission" type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
            <Input label="Date d'expiration" type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="hm-label">Articles / Services</label>
              <Button variant="ghost" size="sm" onClick={addLineItem}><Plus className="w-3 h-3" /> Ajouter</Button>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {lineItems.map((li, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg" style={{ background: 'rgb(var(--color-bg-secondary))' }}>
                  <div className="col-span-3">
                    <select className="hm-select text-xs" value={li.catalog_item_id} onChange={e => selectCatalogItem(i, e.target.value)}>
                      <option value="">Libre</option>
                      {catalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <input className="hm-input text-xs" placeholder="Description" value={li.description} onChange={e => updateLineItem(i, 'description', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <input className="hm-input text-xs" type="number" step="0.01" placeholder="Quantité" value={li.quantity} onChange={e => updateLineItem(i, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <input className="hm-input text-xs" type="number" step="0.01" placeholder="Prix/u" value={li.unit_price} onChange={e => updateLineItem(i, 'unit_price', e.target.value)} />
                  </div>
                  <button className="col-span-1 text-red-400 text-xs hover:text-red-500" onClick={() => setLineItems(l => l.filter((_, idx) => idx !== i))}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-1.5" style={{ borderColor: 'rgb(var(--color-border))' }}>
            {[
              { label: 'Sous-total', value: formatCurrency(subtotal) },
              { label: 'TPS (5%)', value: formatCurrency(gst) },
              { label: 'TVQ (9.975%)', value: formatCurrency(qst) },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>{r.label}</span>
                <span style={{ color: 'rgb(var(--color-text))' }}>{r.value}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <span style={{ color: 'rgb(var(--color-text))' }}>Total</span>
              <span style={{ color: 'rgb(var(--color-success))' }}>{formatCurrency(total)}</span>
            </div>
          </div>

          <Textarea label="Notes (visibles sur le devis)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <Textarea label="Conditions générales" value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} />
        </div>
      </Modal>
    </>
  )
}

const DEFAULT_TERMS = `Les présents travaux sont garantis contre tout défaut de main-d'œuvre pour une période de 2 ans suivant la date de réalisation.

Modalités de paiement: 30% à la signature, 40% à mi-travaux, 30% à la livraison.

Cette soumission est valide 30 jours à compter de la date d'émission.`
