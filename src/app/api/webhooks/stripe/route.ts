// POST /api/webhooks/stripe
//
// Stripe calls this when a payment succeeds or fails.
// On payment_intent.succeeded we create the enrollment record.
//
// Setup in Stripe Dashboard → Developers → Webhooks → Add endpoint:
//   URL:    https://yourdomain.com/api/webhooks/stripe
//   Events: payment_intent.succeeded, payment_intent.payment_failed

import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response('STRIPE_WEBHOOK_SECRET not set', { status: 500 })
  }

  const body = await req.text()
  const headerPayload = await headers()
  const signature = headerPayload.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return new Response('Invalid webhook signature', { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent

    // We store user_id and course_id in the PaymentIntent metadata
    // when creating it (see the Stripe Checkout route, coming next).
    const { user_id, course_id } = paymentIntent.metadata

    if (!user_id || !course_id) {
      console.error('PaymentIntent missing metadata:', paymentIntent.id)
      return new Response('Missing metadata', { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase.from('enrollments').insert({
      user_id,
      course_id,
      stripe_payment_intent_id: paymentIntent.id,
    })

    if (error) {
      // Unique constraint violation = already enrolled (e.g. duplicate webhook delivery)
      if (error.code === '23505') {
        return new Response('Already enrolled', { status: 200 })
      }
      console.error('Failed to create enrollment:', error)
      return new Response('Failed to create enrollment', { status: 500 })
    }
  }

  // payment_intent.payment_failed: no action needed for MVP
  // (Stripe handles retry logic; user is not enrolled until payment succeeds)

  return new Response('OK', { status: 200 })
}
