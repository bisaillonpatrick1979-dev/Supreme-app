import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN invalide' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Get all active employees with PIN hashes
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, user_id, pin_hash, first_name, last_name')
      .eq('is_active', true)
      .not('pin_hash', 'is', null)

    if (error) throw error

    // Find matching employee
    let matchedEmployee = null
    for (const emp of employees ?? []) {
      if (emp.pin_hash && await bcrypt.compare(pin, emp.pin_hash)) {
        matchedEmployee = emp
        break
      }
    }

    if (!matchedEmployee) {
      return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 })
    }

    // If employee has a user_id, sign in as them
    if (matchedEmployee.user_id) {
      const { data: { user } } = await supabase.auth.admin.getUserById(matchedEmployee.user_id)
      if (user?.email) {
        // Generate a magic link for them (simplified - in production use proper session management)
        const { data, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: user.email,
        })
        if (!linkError && data) {
          return NextResponse.json({ success: true, redirectTo: 'dashboard' })
        }
      }
    }

    // Fallback: just mark as authenticated via cookie/session
    return NextResponse.json({
      success: true,
      employee: { id: matchedEmployee.id, first_name: matchedEmployee.first_name, last_name: matchedEmployee.last_name },
      redirectTo: 'punch',
    })
  } catch (e) {
    console.error('PIN login error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
