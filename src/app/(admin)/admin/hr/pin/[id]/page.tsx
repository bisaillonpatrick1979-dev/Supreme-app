'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Key, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Employee } from '@/types/database'

export default function SetPinPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasPIN, setHasPIN] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('employees').select('*').eq('id', id).single().then(({ data }) => {
      setEmployee(data)
      setHasPIN(!!data?.pin_hash)
    })
  }, [id])

  const handleSave = async () => {
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error('Le PIN doit être exactement 4 chiffres')
      return
    }
    if (pin !== pinConfirm) {
      toast.error('Les PINs ne correspondent pas')
      return
    }
    setSaving(true)
    const res = await fetch('/api/auth/set-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: id, pin }),
    })
    if (res.ok) {
      toast.success('PIN configuré avec succès!')
      setHasPIN(true)
      setPin('')
      setPinConfirm('')
    } else {
      toast.error('Erreur lors de la configuration du PIN')
    }
    setSaving(false)
  }

  if (!employee) return <div className="hm-content"><div className="hm-skeleton h-48" /></div>

  const digits = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']]

  const handleDigit = (d: string, field: 'pin' | 'confirm') => {
    const setter = field === 'pin' ? setPin : setPinConfirm
    const value = field === 'pin' ? pin : pinConfirm
    if (d === '⌫') { setter(v => v.slice(0, -1)); return }
    if (value.length < 4) setter(v => v + d)
  }

  const PinInput = ({ value, field }: { value: string; field: 'pin' | 'confirm' }) => (
    <div className="space-y-4">
      <div className="flex justify-center gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-4 h-4 rounded-full border-2 transition-all"
            style={{
              borderColor: i < value.length ? 'rgb(var(--color-primary))' : 'rgb(var(--color-border))',
              background: i < value.length ? 'rgb(var(--color-primary))' : 'transparent',
              transform: i < value.length ? 'scale(1.2)' : 'scale(1)',
            }} />
        ))}
      </div>
      <div className="grid gap-2 max-w-48 mx-auto">
        {digits.map((row, ri) => (
          <div key={ri} className="grid grid-cols-3 gap-2">
            {row.map((d, ci) => (
              d === '' ? <div key={ci} /> : (
                <button key={ci} onClick={() => handleDigit(d, field)} disabled={d !== '⌫' && value.length >= 4}
                  className="h-12 rounded-xl text-lg font-bold transition-all duration-150 active:scale-95"
                  style={{ background: 'rgb(var(--color-bg-secondary))', color: 'rgb(var(--color-text))', border: '1px solid rgb(var(--color-border))' }}>
                  {d}
                </button>
              )
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <AdminHeader title="Configuration PIN" subtitle={`${employee.first_name} ${employee.last_name}`} />
      <div className="hm-content">
        <Link href="/admin/hr" className="flex items-center gap-2 text-sm mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <ArrowLeft className="w-4 h-4" /> Retour RH
        </Link>

        <div className="max-w-md mx-auto">
          {hasPIN && (
            <div className="flex items-center gap-3 p-4 rounded-xl mb-6"
              style={{ background: 'rgb(var(--color-success) / 0.1)', border: '1px solid rgb(var(--color-success) / 0.3)' }}>
              <CheckCircle className="w-5 h-5 shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-success))' }}>PIN déjà configuré</p>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Vous pouvez modifier le PIN en entrant un nouveau ci-dessous</p>
              </div>
            </div>
          )}

          <div className="hm-card space-y-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgb(var(--color-primary-muted))' }}>
                <Key className="w-7 h-7" style={{ color: 'rgb(var(--color-primary))' }} />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {hasPIN ? 'Modifier le PIN' : 'Créer un PIN'}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Ce PIN permettra à l&apos;employé de pointer via le portail
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-center mb-3" style={{ color: 'rgb(var(--color-text))' }}>Nouveau PIN</p>
              <PinInput value={pin} field="pin" />
            </div>

            <div>
              <p className="text-sm font-medium text-center mb-3" style={{ color: 'rgb(var(--color-text))' }}>Confirmer le PIN</p>
              <PinInput value={pinConfirm} field="confirm" />
            </div>

            {pin.length === 4 && pinConfirm.length === 4 && pin !== pinConfirm && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-danger))' }}>
                <AlertTriangle className="w-4 h-4" /> Les PINs ne correspondent pas
              </div>
            )}

            <Button
              onClick={handleSave}
              loading={saving}
              disabled={pin.length !== 4 || pinConfirm.length !== 4 || pin !== pinConfirm}
              className="w-full hm-btn-lg"
            >
              {hasPIN ? 'Modifier le PIN' : 'Créer le PIN'}
            </Button>
          </div>

          <p className="text-xs text-center mt-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Le PIN est chiffré (bcrypt) et ne peut pas être récupéré. En cas d&apos;oubli, créez-en un nouveau.
          </p>
        </div>
      </div>
    </>
  )
}
