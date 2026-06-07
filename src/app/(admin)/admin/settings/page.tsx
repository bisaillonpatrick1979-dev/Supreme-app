'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Building2, Phone, Mail, Hash, Save } from 'lucide-react'
import { toast } from 'sonner'

interface Settings {
  company_name: string
  company_address: string
  company_city: string
  company_province: string
  company_postal: string
  company_phone: string
  company_email: string
  company_gst_number: string
  company_qst_number: string
  company_rbq_number: string
  default_payment_terms: string
  invoice_notes_default: string
  gst_rate: string
  qst_rate: string
}

const defaultSettings: Settings = {
  company_name: '',
  company_address: '',
  company_city: '',
  company_province: 'QC',
  company_postal: '',
  company_phone: '',
  company_email: '',
  company_gst_number: '',
  company_qst_number: '',
  company_rbq_number: '',
  default_payment_terms: '30',
  invoice_notes_default: '',
  gst_rate: '0.05',
  qst_rate: '0.09975',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('company_settings').select('key, value')
    if (data) {
      const map = Object.fromEntries(data.map(r => [r.key, r.value ?? '']))
      setSettings(prev => ({ ...prev, ...map }))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadSettings() }, [loadSettings])

  const save = async () => {
    setSaving(true)
    const upserts = Object.entries(settings).map(([key, value]) => ({ key, value }))
    const { error } = await supabase.from('company_settings').upsert(upserts, { onConflict: 'key' })
    if (error) {
      toast.error('Erreur: ' + error.message)
    } else {
      toast.success('Paramètres sauvegardés')
    }
    setSaving(false)
  }

  const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setSettings(prev => ({ ...prev, [key]: e.target.value }))

  if (loading) {
    return (
      <>
        <AdminHeader title="Paramètres" subtitle="Configuration de l'entreprise" />
        <div className="hm-content space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="hm-skeleton h-32" />)}
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Paramètres" subtitle="Configuration de l'entreprise" />
      <div className="hm-content max-w-3xl">

        {/* Company profile */}
        <div className="hm-card mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary))' }} />
            <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Profil de l&apos;entreprise</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nom de l'entreprise"
              value={settings.company_name}
              onChange={set('company_name')}
              className="col-span-2"
            />
            <Input
              label="Adresse"
              value={settings.company_address}
              onChange={set('company_address')}
              className="col-span-2"
            />
            <Input label="Ville" value={settings.company_city} onChange={set('company_city')} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Province" value={settings.company_province} onChange={set('company_province')} />
              <Input label="Code postal" value={settings.company_postal} onChange={set('company_postal')} placeholder="H0H 0H0" />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="hm-card mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Phone className="w-5 h-5" style={{ color: 'rgb(var(--color-primary))' }} />
            <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Coordonnées</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Téléphone" value={settings.company_phone} onChange={set('company_phone')} placeholder="(514) 555-0000" />
            <Input label="Courriel" type="email" value={settings.company_email} onChange={set('company_email')} />
          </div>
        </div>

        {/* Tax numbers */}
        <div className="hm-card mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Hash className="w-5 h-5" style={{ color: 'rgb(var(--color-primary))' }} />
            <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Numéros officiels</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Numéro TPS (fédéral)" value={settings.company_gst_number} onChange={set('company_gst_number')} placeholder="123456789 RT0001" />
            <Input label="Numéro TVQ (provincial)" value={settings.company_qst_number} onChange={set('company_qst_number')} placeholder="1234567890 TQ0001" />
            <Input label="Numéro RBQ" value={settings.company_rbq_number} onChange={set('company_rbq_number')} placeholder="5764-1234-01" />
          </div>
        </div>

        {/* Billing defaults */}
        <div className="hm-card mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Mail className="w-5 h-5" style={{ color: 'rgb(var(--color-primary))' }} />
            <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Paramètres de facturation</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Délai de paiement (jours)"
              type="number"
              value={settings.default_payment_terms}
              onChange={set('default_payment_terms')}
            />
            <Input
              label="Taux TPS"
              type="number"
              step="0.001"
              value={settings.gst_rate}
              onChange={set('gst_rate')}
            />
            <Input
              label="Taux TVQ"
              type="number"
              step="0.001"
              value={settings.qst_rate}
              onChange={set('qst_rate')}
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              Note par défaut sur les factures
            </label>
            <textarea
              rows={3}
              value={settings.invoice_notes_default}
              onChange={set('invoice_notes_default')}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{
                background: 'rgb(var(--color-bg-elevated))',
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>
            <Save className="w-4 h-4" />
            Sauvegarder les paramètres
          </Button>
        </div>
      </div>
    </>
  )
}
