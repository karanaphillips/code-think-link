import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const obj = event.data.object;
  const uid = obj.metadata?.supabase_uid;
  const orgId = obj.metadata?.org_id;
  const seats = obj.metadata?.seats ? parseInt(obj.metadata.seats) : null;

  switch (event.type) {
    // ── Individual subscription ──────────────────────────────────────────────
    case 'checkout.session.completed': {
      if (orgId && seats) {
        // Org purchase: update seats
        await supabase
          .from('organizations')
          .update({ seats_purchased: seats, stripe_subscription_id: obj.subscription })
          .eq('id', orgId);
      } else if (uid) {
        // Individual purchase
        await supabase
          .from('profiles')
          .update({ plan: 'paid', stripe_subscription_id: obj.subscription })
          .eq('id', uid);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = obj;
      const subOrgId = subscription.metadata?.org_id;
      const subUid = subscription.metadata?.supabase_uid;
      const newSeats = subscription.quantity;

      if (subOrgId && newSeats) {
        await supabase
          .from('organizations')
          .update({ seats_purchased: newSeats })
          .eq('stripe_subscription_id', subscription.id);
      }

      if (subUid && subscription.status === 'active') {
        await supabase
          .from('profiles')
          .update({ plan: 'paid' })
          .eq('id', subUid);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = obj;
      const subOrgId = subscription.metadata?.org_id;

      if (subOrgId) {
        // Org subscription cancelled: revoke all members' institutional plan
        await supabase
          .from('organizations')
          .update({ seats_purchased: 0, stripe_subscription_id: null })
          .eq('stripe_subscription_id', subscription.id);

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (org) {
          await supabase
            .from('profiles')
            .update({ plan: 'free' })
            .eq('org_id', org.id)
            .neq('org_role', 'admin'); // keep admin's account active
        }
      } else {
        // Individual subscription cancelled
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();
        if (profile) {
          await supabase
            .from('profiles')
            .update({ plan: 'free', stripe_subscription_id: null })
            .eq('id', profile.id);
        }
      }
      break;
    }
  }

  res.status(200).json({ received: true });
}
