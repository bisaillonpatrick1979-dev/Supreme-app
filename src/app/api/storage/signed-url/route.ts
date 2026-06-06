import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSignedUploadUrl, getPublicUrl } from '@/lib/gcs/storage'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { path, contentType } = await request.json()

    if (!path || !contentType) {
      return NextResponse.json({ error: 'path et contentType requis' }, { status: 400 })
    }

    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 })
    }

    const signedUrl = await generateSignedUploadUrl(path, contentType)
    const publicUrl = getPublicUrl(path)

    return NextResponse.json({ signedUrl, publicUrl })
  } catch (e) {
    console.error('Storage error:', e)
    return NextResponse.json({ error: 'Erreur storage' }, { status: 500 })
  }
}
