import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency, formatHours, formatDate } from '@/lib/utils/format'
import { Clock, DollarSign, Calendar, TrendingUp } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function EmployeeDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/employee-pin')

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!employee) redirect('/employee-pin')

  // Get this week's work sessions
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)

  const { data: weekSessions } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('employee_id', employee.id)
    .gte('date', weekStart.toISOString().split('T')[0])

  const weekHours = weekSessions?.reduce((sum, s) => sum + (s.hours_total || 0), 0) ?? 0
  const weekPay = weekSessions?.reduce((sum, s) => sum + (s.gross_pay || 0), 0) ?? 0

  // Get last punch
  const { data: lastPunch } = await supabase
    .from('punch_records')
    .select('*')
    .eq('employee_id', employee.id)
    .order('punched_at', { ascending: false })
    .limit(1)
    .single()

  const isClockedIn = lastPunch?.punch_type === 'in' || lastPunch?.punch_type === 'break_end'

  // Month stats
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: monthSessions } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('employee_id', employee.id)
    .gte('date', monthStart.toISOString().split('T')[0])

  const monthHours = monthSessions?.reduce((sum, s) => sum + (s.hours_total || 0), 0) ?? 0
  const monthPay = monthSessions?.reduce((sum, s) => sum + (s.gross_pay || 0), 0) ?? 0

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg-card))' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            Bonjour, {employee.first_name} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {formatDate(new Date().toISOString())} •{' '}
            <span style={{ color: isClockedIn ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))' }}>
              {isClockedIn ? '● Pointé' : '○ Non pointé'}
            </span>
          </p>
        </div>
      </header>

      <div className="hm-content">
        {/* Quick punch CTA */}
        {!isClockedIn && (
          <Link href="/employee/punch"
            className="flex items-center gap-4 p-5 rounded-xl mb-6 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary) / 0.2), rgb(var(--color-accent) / 0.2))', border: '1px solid rgb(var(--color-primary) / 0.3)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse-ring"
              style={{ background: 'rgb(var(--color-primary))' }}>
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Vous n&apos;êtes pas encore pointé</p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Cliquez pour pointer</p>
            </div>
          </Link>
        )}

        {isClockedIn && (
          <Link href="/employee/punch"
            className="flex items-center gap-4 p-5 rounded-xl mb-6 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: 'rgb(var(--color-success) / 0.1)', border: '1px solid rgb(var(--color-success) / 0.3)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgb(var(--color-success))' }}>
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Vous êtes pointé ✓</p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Depuis {lastPunch?.punched_at ? formatDate(lastPunch.punched_at) : '—'} • Cliquez pour pointer la sortie</p>
            </div>
          </Link>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Heures cette semaine" value={formatHours(weekHours)} icon={Clock} color="primary" />
          <StatCard label="Paye brute semaine" value={formatCurrency(weekPay)} icon={DollarSign} color="success" />
          <StatCard label="Heures ce mois" value={formatHours(monthHours)} icon={Calendar} color="info" />
          <StatCard label="Paye brute mois" value={formatCurrency(monthPay)} icon={TrendingUp} color="warning" />
        </div>

        {/* Recent sessions */}
        <div className="hm-card">
          <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Récentes Sessions</h3>
          {weekSessions && weekSessions.length > 0 ? (
            <div className="space-y-2">
              {weekSessions.slice(0, 7).map(session => (
                <div key={session.id} className="flex items-center justify-between py-2.5 border-b last:border-0"
                  style={{ borderColor: 'rgb(var(--color-border-subtle))' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {formatDate(session.date)}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {formatHours(session.hours_regular)} reg
                      {session.hours_overtime > 0 && ` + ${formatHours(session.hours_overtime)} supp`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-success))' }}>
                      {formatCurrency(session.gross_pay)}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {formatHours(session.hours_total)} total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Aucune session cette semaine
            </p>
          )}
        </div>
      </div>
    </>
  )
}
