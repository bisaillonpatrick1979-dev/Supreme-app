'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Delete, HardHat, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const PIN_LENGTH = 4

export default function EmployeePinPage() {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const router = useRouter()

  const handleDigit = (digit: string) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + digit
      setPin(newPin)
      if (newPin.length === PIN_LENGTH) {
        handleSubmit(newPin)
      }
    }
  }

  const handleDelete = () => setPin(p => p.slice(0, -1))

  const handleSubmit = async (pinValue: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      })

      if (!res.ok) {
        throw new Error('PIN incorrect')
      }

      const data = await res.json()

      if (data.redirectTo === 'punch') {
        router.push('/employee/punch')
      } else {
        router.push('/employee/dashboard')
      }
    } catch {
      toast.error('PIN incorrect. Réessayez.')
      setShake(true)
      setTimeout(() => { setShake(false); setPin('') }, 600)
    } finally {
      setLoading(false)
    }
  }

  const digits = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'rgb(var(--color-bg))' }}>
      <div className="w-full max-w-xs">
        {/* Back link */}
        <Link href="/login" className="flex items-center gap-2 text-sm mb-8"
          style={{ color: 'rgb(var(--color-text-muted))' }}>
          <ArrowLeft className="w-4 h-4" />
          Retour (Admin)
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))' }}>
            <HardHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            Pointage Employé
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Entrez votre PIN à {PIN_LENGTH} chiffres
          </p>
        </div>

        {/* PIN dots */}
        <div className={`flex justify-center gap-4 mb-8 transition-all ${shake ? 'animate-bounce' : ''}`}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border-2 transition-all duration-200"
              style={{
                borderColor: i < pin.length ? 'rgb(var(--color-primary))' : 'rgb(var(--color-border))',
                backgroundColor: i < pin.length ? 'rgb(var(--color-primary))' : 'transparent',
                transform: i < pin.length ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid gap-3">
          {digits.map((row, ri) => (
            <div key={ri} className="grid grid-cols-3 gap-3">
              {row.map((d, ci) => {
                if (!d) return <div key={ci} />
                if (d === 'del') {
                  return (
                    <button
                      key={ci}
                      onClick={handleDelete}
                      disabled={loading || pin.length === 0}
                      className="h-16 rounded-2xl flex items-center justify-center text-sm font-medium
                                 transition-all duration-150 active:scale-95"
                      style={{
                        background: 'rgb(var(--color-bg-elevated))',
                        color: 'rgb(var(--color-text-secondary))',
                        border: '1px solid rgb(var(--color-border))',
                      }}
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  )
                }
                return (
                  <button
                    key={ci}
                    onClick={() => handleDigit(d)}
                    disabled={loading || pin.length >= PIN_LENGTH}
                    className="h-16 rounded-2xl text-xl font-bold transition-all duration-150 active:scale-95"
                    style={{
                      background: 'rgb(var(--color-bg-card))',
                      color: 'rgb(var(--color-text))',
                      border: '1px solid rgb(var(--color-border))',
                    }}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {loading && (
          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Vérification...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
