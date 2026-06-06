import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteFromGCS } from '@/lib/gcs/storage'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { path } = await request.json()
    if (!path) return NextResponse.json({ error: 'path requis' }, { status: 400 })

    await deleteFromGCS(path)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
}
