'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { InvoiceStatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Plus, Link as LinkIcon, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { calculateTaxes } from '@/lib/utils/payroll'
import type { Invoice, Client, Project, CatalogItem } from '@/types/database'

export default function BillingPage() {
  const [invoices, setInvoices] = useState<(Invoice & { client: Client; project: Project })[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'invoices' | 'quotes'>('invoices')
  const [lineItems, setLineItems] = useState([{ description: '', quantity: '1', unit: 'sqft', unit_price: '', catalog_item_id: '' }])
  const [form, setForm] = useState({
    client_id: '', project_id: '', issue_date: new Date().toISOString().split('T')[0],
    due_date: '', notes: '',
  })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: invs }, { data: cls }, { data: projs }, { data: cat }] = await Promise.all([
      supabase.from('invoices').select('*, client:clients(*), project:projects(name, project_number)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('is_active', true),
      supabase.from('projects').select('id, name, project_number, client_id, description, status, type, address, city, province, postal_code, lat, lng, start_date, end_date, estimated_value, contract_value, notes, created_by, created_at, updated_at').neq('status', 'cancelled'),
      supabase.from('catalog_items').select('*').eq('is_active', true),
    ])
    setInvoices((invs ?? []) as any)
    setClients(cls ?? [])
    setProjects(projs ?? [])
    setCatalog(cat ?? [])
    setLoading(false)
  }

  const totals = () => {
    const subtotal = lineItems.reduce((s, li) => {
      const q = parseFloat(li.quantity) || 0
      const p = parseFloat(li.unit_price) || 0
      return s + q * p
    }, 0)
    return { subtotal, ...calculateTaxes(subtotal) }
  }

  const handleSave = async () => {
    if (!form.client_id || !form.project_id) {
      toast.error('Client et chantier sont requis')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { gst, qst, total, subtotal } = totals()

    // Generate invoice number
    const invNum = `INV-${Date.now().toString().slice(-6)}`

    const { data: inv, error } = await supabase.from('invoices').insert([{
      project_id: form.project_id,
      client_id: form.client_id,
      invoice_number: invNum,
      status: 'draft',
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      subtotal, tax_gst: gst, tax_qst: qst, total,
      notes: form.notes,
      created_by: user?.id,
    }]).select().single()

    if (error || !inv) {
      toast.error('Erreur lors de la création')
      setSaving(false)
      return
    }

    // Insert line items
    const items = lineItems
      .filter(li => li.description && parseFloat(li.quantity) > 0)
      .map((li, i) => ({
        invoice_id: inv.id,
        catalog_item_id: li.catalog_item_id || null,
        description: li.description,
        quantity: parseFloat(li.quantity),
        unit: li.unit,
        unit_price: parseFloat(li.unit_price),
        total: parseFloat(li.quantity) * parseFloat(li.unit_price),
        order_index: i,
      }))

    if (items.length > 0) {
      await supabase.from('invoice_line_items').insert(items)
    }

    toast.success('Facture créée avec succès!')
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  const createStripeLink = async (invoiceId: string, invoiceNumber: string, total: number, clientName: string) => {
    const res = await fetch('/api/stripe/payment-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, invoiceNumber, amount: total, clientName }),
    })
    if (res.ok) {
      const { url } = await res.json()
      await supabase.from('invoices').update({ stripe_payment_link: url, status: 'pending' }).eq('id', invoiceId)
      toast.success('Lien de paiement Stripe créé!')
      loadData()
    }
  }

  const addLineItem = () => setLineItems(l => [...l, { description: '', quantity: '1', unit: 'sqft', unit_price: '', catalog_item_id: '' }])
  const updateLineItem = (i: number, key: string, val: string) => {
    setLineItems(items => items.map((item, idx) => idx === i ? { ...item, [key]: val } : item))
  }
  const selectCatalogItem = (i: number, itemId: string) => {
    const item = catalog.find(c => c.id === itemId)
    if (item) {
      setLineItems(items => items.map((li, idx) => idx === i
        ? { ...li, catalog_item_id: itemId, description: item.name, unit: item.unit, unit_price: item.price_client.toString() }
        : li
      ))
    }
  }

  const { subtotal, gst, qst, total } = totals()

  const columns = [
    { key: 'invoice_number', header: 'N° Facture', render: (inv: Invoice) => (
      <span className="font-mono font-semibold text-sm" style={{ color: 'rgb(var(--color-primary))' }}>{inv.invoice_number}</span>
    )},
    { key: 'client', header: 'Client', render: (inv: Invoice & { client: Client }) => (
      <p className="text-sm">{inv.client?.company_name ?? `${inv.client?.first_name} ${inv.client?.last_name}`}</p>
    )},
    { key: 'project', header: 'Chantier', render: (inv: Invoice & { project: Project }) => (
      <p className="text-sm">{inv.project?.name}</p>
    )},
    { key: 'total', header: 'Montant', render: (inv: Invoice) => (
      <span className="font-semibold">{formatCurrency(inv.total)}</span>
    )},
    { key: 'status', header: 'Statut', render: (inv: Invoice) => <InvoiceStatusBadge status={inv.status} />},
    { key: 'issue_date', header: 'Date', render: (inv: Invoice) => <span className="text-xs">{formatDate(inv.issue_date)}</span> },
    { key: 'actions', header: '', render: (inv: Invoice & { client: Client }) => (
      <div className="flex gap-1">
        <Link href={`/admin/billing/${inv.id}`}>
          <Button variant="ghost" size="sm"><Eye className="w-3 h-3" /></Button>
        </Link>
        {!inv.stripe_payment_link && inv.status !== 'paid' && (
          <Button variant="ghost" size="sm" onClick={(e) => {
            e.stopPropagation()
            const name = inv.client?.company_name ?? `${inv.client?.first_name} ${inv.client?.last_name}`
            createStripeLink(inv.id, inv.invoice_number, inv.total, name)
          }}>
            <LinkIcon className="w-3 h-3" />
          </Button>
        )}
        {inv.stripe_payment_link && (
          <a href={inv.stripe_payment_link} target="_blank" rel="noopener noreferrer" className="hm-btn hm-btn-ghost hm-btn-sm">
            Payer
          </a>
        )}
      </div>
    )},
  ]

  return (
    <>
      <AdminHeader title="Facturation" subtitle="Soumissions, contrats et factures" />
      <div className="hm-content">
        {/* Revenue summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total facturé', value: formatCurrency(invoices.reduce((s, i) => s + i.total, 0)), color: 'rgb(var(--color-text))' },
            { label: 'Payé', value: formatCurrency(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)), color: 'rgb(var(--color-success))' },
            { label: 'En attente', value: formatCurrency(invoices.filter(i => ['pending','approved'].includes(i.status)).reduce((s, i) => s + i.total, 0)), color: 'rgb(var(--color-warning))' },
            { label: 'En retard', value: formatCurrency(invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0)), color: 'rgb(var(--color-danger))' },
          ].map(s => (
            <div key={s.label} className="hm-card">
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{s.label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="hm-page-header">
          <div />
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Nouvelle facture
          </Button>
        </div>

        <div className="hm-card">
          <DataTable
            data={invoices as unknown as Record<string, unknown>[]}
            columns={columns as any}
            loading={loading}
            emptyMessage="Aucune facture. Créez votre première!"
          />
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouvelle Facture" size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>Créer la facture</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Client *" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
              options={clients.map(c => ({ value: c.id, label: c.company_name ?? `${c.first_name} ${c.last_name}` }))}
              placeholder="Sélectionner..." />
            <Select label="Chantier *" value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
              options={projects.filter(p => !form.client_id || p.client_id === form.client_id).map(p => ({ value: p.id, label: `${p.project_number} – ${p.name}` }))}
              placeholder="Sélectionner..." />
            <Input label="Date de facturation" type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
            <Input label="Date d'échéance" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="hm-label">Articles</label>
              <Button variant="ghost" size="sm" onClick={addLineItem}><Plus className="w-3 h-3" /> Ajouter</Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lineItems.map((li, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg" style={{ background: 'rgb(var(--color-bg-secondary))' }}>
                  <div className="col-span-4">
                    <select className="hm-select text-xs" value={li.catalog_item_id} onChange={e => selectCatalogItem(i, e.target.value)}>
                      <option value="">Description libre</option>
                      {catalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input className="hm-input text-xs" placeholder="Description" value={li.description} onChange={e => updateLineItem(i, 'description', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <input className="hm-input text-xs" type="number" placeholder="Qté" value={li.quantity} onChange={e => updateLineItem(i, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <input className="hm-input text-xs" type="number" placeholder="Prix/u" value={li.unit_price} onChange={e => updateLineItem(i, 'unit_price', e.target.value)} />
                  </div>
                  <button className="col-span-1 text-red-400 hover:text-red-500 text-xs" onClick={() => setLineItems(l => l.filter((_, idx) => idx !== i))}>✕</button>
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

          <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes visibles sur la facture..." />
        </div>
      </Modal>
    </>
  )
}
