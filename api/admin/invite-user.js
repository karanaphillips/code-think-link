import { createClient } from '@supabase/supabase-js';

// Uses service role key to access admin API
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify caller is an admin
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (callerProfile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden — admin only' });
  }

  const { email, role = 'user' } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role },
    });
    if (error) throw error;

    // Set role on profile (created by trigger after invite acceptance)
    res.status(200).json({ message: `Invitation sent to ${email}`, user: data.user });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ error: error.message });
  }
}
