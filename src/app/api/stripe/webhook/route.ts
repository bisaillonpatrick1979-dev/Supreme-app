import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    const event = await constructWebhookEvent(body, signature)
    const supabase = await createAdminClient()

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as { metadata?: { invoice_id?: string }; amount: number; id: string }
      const invoiceId = paymentIntent.metadata?.invoice_id

      if (invoiceId) {
        await supabase.from('invoices').update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_amount: paymentIntent.amount / 100,
          stripe_payment_intent: paymentIntent.id,
          payment_method: 'stripe',
        }).eq('id', invoiceId)

        // Create notification
        const { data: invoice } = await supabase.from('invoices').select('created_by').eq('id', invoiceId).single()
        if (invoice?.created_by) {
          await supabase.from('notifications').insert([{
            user_id: invoice.created_by,
            title: 'Paiement reçu',
            body: `La facture a été payée via Stripe ($${paymentIntent.amount / 100})`,
            type: 'success',
            action_url: `/admin/billing`,
          }])
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }
}
