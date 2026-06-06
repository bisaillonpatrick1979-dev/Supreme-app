import { cn } from '@/lib/utils/format'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted'

const variantMap: Record<BadgeVariant, string> = {
  success: 'hm-badge-success',
  warning: 'hm-badge-warning',
  danger: 'hm-badge-danger',
  info: 'hm-badge-info',
  muted: 'hm-badge-muted',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'muted', children, className }: BadgeProps) {
  return (
    <span className={cn(variantMap[variant], className)}>
      {children}
    </span>
  )
}

export function ProjectStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    lead: { label: 'Lead', variant: 'muted' },
    quoted: { label: 'Soumis', variant: 'info' },
    contracted: { label: 'Contracté', variant: 'warning' },
    in_progress: { label: 'En cours', variant: 'success' },
    completed: { label: 'Terminé', variant: 'success' },
    cancelled: { label: 'Annulé', variant: 'danger' },
  }
  const s = map[status] ?? { label: status, variant: 'muted' as BadgeVariant }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    draft: { label: 'Brouillon', variant: 'muted' },
    pending: { label: 'En attente', variant: 'warning' },
    approved: { label: 'Approuvé', variant: 'info' },
    paid: { label: 'Payé', variant: 'success' },
    overdue: { label: 'En retard', variant: 'danger' },
    cancelled: { label: 'Annulé', variant: 'danger' },
  }
  const s = map[status] ?? { label: status, variant: 'muted' as BadgeVariant }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'À faire', variant: 'muted' },
    in_progress: { label: 'En cours', variant: 'info' },
    completed: { label: 'Terminé', variant: 'success' },
    blocked: { label: 'Bloqué', variant: 'danger' },
  }
  const s = map[status] ?? { label: status, variant: 'muted' as BadgeVariant }
  return <Badge variant={s.variant}>{s.label}</Badge>
}
