import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, org_role')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id || profile.org_role !== 'admin') {
    return res.status(403).json({ error: 'Only org admins can manage billing' });
  }

  const { seats } = req.body;
  if (!seats || seats < 1) return res.status(400).json({ error: 'seats must be >= 1' });

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.org_id)
    .single();

  try {
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: org.billing_email || user.email,
        name: org.name,
        metadata: { org_id: org.id, supabase_uid: user.id },
      });
      customerId = customer.id;
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_ORG_PRICE_ID,
        quantity: seats,
      }],
      mode: 'subscription',
      subscription_data: {
        metadata: { org_id: org.id, seats },
      },
      success_url: `${process.env.APP_URL}/org/dashboard?billing=success`,
      cancel_url: `${process.env.APP_URL}/org/dashboard?billing=cancelled`,
      metadata: { org_id: org.id, seats: String(seats) },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Org checkout error:', error);
    res.status(500).json({ error: error.message });
  }
}
