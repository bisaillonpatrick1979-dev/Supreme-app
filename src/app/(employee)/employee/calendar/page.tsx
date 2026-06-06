import { createClient } from '@/lib/supabase/server'
import { formatDate, formatHours } from '@/lib/utils/format'
import { redirect } from 'next/navigation'

export default async function EmployeeCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/employee-pin')

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!employee) redirect('/employee-pin')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const { data: sessions } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('employee_id', employee.id)
    .gte('date', monthStart.toISOString().split('T')[0])
    .lte('date', monthEnd.toISOString().split('T')[0])

  // Build calendar grid
  const sessionMap = new Map(sessions?.map(s => [s.date, s]) ?? [])

  const firstDay = monthStart.getDay()
  const daysInMonth = monthEnd.getDate()
  const calendarDays: (null | Date)[] = [
    ...Array(firstDay === 0 ? 6 : firstDay - 1).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(now.getFullYear(), now.getMonth(), i + 1)),
  ]

  const monthTotal = sessions?.reduce((s, ws) => s + ws.hours_total, 0) ?? 0
  const workDays = sessions?.length ?? 0

  return (
    <>
      <header className="flex items-center px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg-card))' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>Mon Calendrier</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {now.toLocaleString('fr-CA', { month: 'long', year: 'numeric' })} •
            {' '}{formatHours(monthTotal)} • {workDays} jours travaillés
          </p>
        </div>
      </header>

      <div className="hm-content">
        <div className="hm-card">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d} className="text-center text-xs font-semibold py-2"
                style={{ color: 'rgb(var(--color-text-muted))' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={i} />

              const dateStr = day.toISOString().split('T')[0]
              const session = sessionMap.get(dateStr)
              const isToday = dateStr === now.toISOString().split('T')[0]
              const isWeekend = day.getDay() === 0 || day.getDay() === 6

              return (
                <div
                  key={i}
                  className="aspect-square flex flex-col items-center justify-center rounded-lg p-1 relative"
                  style={{
                    background: isToday
                      ? 'rgb(var(--color-primary))'
                      : session
                        ? 'rgb(var(--color-success) / 0.15)'
                        : isWeekend
                          ? 'transparent'
                          : 'rgb(var(--color-bg-secondary))',
                    border: isToday ? 'none' : `1px solid ${session ? 'rgb(var(--color-success) / 0.3)' : 'rgb(var(--color-border-subtle))'}`,
                  }}
                >
                  <span className="text-xs font-medium" style={{
                    color: isToday ? 'white' : 'rgb(var(--color-text))'
                  }}>
                    {day.getDate()}
                  </span>
                  {session && !isToday && (
                    <span className="text-xs" style={{ color: 'rgb(var(--color-success))' }}>
                      {Math.round(session.hours_total)}h
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: 'rgb(var(--color-primary))' }} />
              {"Aujourd'hui"}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: 'rgb(var(--color-success) / 0.3)' }} />
              Journée travaillée
            </div>
          </div>
        </div>

        {/* Recent sessions list */}
        <div className="hm-card mt-4">
          <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Sessions du mois</h3>
          <div className="space-y-2">
            {sessions?.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: 'rgb(var(--color-border-subtle))' }}>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>{formatDate(s.date)}</p>
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {formatHours(s.hours_total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
