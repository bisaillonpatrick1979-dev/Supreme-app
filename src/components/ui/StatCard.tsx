import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/format'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  change?: { value: number; label?: string }
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const colorMap = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-info)',
}

export function StatCard({ label, value, icon: Icon, change, color = 'primary', className }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className={cn('hm-stat', className)}>
      <div className="flex items-start justify-between">
        <p className="hm-stat-label">{label}</p>
        {Icon && (
          <div className="p-2 rounded-lg" style={{ background: `rgb(${c} / 0.15)` }}>
            <Icon className="w-5 h-5" style={{ color: `rgb(${c})` }} />
          </div>
        )}
      </div>
      <p className="hm-stat-value">{value}</p>
      {change !== undefined && (
        <p className="text-xs" style={{ color: change.value >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-danger))' }}>
          {change.value >= 0 ? '↑' : '↓'} {Math.abs(change.value)}% {change.label ?? ''}
        </p>
      )}
    </div>
  )
}
