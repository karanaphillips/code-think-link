import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    type, full_name, email, role, coding_level,
    use_case, org_name, org_role, estimated_users,
  } = req.body ?? {};

  if (!full_name?.trim() || !email?.trim() || !type || !role?.trim() || !use_case?.trim()) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  // Attach user_id if the requester is logged in
  const authHeader = req.headers.authorization;
  let user_id = null;
  if (authHeader?.startsWith('Bearer ')) {
    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
    user_id = user?.id ?? null;
  }

  const { error } = await supabase
    .from('ctl_pilot_applications')
    .insert({
      user_id,
      type,
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      role: role.trim(),
      coding_level: coding_level || null,
      use_case: use_case.trim(),
      org_name: org_name?.trim() || null,
      org_role: org_role?.trim() || null,
      estimated_users: estimated_users ? parseInt(estimated_users, 10) : null,
      status: 'pending',
    });

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Failed to submit your application. Please try again.' });
  }

  return res.status(200).json({ success: true });
}
