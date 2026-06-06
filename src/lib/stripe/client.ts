import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    })
  }
  return stripeInstance
}

export async function createPaymentLink(params: {
  invoiceId: string
  invoiceNumber: string
  amount: number
  clientName: string
  description: string
}): Promise<{ url: string; paymentLinkId: string }> {
  const stripe = getStripe()

  const price = await stripe.prices.create({
    currency: 'cad',
    unit_amount: Math.round(params.amount * 100),
    product_data: {
      name: `Invoice ${params.invoiceNumber} - Hailite Xteriors`,
      metadata: { invoice_id: params.invoiceId },
    },
  })

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    payment_method_types: ['card'],
    metadata: {
      invoice_id: params.invoiceId,
      invoice_number: params.invoiceNumber,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?invoice=${params.invoiceId}`,
      },
    },
  })

  return { url: paymentLink.url, paymentLinkId: paymentLink.id }
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
