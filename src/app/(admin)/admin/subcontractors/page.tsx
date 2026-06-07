'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Plus, AlertTriangle, Phone, Mail, Building2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatPhone, formatCurrency } from '@/lib/utils/format'
import type { Subcontractor } from '@/types/database'

const specialties = ['toiture', 'revêtement', 'isolation', 'menuiserie', 'électricité', 'plomberie', 'autres']

export default function SubcontractorsPage() {
  const [subs, setSubs] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '',
    specialty: [] as string[],
    neq_number: '', rbq_number: '', insurance_expiry: '',
    rate_type: 'daily', default_rate: '',
    address: '', city: '', province: 'QC', postal_code: '',
    gst_number: '', qst_number: '',
    payment_terms: '30', notes: '',
  })
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('subcontractors').select('*').order('company_name')
    setSubs(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const toggleSpecialty = (s: string) =>
    setForm(f => ({
      ...f,
      specialty: f.specialty.includes(s) ? f.specialty.filter(x => x !== s) : [...f.specialty, s],
    }))

  const save = async () => {
    if (!form.company_name || !form.contact_name) {
      toast.error('Nom de compagnie et contact requis')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('subcontractors').insert([{
      company_name: form.company_name,
      contact_name: form.contact_name,
      email: form.email || null,
      phone: form.phone || null,
      specialty: form.specialty,
      neq_number: form.neq_number || null,
      rbq_number: form.rbq_number || null,
      insurance_expiry: form.insurance_expiry || null,
      rate_type: form.rate_type,
      default_rate: form.default_rate ? parseFloat(form.default_rate) : null,
      address: form.address || null,
      city: form.city || null,
      province: form.province || null,
      postal_code: form.postal_code || null,
      gst_number: form.gst_number || null,
      qst_number: form.qst_number || null,
      payment_terms: parseInt(form.payment_terms) || 30,
      notes: form.notes || null,
    }])
    if (error) {
      toast.error('Erreur: ' + error.message)
    } else {
      toast.success('Sous-traitant ajouté')
      setShowModal(false)
      setForm({
        company_name: '', contact_name: '', email: '', phone: '', specialty: [],
        neq_number: '', rbq_number: '', insurance_expiry: '',
        rate_type: 'daily', default_rate: '',
        address: '', city: '', province: 'QC', postal_code: '',
        gst_number: '', qst_number: '', payment_terms: '30', notes: '',
      })
      load()
    }
    setSaving(false)
  }

  const insuranceExpiringSoon = (expiry: string | null) => {
    if (!expiry) return false
    const d = new Date(expiry)
    const in60 = new Date()
    in60.setDate(in60.getDate() + 60)
    return d <= in60
  }

  const expiredCount = subs.filter(s => s.insurance_expiry && new Date(s.insurance_expiry) < new Date()).length
  const expiringSoonCount = subs.filter(s => s.insurance_expiry && insuranceExpiringSoon(s.insurance_expiry) && new Date(s.insurance_expiry) >= new Date()).length

  return (
    <>
      <AdminHeader title="Sous-traitants" subtitle={`${subs.length} sous-traitants enregistrés`} />
      <div className="hm-content">

        {/* Warnings */}
        {(expiredCount > 0 || expiringSoonCount > 0) && (
          <div className="flex items-center gap-3 p-4 rounded-xl mb-6"
            style={{ background: 'rgb(var(--color-warning) / 0.1)', border: '1px solid rgb(var(--color-warning) / 0.3)' }}>
            <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: 'rgb(var(--color-warning))' }} />
            <p className="text-sm" style={{ color: 'rgb(var(--color-warning))' }}>
              {expiredCount > 0 && <><strong>{expiredCount}</strong> assurance{expiredCount > 1 ? 's' : ''} expirée{expiredCount > 1 ? 's' : ''}. </>}
              {expiringSoonCount > 0 && <><strong>{expiringSoonCount}</strong> assurance{expiringSoonCount > 1 ? 's' : ''} expirant dans 60 jours.</>}
            </p>
          </div>
        )}

        <div className="flex justify-end mb-4">
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Nouveau sous-traitant
          </Button>
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="hm-skeleton h-48" />)
          ) : subs.length === 0 ? (
            <p className="col-span-full text-center py-12 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Aucun sous-traitant. Ajoutez votre premier partenaire.
            </p>
          ) : subs.map(sub => {
            const expired = sub.insurance_expiry && new Date(sub.insurance_expiry) < new Date()
            const expiring = sub.insurance_expiry && insuranceExpiringSoon(sub.insurance_expiry) && !expired

            return (
              <div key={sub.id} className="hm-card space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{sub.company_name}</p>
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{sub.contact_name}</p>
                  </div>
                  <Badge variant={sub.is_active ? 'success' : 'muted'}>
                    {sub.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>

                {/* Specialties */}
                {sub.specialty.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sub.specialty.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ background: 'rgb(var(--color-primary-muted))', color: 'rgb(var(--color-primary))' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Contact */}
                <div className="space-y-1.5">
                  {sub.email && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Mail className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{sub.email}</span>
                    </div>
                  )}
                  {sub.phone && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Phone className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{formatPhone(sub.phone)}</span>
                    </div>
                  )}
                  {sub.city && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Building2 className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{sub.city}, {sub.province}</span>
                    </div>
                  )}
                </div>

                {/* Legal numbers */}
                <div className="pt-2 border-t space-y-1" style={{ borderColor: 'rgb(var(--color-border-subtle))' }}>
                  {sub.rbq_number && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Shield className="w-3 h-3" style={{ color: 'rgb(var(--color-primary))' }} />
                      <span style={{ color: 'rgb(var(--color-text-muted))' }}>RBQ:</span>
                      <span className="font-mono" style={{ color: 'rgb(var(--color-text))' }}>{sub.rbq_number}</span>
                    </div>
                  )}
                  {sub.neq_number && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Building2 className="w-3 h-3" style={{ color: 'rgb(var(--color-primary))' }} />
                      <span style={{ color: 'rgb(var(--color-text-muted))' }}>NEQ:</span>
                      <span className="font-mono" style={{ color: 'rgb(var(--color-text))' }}>{sub.neq_number}</span>
                    </div>
                  )}
                  {sub.insurance_expiry && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-3 h-3"
                        style={{ color: expired ? 'rgb(var(--color-danger))' : expiring ? 'rgb(var(--color-warning))' : 'rgb(var(--color-success))' }} />
                      <span style={{ color: 'rgb(var(--color-text-muted))' }}>Assurance:</span>
                      <span style={{ color: expired ? 'rgb(var(--color-danger))' : expiring ? 'rgb(var(--color-warning))' : 'rgb(var(--color-text))' }}>
                        {formatDate(sub.insurance_expiry)}
                        {expired && ' — EXPIRÉE'}
                        {expiring && ' — bientôt'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Rate */}
                {sub.default_rate != null && (
                  <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Tarif: <span className="font-semibold" style={{ color: 'rgb(var(--color-success))' }}>
                      {formatCurrency(sub.default_rate)}
                    </span>
                    {' '}/ {sub.rate_type === 'daily' ? 'jour' : sub.rate_type === 'hourly' ? 'heure' : 'forfait'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Add modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau sous-traitant"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={save} loading={saving}>Enregistrer</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Compagnie *" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="col-span-2" />
          <Input label="Nom du contact *" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
          <Input label="Téléphone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Courriel" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="col-span-2" />

          {/* Specialties */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Spécialités</label>
            <div className="flex flex-wrap gap-2">
              {specialties.map(s => (
                <button key={s} type="button"
                  onClick={() => toggleSpecialty(s)}
                  className="px-3 py-1 rounded-full text-xs font-medium capitalize transition-all"
                  style={{
                    background: form.specialty.includes(s) ? 'rgb(var(--color-primary))' : 'rgb(var(--color-bg-elevated))',
                    color: form.specialty.includes(s) ? 'white' : 'rgb(var(--color-text-muted))',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Input label="Numéro NEQ" value={form.neq_number} onChange={e => setForm(f => ({ ...f, neq_number: e.target.value }))} placeholder="1234567890" />
          <Input label="Numéro RBQ" value={form.rbq_number} onChange={e => setForm(f => ({ ...f, rbq_number: e.target.value }))} placeholder="5764-1234-01" />
          <Input label="Expiration assurance" type="date" value={form.insurance_expiry} onChange={e => setForm(f => ({ ...f, insurance_expiry: e.target.value }))} />
          <Select label="Type de tarif" value={form.rate_type} onChange={e => setForm(f => ({ ...f, rate_type: e.target.value }))}
            options={[
              { value: 'daily', label: 'Journalier' },
              { value: 'hourly', label: 'Horaire' },
              { value: 'fixed', label: 'Forfait' },
            ]} />
          <Input label="Tarif par défaut ($)" type="number" value={form.default_rate} onChange={e => setForm(f => ({ ...f, default_rate: e.target.value }))} />
          <Input label="Conditions paiement (jours)" type="number" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} />
          <Input label="Numéro TPS" value={form.gst_number} onChange={e => setForm(f => ({ ...f, gst_number: e.target.value }))} />
          <Input label="Numéro TVQ" value={form.qst_number} onChange={e => setForm(f => ({ ...f, qst_number: e.target.value }))} />
          <Input label="Ville" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          <Input label="Province" value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} />
          <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="col-span-2" />
        </div>
      </Modal>
    </>
  )
}
