'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function PaymentSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.push('/'), 8000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'rgb(var(--color-bg))' }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgb(var(--color-success) / 0.15)' }}>
          <CheckCircle className="w-10 h-10" style={{ color: 'rgb(var(--color-success))' }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          Paiement réussi!
        </h1>
        <p className="mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
          Votre paiement a été traité avec succès. Vous recevrez une confirmation par courriel.
        </p>
        <Button onClick={() => router.push('/')}>Retour à l&apos;accueil</Button>
        <p className="text-xs mt-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
          Redirection automatique dans 8 secondes...
        </p>
      </div>
    </div>
  )
}
