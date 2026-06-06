'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'
import Link from 'next/link'
import { Shield, Lock, Mail, HardHat } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('Identifiants incorrects')
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'rgb(var(--color-bg))' }}>
      {/* Left - Branding */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.15), rgba(var(--color-accent), 0.15))' }}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, rgb(var(--color-primary)) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 text-center">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 font-black text-3xl text-white"
            style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))' }}>
            HX
          </div>
          <h1 className="text-4xl font-black mb-4 hm-gradient-text">HailiteManager</h1>
          <p className="text-lg mb-8" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            Plateforme de gestion complète<br />pour Hailite Xteriors
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto text-sm">
            {['Chantiers GPS', 'Facturation', 'Ressources Humaines', 'Analytiques'].map(f => (
              <div key={f} className="hm-card text-center py-3 px-2">
                <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgb(var(--color-primary-muted))' }}>
              <Shield className="w-7 h-7" style={{ color: 'rgb(var(--color-primary))' }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              Portail Administration
            </h2>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Accès réservé aux administrateurs
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="hm-field">
              <label className="hm-label">Courriel</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@hailite.com"
                  className="hm-input pl-9"
                  required
                />
              </div>
            </div>

            <div className="hm-field">
              <label className="hm-label">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="hm-input pl-9"
                  required
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full hm-btn-lg">
              Se connecter
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Vous êtes un employé?
            </p>
            <Link href="/employee-pin" className="hm-btn hm-btn-ghost w-full mt-2 justify-center">
              <HardHat className="w-4 h-4" />
              Pointer (Employé)
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
