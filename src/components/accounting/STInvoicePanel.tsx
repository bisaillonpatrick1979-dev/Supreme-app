'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { InvoiceStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils/format'
import { CheckCircle, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

interface STInvoice {
  id: string
  amount: number
  status: string
  invoice_number: string
  subcontractor: { company_name: string } | null
  project: { name: string } | null
}

export function STInvoicePanel({ initialInvoices }: { initialInvoices: STInvoice[] }) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createClient()

  const approve = async (id: string) => {
    setLoading(id + '-approve')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('st_invoices').update({
      status: 'approved',
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) {
      toast.error('Erreur: ' + error.message)
    } else {
      toast.success('Facture approuvée')
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'approved' } : inv))
    }
    setLoading(null)
  }

  const markPaid = async (id: string) => {
    setLoading(id + '-pay')
    const { error } = await supabase.from('st_invoices').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) {
      toast.error('Erreur: ' + error.message)
    } else {
      toast.success('Facture marquée payée')
      setInvoices(prev => prev.filter(inv => inv.id !== id))
    }
    setLoading(null)
  }

  const visible = invoices.filter(inv => inv.status !== 'paid')

  if (visible.length === 0) return null

  return (
    <div className="hm-card mb-6">
      <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
        {"Factures sous-traitants en attente d'approbation"}
      </h3>
      <div className="space-y-2">
        {visible.map(inv => (
          <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg"
            style={{ background: 'rgb(var(--color-bg-secondary))' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {inv.subcontractor?.company_name}
              </p>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {inv.project?.name} • #{inv.invoice_number}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {formatCurrency(inv.amount)}
              </span>
              <InvoiceStatusBadge status={inv.status as any} />
              {inv.status === 'pending' && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={loading === inv.id + '-approve'}
                  onClick={() => approve(inv.id)}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Approuver
                </Button>
              )}
              {inv.status === 'approved' && (
                <Button
                  size="sm"
                  loading={loading === inv.id + '-pay'}
                  onClick={() => markPaid(inv.id)}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Marquer payé
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
