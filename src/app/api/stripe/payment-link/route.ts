import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentLink } from '@/lib/stripe/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { invoiceId, invoiceNumber, amount, clientName } = await request.json()

    if (!invoiceId || !amount) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const { url, paymentLinkId } = await createPaymentLink({
      invoiceId,
      invoiceNumber,
      amount,
      clientName,
      description: `Facture ${invoiceNumber} - Hailite Xteriors`,
    })

    // Update invoice with payment link
    await supabase.from('invoices').update({
      stripe_payment_link: url,
      status: 'pending',
    }).eq('id', invoiceId)

    return NextResponse.json({ url, paymentLinkId })
  } catch (e) {
    console.error('Stripe error:', e)
    return NextResponse.json({ error: 'Erreur Stripe' }, { status: 500 })
  }
}
