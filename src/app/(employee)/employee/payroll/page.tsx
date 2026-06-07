import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatHours, formatDate } from '@/lib/utils/format'
import { redirect } from 'next/navigation'
import { DollarSign, Clock, TrendingDown, CheckCircle } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { calculateDeductions } from '@/lib/utils/payroll'
import { PayrollPDFButton } from '@/components/employee/PayrollPDFButton'

export default async function PayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/employee-pin')

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!employee) redirect('/employee-pin')

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const { data: sessions } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('employee_id', employee.id)
    .gte('date', `${currentYear}-01-01`)
    .order('date', { ascending: false })

  const ytdHours = sessions?.reduce((s, ws) => s + ws.hours_total, 0) ?? 0
  const ytdGross = sessions?.reduce((s, ws) => s + ws.gross_pay, 0) ?? 0

  const monthSessions = sessions?.filter(s => {
    const d = new Date(s.date)
    return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth
  }) ?? []
  const monthHours = monthSessions.reduce((s, ws) => s + ws.hours_total, 0)
  const monthGross = monthSessions.reduce((s, ws) => s + ws.gross_pay, 0)

  const annualEstimate = employee.employee_type === 'salaried'
    ? (employee.salary_annual ?? 0)
    : (employee.hourly_rate ?? 0) * 2080

  const deductions = calculateDeductions(monthGross, annualEstimate)
  const monthNet = monthGross - deductions.total

  return (
    <>
      <header className="flex items-center px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg-card))' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>Ma Paye</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Suivi en temps réel de votre rémunération
          </p>
        </div>
      </header>

      <div className="hm-content">
        {/* Employee info */}
        <div className="hm-card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {employee.first_name} {employee.last_name}
              </p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {employee.employee_type === 'salaried' ? 'Salarié' : `${formatCurrency(employee.hourly_rate ?? 0)}/h`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Taux horaire</p>
                <p className="text-xl font-bold" style={{ color: 'rgb(var(--color-primary))' }}>
                  {employee.employee_type === 'salaried'
                    ? formatCurrency((employee.salary_annual ?? 0) / 2080) + '/h eq.'
                    : formatCurrency(employee.hourly_rate ?? 0) + '/h'}
                </p>
              </div>
              <PayrollPDFButton data={{
                employeeName: `${employee.first_name} ${employee.last_name}`,
                employeeType: employee.employee_type,
                period: new Date().toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' }),
                hourlyRate: employee.hourly_rate,
                monthHours,
                monthOT: monthSessions.reduce((s, ws) => s + ws.hours_overtime, 0),
                monthGross,
                deductions,
                monthNet,
                ytdGross,
                ytdHours,
              }} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Heures ce mois" value={formatHours(monthHours)} icon={Clock} color="primary" />
          <StatCard label="Brut ce mois" value={formatCurrency(monthGross)} icon={DollarSign} color="success" />
          <StatCard label="Déductions est." value={formatCurrency(deductions.total)} icon={TrendingDown} color="warning" />
          <StatCard label="Net estimé" value={formatCurrency(monthNet)} icon={CheckCircle} color="info" />
        </div>

        {/* Deductions breakdown */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="hm-card">
            <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
              Déductions estimées — {new Date().toLocaleString('fr-CA', { month: 'long' })}
            </h3>
            <div className="space-y-2.5">
              {[
                { label: 'Impôt fédéral', value: deductions.federal_tax },
                { label: 'Impôt provincial (QC)', value: deductions.provincial_tax },
                { label: 'Assurance-emploi (AE)', value: deductions.ei },
                { label: 'Régime de rentes (RRQ)', value: deductions.qpp },
              ].map(d => (
                <div key={d.label} className="flex justify-between text-sm">
                  <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{d.label}</span>
                  <span style={{ color: 'rgb(var(--color-danger))' }}>-{formatCurrency(d.value)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold pt-2 border-t"
                style={{ borderColor: 'rgb(var(--color-border))' }}>
                <span style={{ color: 'rgb(var(--color-text))' }}>Total déductions</span>
                <span style={{ color: 'rgb(var(--color-danger))' }}>-{formatCurrency(deductions.total)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1">
                <span style={{ color: 'rgb(var(--color-text))' }}>Paye nette estimée</span>
                <span style={{ color: 'rgb(var(--color-success))' }}>{formatCurrency(monthNet)}</span>
              </div>
            </div>
            <p className="text-xs mt-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
              * Estimation seulement. Vérifiez votre talon de paye officiel.
            </p>
          </div>

          <div className="hm-card">
            <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
              Cumul {currentYear}
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Heures totales</p>
                <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{formatHours(ytdHours)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Salaire brut cumulé</p>
                <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-success))' }}>{formatCurrency(ytdGross)}</p>
              </div>
              {employee.employee_type === 'salaried' && employee.salary_annual && (
                <div>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Salaire annuel</p>
                  <p className="text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {formatCurrency(employee.salary_annual)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Vacances</p>
                <div className="w-full rounded-full h-2" style={{ background: 'rgb(var(--color-bg-elevated))' }}>
                  <div className="h-2 rounded-full" style={{
                    width: `${Math.min(100, (employee.vacation_days_used / employee.vacation_days_per_year) * 100)}%`,
                    background: 'rgb(var(--color-primary))'
                  }} />
                </div>
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {employee.vacation_days_used}/{employee.vacation_days_per_year} jours utilisés
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Session history */}
        <div className="hm-card">
          <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Historique des sessions</h3>
          <div className="overflow-x-auto">
            <table className="hm-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Heures reg.</th>
                  <th>Heures supp.</th>
                  <th>Total heures</th>
                  <th>Salaire brut</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {sessions?.slice(0, 20).map(s => (
                  <tr key={s.id}>
                    <td>{formatDate(s.date)}</td>
                    <td>{formatHours(s.hours_regular)}</td>
                    <td>{s.hours_overtime > 0 ? formatHours(s.hours_overtime) : '—'}</td>
                    <td className="font-medium">{formatHours(s.hours_total)}</td>
                    <td className="font-semibold" style={{ color: 'rgb(var(--color-success))' }}>
                      {formatCurrency(s.gross_pay)}
                    </td>
                    <td>
                      <span className={`hm-badge ${s.is_approved ? 'hm-badge-success' : 'hm-badge-muted'}`}>
                        {s.is_approved ? 'Approuvé' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
