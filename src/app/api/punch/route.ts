import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateGrossPay, calculateOvertimeHours } from '@/lib/utils/payroll'

export async function POST(request: NextRequest) {
  try {
    const { employee_id, punch_type, lat, lng, accuracy, address, project_id } = await request.json()

    if (!employee_id || !punch_type) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const punched_at = new Date().toISOString()

    // Insert punch record
    const { data: punch, error: punchError } = await supabase
      .from('punch_records')
      .insert([{ employee_id, punch_type, lat, lng, accuracy, address, project_id: project_id ?? null, punched_at }])
      .select()
      .single()

    if (punchError) throw punchError

    // If punching out, create a work session
    if (punch_type === 'out') {
      const { data: lastIn } = await supabase
        .from('punch_records')
        .select('*')
        .eq('employee_id', employee_id)
        .eq('punch_type', 'in')
        .lt('punched_at', punched_at)
        .order('punched_at', { ascending: false })
        .limit(1)
        .single()

      if (lastIn) {
        const inTime = new Date(lastIn.punched_at)
        const outTime = new Date(punched_at)
        const hoursWorked = (outTime.getTime() - inTime.getTime()) / 3600000

        // Get employee rate
        const { data: employee } = await supabase
          .from('employees')
          .select('hourly_rate, salary_annual, employee_type')
          .eq('id', employee_id)
          .single()

        const hourlyRate = employee?.employee_type === 'salaried'
          ? (employee.salary_annual ?? 0) / 2080
          : (employee?.hourly_rate ?? 0)

        const { regular, overtime } = calculateOvertimeHours(hoursWorked, hoursWorked)
        const grossPay = calculateGrossPay(regular, overtime, hourlyRate)

        await supabase.from('work_sessions').insert([{
          employee_id,
          project_id: project_id ?? null,
          punch_in_id: lastIn.id,
          punch_out_id: punch.id,
          date: inTime.toISOString().split('T')[0],
          hours_regular: Math.round(regular * 100) / 100,
          hours_overtime: Math.round(overtime * 100) / 100,
          hours_total: Math.round(hoursWorked * 100) / 100,
          gross_pay: grossPay,
        }])
      }
    }

    return NextResponse.json({ success: true, punch })
  } catch (e) {
    console.error('Punch error:', e)
    return NextResponse.json({ error: 'Erreur lors du pointage' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const employeeId = searchParams.get('employee_id')

  if (!employeeId) return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })

  const { data } = await supabase
    .from('punch_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('punched_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ punches: data ?? [] })
}
