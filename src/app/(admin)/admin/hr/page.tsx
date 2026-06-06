'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Plus, Users, Building2, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils/format'
import type { Employee, Subcontractor } from '@/types/database'

export default function HRPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'employees' | 'subcontractors'>('employees')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'employee' | 'subcontractor'>('employee')
  const [saving, setSaving] = useState(false)

  const [empForm, setEmpForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    employee_type: 'hourly', hourly_rate: '', salary_annual: '',
    address: '', city: '', province: 'QC', postal_code: '',
    hire_date: new Date().toISOString().split('T')[0],
    emergency_contact_name: '', emergency_contact_phone: '',
    notes: '',
  })

  const [stForm, setStForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '',
    specialty: '', neq_number: '', rbq_number: '',
    gst_number: '', qst_number: '', default_rate: '',
    address: '', city: '', province: 'QC', postal_code: '',
    payment_terms: '30', notes: '',
  })

  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: emps }, { data: sts }] = await Promise.all([
      supabase.from('employees').select('*').order('last_name'),
      supabase.from('subcontractors').select('*').order('company_name'),
    ])
    setEmployees(emps ?? [])
    setSubcontractors(sts ?? [])
    setLoading(false)
  }

  const openModal = (type: 'employee' | 'subcontractor') => {
    setModalType(type)
    setShowModal(true)
  }

  const handleSaveEmployee = async () => {
    if (!empForm.first_name || !empForm.last_name) {
      toast.error('Prénom et nom requis')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('employees').insert([{
      ...empForm,
      hourly_rate: empForm.hourly_rate ? parseFloat(empForm.hourly_rate) : null,
      salary_annual: empForm.salary_annual ? parseFloat(empForm.salary_annual) : null,
    }])
    if (error) {
      toast.error('Erreur: ' + error.message)
    } else {
      toast.success('Employé ajouté!')
      setShowModal(false)
      loadData()
    }
    setSaving(false)
  }

  const handleSaveST = async () => {
    if (!stForm.company_name || !stForm.contact_name) {
      toast.error('Nom de compagnie et contact requis')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('subcontractors').insert([{
      ...stForm,
      specialty: stForm.specialty ? stForm.specialty.split(',').map(s => s.trim()) : [],
      default_rate: stForm.default_rate ? parseFloat(stForm.default_rate) : null,
      payment_terms: parseInt(stForm.payment_terms),
    }])
    if (error) {
      toast.error('Erreur: ' + error.message)
    } else {
      toast.success('Sous-traitant ajouté!')
      setShowModal(false)
      loadData()
    }
    setSaving(false)
  }

  const employeeColumns = [
    { key: 'name', header: 'Employé', render: (e: Employee) => (
      <div>
        <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>{e.first_name} {e.last_name}</p>
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{e.email ?? '—'}</p>
      </div>
    )},
    { key: 'phone', header: 'Téléphone', render: (e: Employee) => <span className="text-sm">{e.phone ? formatPhone(e.phone) : '—'}</span> },
    { key: 'employee_type', header: 'Type', render: (e: Employee) => (
      <Badge variant={e.employee_type === 'salaried' ? 'info' : 'muted'}>
        {e.employee_type === 'salaried' ? 'Salarié' : 'Horaire'}
      </Badge>
    )},
    { key: 'rate', header: 'Rémunération', render: (e: Employee) => (
      <span className="text-sm font-medium">
        {e.employee_type === 'salaried'
          ? e.salary_annual ? formatCurrency(e.salary_annual) + '/an' : '—'
          : e.hourly_rate ? formatCurrency(e.hourly_rate) + '/h' : '—'}
      </span>
    )},
    { key: 'hire_date', header: 'Embauche', render: (e: Employee) => <span className="text-xs">{formatDate(e.hire_date)}</span> },
    { key: 'is_active', header: 'Statut', render: (e: Employee) => (
      <Badge variant={e.is_active ? 'success' : 'danger'}>{e.is_active ? 'Actif' : 'Inactif'}</Badge>
    )},
  ]

  const stColumns = [
    { key: 'company', header: 'Compagnie', render: (s: Subcontractor) => (
      <div>
        <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>{s.company_name}</p>
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{s.contact_name}</p>
      </div>
    )},
    { key: 'specialty', header: 'Spécialité', render: (s: Subcontractor) => (
      <div className="flex flex-wrap gap-1">
        {s.specialty?.map(sp => <span key={sp} className="hm-badge hm-badge-muted text-xs">{sp}</span>)}
      </div>
    )},
    { key: 'phone', header: 'Téléphone', render: (s: Subcontractor) => <span className="text-sm">{s.phone ? formatPhone(s.phone) : '—'}</span> },
    { key: 'neq_number', header: 'NEQ', render: (s: Subcontractor) => <span className="text-sm font-mono">{s.neq_number ?? '—'}</span> },
    { key: 'default_rate', header: 'Taux', render: (s: Subcontractor) => (
      <span className="text-sm">{s.default_rate ? formatCurrency(s.default_rate) : '—'}</span>
    )},
    { key: 'is_active', header: 'Statut', render: (s: Subcontractor) => (
      <Badge variant={s.is_active ? 'success' : 'danger'}>{s.is_active ? 'Actif' : 'Inactif'}</Badge>
    )},
  ]

  return (
    <>
      <AdminHeader title="Ressources Humaines" subtitle="Employés et sous-traitants" />
      <div className="hm-content">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="hm-card flex items-center gap-3">
            <Users className="w-8 h-8" style={{ color: 'rgb(var(--color-primary))' }} />
            <div>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Employés actifs</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {employees.filter(e => e.is_active).length}
              </p>
            </div>
          </div>
          <div className="hm-card flex items-center gap-3">
            <Building2 className="w-8 h-8" style={{ color: 'rgb(var(--color-accent))' }} />
            <div>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Sous-traitants actifs</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {subcontractors.filter(s => s.is_active).length}
              </p>
            </div>
          </div>
          <div className="hm-card flex items-center gap-3">
            <UserCheck className="w-8 h-8" style={{ color: 'rgb(var(--color-success))' }} />
            <div>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Salariés</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {employees.filter(e => e.employee_type === 'salaried' && e.is_active).length}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: 'rgb(var(--color-bg-secondary))' }}>
          {(['employees', 'subcontractors'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: activeTab === tab ? 'rgb(var(--color-bg-card))' : 'transparent',
                color: activeTab === tab ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
                boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}>
              {tab === 'employees' ? `Employés (${employees.length})` : `Sous-traitants (${subcontractors.length})`}
            </button>
          ))}
        </div>

        <div className="hm-page-header">
          <div />
          <Button onClick={() => openModal(activeTab === 'employees' ? 'employee' : 'subcontractor')}>
            <Plus className="w-4 h-4" /> {activeTab === 'employees' ? 'Nouvel employé' : 'Nouveau S/T'}
          </Button>
        </div>

        <div className="hm-card">
          {activeTab === 'employees' ? (
            <DataTable data={employees as unknown as Record<string, unknown>[]} columns={employeeColumns as any} loading={loading} emptyMessage="Aucun employé" />
          ) : (
            <DataTable data={subcontractors as unknown as Record<string, unknown>[]} columns={stColumns as any} loading={loading} emptyMessage="Aucun sous-traitant" />
          )}
        </div>
      </div>

      {/* Employee Modal */}
      <Modal isOpen={showModal && modalType === 'employee'} onClose={() => setShowModal(false)} title="Nouvel Employé" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSaveEmployee} loading={saving}>Sauvegarder</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Prénom *" value={empForm.first_name} onChange={e => setEmpForm(f => ({ ...f, first_name: e.target.value }))} />
          <Input label="Nom *" value={empForm.last_name} onChange={e => setEmpForm(f => ({ ...f, last_name: e.target.value }))} />
          <Input label="Courriel" type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Téléphone" type="tel" value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))} />
          <Select label="Type d'employé" value={empForm.employee_type} onChange={e => setEmpForm(f => ({ ...f, employee_type: e.target.value }))}
            options={[{ value: 'hourly', label: 'Horaire' }, { value: 'salaried', label: 'Salarié' }]} />
          {empForm.employee_type === 'hourly'
            ? <Input label="Taux horaire ($/h)" type="number" value={empForm.hourly_rate} onChange={e => setEmpForm(f => ({ ...f, hourly_rate: e.target.value }))} />
            : <Input label="Salaire annuel ($)" type="number" value={empForm.salary_annual} onChange={e => setEmpForm(f => ({ ...f, salary_annual: e.target.value }))} />
          }
          <Input label="Date d'embauche" type="date" value={empForm.hire_date} onChange={e => setEmpForm(f => ({ ...f, hire_date: e.target.value }))} />
          <Input label="Adresse" value={empForm.address} onChange={e => setEmpForm(f => ({ ...f, address: e.target.value }))} />
          <Input label="Ville" value={empForm.city} onChange={e => setEmpForm(f => ({ ...f, city: e.target.value }))} />
          <Input label="Code postal" value={empForm.postal_code} onChange={e => setEmpForm(f => ({ ...f, postal_code: e.target.value }))} />
          <Input label="Contact urgence - Nom" value={empForm.emergency_contact_name} onChange={e => setEmpForm(f => ({ ...f, emergency_contact_name: e.target.value }))} />
          <Input label="Contact urgence - Tél" value={empForm.emergency_contact_phone} onChange={e => setEmpForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} />
          <Textarea label="Notes" value={empForm.notes} onChange={e => setEmpForm(f => ({ ...f, notes: e.target.value }))} className="col-span-2" />
        </div>
      </Modal>

      {/* Subcontractor Modal */}
      <Modal isOpen={showModal && modalType === 'subcontractor'} onClose={() => setShowModal(false)} title="Nouveau Sous-Traitant" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSaveST} loading={saving}>Sauvegarder</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Compagnie *" value={stForm.company_name} onChange={e => setStForm(f => ({ ...f, company_name: e.target.value }))} className="col-span-2" />
          <Input label="Contact *" value={stForm.contact_name} onChange={e => setStForm(f => ({ ...f, contact_name: e.target.value }))} />
          <Input label="Téléphone" type="tel" value={stForm.phone} onChange={e => setStForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Courriel" type="email" value={stForm.email} onChange={e => setStForm(f => ({ ...f, email: e.target.value }))} className="col-span-2" />
          <Input label="Spécialités (séparées par virgule)" value={stForm.specialty} onChange={e => setStForm(f => ({ ...f, specialty: e.target.value }))} className="col-span-2" placeholder="Roofing, Siding, Isolation" />
          <Input label="NEQ" value={stForm.neq_number} onChange={e => setStForm(f => ({ ...f, neq_number: e.target.value }))} />
          <Input label="RBQ" value={stForm.rbq_number} onChange={e => setStForm(f => ({ ...f, rbq_number: e.target.value }))} />
          <Input label="No. TPS/GST" value={stForm.gst_number} onChange={e => setStForm(f => ({ ...f, gst_number: e.target.value }))} />
          <Input label="No. TVQ/QST" value={stForm.qst_number} onChange={e => setStForm(f => ({ ...f, qst_number: e.target.value }))} />
          <Input label="Taux par défaut ($)" type="number" value={stForm.default_rate} onChange={e => setStForm(f => ({ ...f, default_rate: e.target.value }))} />
          <Input label="Délai de paiement (jours)" type="number" value={stForm.payment_terms} onChange={e => setStForm(f => ({ ...f, payment_terms: e.target.value }))} />
          <Input label="Ville" value={stForm.city} onChange={e => setStForm(f => ({ ...f, city: e.target.value }))} />
          <Input label="Province" value={stForm.province} onChange={e => setStForm(f => ({ ...f, province: e.target.value }))} />
          <Textarea label="Notes" value={stForm.notes} onChange={e => setStForm(f => ({ ...f, notes: e.target.value }))} className="col-span-2" />
        </div>
      </Modal>
    </>
  )
}
