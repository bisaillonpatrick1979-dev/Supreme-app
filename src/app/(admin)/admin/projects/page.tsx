'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { ProjectStatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Plus, MapPin, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Project, Client } from '@/types/database'
import Link from 'next/link'

const statusOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'quoted', label: 'Soumis' },
  { value: 'contracted', label: 'Contracté' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<(Project & { client: Client })[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '', name: '', description: '', status: 'lead', type: [] as string[],
    address: '', city: '', province: 'QC', postal_code: '',
    start_date: '', end_date: '', estimated_value: '', notes: '',
  })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: projs }, { data: cls }] = await Promise.all([
      supabase.from('projects').select('*, client:clients(*)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('is_active', true),
    ])
    setProjects((projs ?? []) as any)
    setClients(cls ?? [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.client_id || !form.name || !form.address || !form.city) {
      toast.error('Client, nom, adresse et ville sont requis')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('projects').insert([{
      ...form,
      project_number: '',
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      created_by: user?.id,
    }])
    if (error) {
      toast.error('Erreur: ' + error.message)
    } else {
      toast.success('Chantier créé avec succès!')
      setShowModal(false)
      loadData()
    }
    setSaving(false)
  }

  const columns = [
    {
      key: 'project_number',
      header: 'N°',
      render: (p: Project & { client: Client }) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'rgb(var(--color-primary))' }}>
          {p.project_number}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Chantier',
      render: (p: Project & { client: Client }) => (
        <div>
          <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>{p.name}</p>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {p.client?.company_name ?? `${p.client?.first_name} ${p.client?.last_name}`}
          </p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'address',
      header: 'Localisation',
      render: (p: Project & { client: Client }) => (
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin className="w-3 h-3 shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
          {p.city}, {p.province}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (p: Project) => <ProjectStatusBadge status={p.status} />,
      sortable: true,
    },
    {
      key: 'start_date',
      header: 'Début',
      render: (p: Project) => (
        <span className="text-sm">{p.start_date ? formatDate(p.start_date) : '—'}</span>
      ),
    },
    {
      key: 'contract_value',
      header: 'Valeur',
      render: (p: Project) => (
        <span className="text-sm font-medium">
          {p.contract_value ? formatCurrency(p.contract_value) : p.estimated_value ? `~${formatCurrency(p.estimated_value)}` : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (p: Project) => (
        <Link href={`/admin/projects/${p.id}`} className="hm-btn hm-btn-ghost hm-btn-sm">
          Ouvrir
        </Link>
      ),
    },
  ]

  const clientOptions = clients.map(c => ({
    value: c.id,
    label: c.company_name ?? `${c.first_name} ${c.last_name}`,
  }))

  return (
    <>
      <AdminHeader title="Chantiers" subtitle={`${projects.length} projets au total`} />
      <div className="hm-content">
        <div className="hm-page-header">
          <div className="flex gap-2">
            {statusOptions.map(s => (
              <span key={s.value} className="hm-badge hm-badge-muted text-xs">
                {s.label}: {projects.filter(p => p.status === s.value).length}
              </span>
            ))}
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Nouveau chantier
          </Button>
        </div>

        <div className="hm-card">
          <DataTable
            data={projects as unknown as Record<string, unknown>[]}
            columns={columns as any}
            loading={loading}
            emptyMessage="Aucun chantier. Créez votre premier projet!"
          />
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau Chantier"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>Créer le chantier</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Client *"
            value={form.client_id}
            onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
            options={clientOptions}
            placeholder="Sélectionner un client"
            className="col-span-2"
          />
          <Input label="Nom du chantier *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Select
            label="Statut"
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            options={statusOptions}
          />
          <Input label="Valeur estimée ($)" type="number" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} placeholder="0.00" />
          <Input label="Adresse du chantier *" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="col-span-2" />
          <Input label="Ville *" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          <Input label="Code postal" value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} />
          <Input label="Date de début" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          <Input label="Date de fin prévue" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="col-span-2" />
          <Textarea label="Notes internes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="col-span-2" />
        </div>
      </Modal>
    </>
  )
}
