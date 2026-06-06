import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatPhone } from '@/lib/utils/format'
import { User, Phone, Mail, MapPin, Calendar, Shield } from 'lucide-react'

export default async function EmployeeProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/employee-pin')

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!employee) redirect('/employee-pin')

  const fields = [
    { icon: User, label: 'Nom complet', value: `${employee.first_name} ${employee.last_name}` },
    { icon: Mail, label: 'Courriel', value: employee.email ?? '—' },
    { icon: Phone, label: 'Téléphone', value: employee.phone ? formatPhone(employee.phone) : '—' },
    { icon: MapPin, label: 'Adresse', value: [employee.address, employee.city, employee.province, employee.postal_code].filter(Boolean).join(', ') || '—' },
    { icon: Calendar, label: "Date d'embauche", value: formatDate(employee.hire_date) },
    { icon: Shield, label: 'Type', value: employee.employee_type === 'salaried' ? 'Salarié' : 'Horaire' },
  ]

  return (
    <>
      <header className="flex items-center px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg-card))' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>Mon Profil</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>Vos informations personnelles (lecture seule)</p>
        </div>
      </header>

      <div className="hm-content">
        <div className="max-w-lg">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))' }}>
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {employee.first_name} {employee.last_name}
              </p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Employé #{employee.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Info cards */}
          <div className="hm-card space-y-4">
            {fields.map(f => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgb(var(--color-primary-muted))' }}>
                  <f.icon className="w-4 h-4" style={{ color: 'rgb(var(--color-primary))' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{f.label}</p>
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{f.value}</p>
                </div>
              </div>
            ))}
          </div>

          {employee.emergency_contact_name && (
            <div className="hm-card mt-4">
              <p className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>Contact d&apos;urgence</p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{employee.emergency_contact_name}</p>
              {employee.emergency_contact_phone && (
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{formatPhone(employee.emergency_contact_phone)}</p>
              )}
            </div>
          )}

          <p className="text-xs text-center mt-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Pour modifier vos informations, contactez votre administrateur.
          </p>
        </div>
      </div>
    </>
  )
}
