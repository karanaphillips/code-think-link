import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, plan, role, institution, use_case, student_count, referral } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !plan) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  const { error } = await supabase
    .from('pilot_applications')
    .insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      plan,
      role: role || null,
      institution: institution?.trim() || null,
      use_case: use_case?.trim() || null,
      student_count: student_count ? parseInt(student_count, 10) : null,
      referral: referral || null,
      status: 'pending',
    });

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Failed to submit your application. Please try again.' });
  }

  return res.status(200).json({ success: true });
}
