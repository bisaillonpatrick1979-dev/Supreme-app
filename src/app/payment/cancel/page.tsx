'use client'

import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function PaymentCancelPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'rgb(var(--color-bg))' }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgb(var(--color-danger) / 0.15)' }}>
          <XCircle className="w-10 h-10" style={{ color: 'rgb(var(--color-danger))' }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          Paiement annulé
        </h1>
        <p className="mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
          Votre paiement a été annulé. Aucun montant n&apos;a été débité.
        </p>
        <Button onClick={() => router.back()}>Retour</Button>
      </div>
    </div>
  )
}
