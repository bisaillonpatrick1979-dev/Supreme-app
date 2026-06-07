'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'rgb(var(--color-bg))' }}>
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgb(var(--color-danger) / 0.15)' }}>
          <AlertTriangle className="w-8 h-8" style={{ color: 'rgb(var(--color-danger))' }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          Une erreur est survenue
        </h1>
        <p className="mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {error.message || 'Une erreur inattendue s\'est produite.'}
        </p>
        {error.digest && (
          <p className="text-xs mb-6 font-mono" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Code: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Réessayer</Button>
          <Button variant="secondary" onClick={() => window.location.href = '/'}>
            Accueil
          </Button>
        </div>
      </div>
    </div>
  )
}
