import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    // Verify requester is admin
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { employee_id, pin } = await request.json()

    if (!employee_id || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const saltRounds = 12
    const pin_hash = await bcrypt.hash(pin, saltRounds)

    const adminClient = await createAdminClient()
    const { error } = await adminClient.from('employees').update({ pin_hash }).eq('id', employee_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Set PIN error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
