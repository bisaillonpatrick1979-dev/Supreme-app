'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Plus, Phone, Mail, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatPhone } from '@/lib/utils/format'
import type { Client, LeadStatus } from '@/types/database'

const leadStatusOptions = [
  { value: 'new', label: 'Nouveau' },
  { value: 'contacted', label: 'Contacté' },
  { value: 'qualified', label: 'Qualifié' },
  { value: 'converted', label: 'Converti' },
  { value: 'lost', label: 'Perdu' },
]

const leadStatusVariant = (s: string) => {
  const map: Record<string, 'success' | 'warning' | 'info' | 'muted' | 'danger'> = {
    new: 'muted', contacted: 'info', qualified: 'warning', converted: 'success', lost: 'danger',
  }
  return map[s] ?? 'muted'
}

const leadStatusLabel = (s: string) => {
  const map: Record<string, string> = {
    new: 'Nouveau', contacted: 'Contacté', qualified: 'Qualifié', converted: 'Converti', lost: 'Perdu',
  }
  return map[s] ?? s
}

export default function CRMPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', company_name: '', email: '', phone: '',
    address: '', city: '', province: 'QC', postal_code: '',
    client_type: 'residential', lead_status: 'new', lead_source: '', notes: '',
  })
  const supabase = createClient()

  useEffect(() => { loadClients() }, [])

  const loadClients = async () => {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data ?? [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.address || !form.city) {
      toast.error('Adresse et ville sont requis')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('clients').insert([form])
    if (error) {
      toast.error('Erreur lors de la sauvegarde')
    } else {
      toast.success('Client ajouté avec succès')
      setShowModal(false)
      setForm({ first_name: '', last_name: '', company_name: '', email: '', phone: '', address: '', city: '', province: 'QC', postal_code: '', client_type: 'residential', lead_status: 'new', lead_source: '', notes: '' })
      loadClients()
    }
    setSaving(false)
  }

  const updateStatus = async (id: string, status: LeadStatus) => {
    const { error } = await supabase.from('clients').update({ lead_status: status }).eq('id', id)
    if (!error) { loadClients(); toast.success('Statut mis à jour') }
  }

  const columns = [
    {
      key: 'name',
      header: 'Client',
      render: (c: Client) => (
        <div>
          <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {c.company_name || `${c.first_name} ${c.last_name}`}
          </p>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {c.company_name ? `${c.first_name} ${c.last_name}` : ''}
          </p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (c: Client) => (
        <div className="space-y-0.5">
          {c.email && (
            <div className="flex items-center gap-1.5 text-xs">
              <Mail className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span>{c.email}</span>
            </div>
          )}
          {c.phone && (
            <div className="flex items-center gap-1.5 text-xs">
              <Phone className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span>{formatPhone(c.phone)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Ville',
      render: (c: Client) => (
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin className="w-3 h-3 shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
          {c.city}, {c.province}
        </div>
      ),
    },
    {
      key: 'client_type',
      header: 'Type',
      render: (c: Client) => {
        const labels: Record<string, string> = { residential: 'Résidentiel', commercial: 'Commercial', industrial: 'Industriel' }
        return <span className="text-sm">{labels[c.client_type] ?? c.client_type}</span>
      },
    },
    {
      key: 'lead_status',
      header: 'Statut',
      render: (c: Client) => (
        <select
          className="hm-select text-xs py-1 px-2"
          value={c.lead_status ?? 'new'}
          onChange={e => updateStatus(c.id, e.target.value as LeadStatus)}
          onClick={e => e.stopPropagation()}
          style={{ width: 'auto' }}
        >
          {leadStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ),
    },
    {
      key: 'created_at',
      header: 'Ajouté',
      render: (c: Client) => <span className="text-xs">{formatDate(c.created_at)}</span>,
      sortable: true,
    },
  ]

  return (
    <>
      <AdminHeader title="CRM Clients" subtitle={`${clients.length} clients et prospects`} />
      <div className="hm-content">
        <div className="hm-page-header">
          <div />
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Nouveau client
          </Button>
        </div>

        <div className="hm-card">
          <DataTable
            data={clients as unknown as Record<string, unknown>[]}
            columns={columns as any}
            loading={loading}
            searchKeys={['first_name', 'last_name', 'company_name', 'email', 'city'] as any}
            emptyMessage="Aucun client trouvé. Ajoutez votre premier client!"
          />
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau Client / Prospect"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>Sauvegarder</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Prénom" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
          <Input label="Nom" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
          <Input label="Compagnie (optionnel)" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="col-span-2" />
          <Input label="Courriel" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Téléphone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Adresse" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="col-span-2" />
          <Input label="Ville" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          <Input label="Code postal" value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} />
          <Select
            label="Type"
            value={form.client_type}
            onChange={e => setForm(f => ({ ...f, client_type: e.target.value }))}
            options={[
              { value: 'residential', label: 'Résidentiel' },
              { value: 'commercial', label: 'Commercial' },
              { value: 'industrial', label: 'Industriel' },
            ]}
          />
          <Select
            label="Statut lead"
            value={form.lead_status}
            onChange={e => setForm(f => ({ ...f, lead_status: e.target.value }))}
            options={leadStatusOptions}
          />
          <Input label="Source du lead" value={form.lead_source} onChange={e => setForm(f => ({ ...f, lead_source: e.target.value }))} className="col-span-2" placeholder="Référence, Google, etc." />
          <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="col-span-2" />
        </div>
      </Modal>
    </>
  )
}
