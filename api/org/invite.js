import { createClient } from '@supabase/supabase-js';

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

  // Verify caller is admin or teacher in an org
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('org_id, org_role')
    .eq('id', user.id)
    .single();

  if (!callerProfile?.org_id || !['admin', 'teacher'].includes(callerProfile.org_role)) {
    return res.status(403).json({ error: 'Only org admins and teachers can invite' });
  }

  const { emails, role = 'student' } = req.body;
  if (!emails?.length) return res.status(400).json({ error: 'emails array is required' });

  // Teachers can only invite students
  if (callerProfile.org_role === 'teacher' && role !== 'student') {
    return res.status(403).json({ error: 'Teachers can only invite students' });
  }

  // Check seat availability for student invites
  if (role === 'student') {
    const { data: org } = await supabase
      .from('organizations')
      .select('seats_purchased')
      .eq('id', callerProfile.org_id)
      .single();

    const { count: used } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', callerProfile.org_id)
      .eq('role', 'student');

    if ((used || 0) + emails.length > (org?.seats_purchased || 0)) {
      return res.status(400).json({
        error: `Not enough seats. ${org?.seats_purchased - used} remaining, ${emails.length} requested.`,
      });
    }
  }

  const results = [];
  for (const email of emails) {
    try {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          org_id: callerProfile.org_id,
          org_role: role,
        },
        redirectTo: `${process.env.APP_URL}/org/join?org_id=${callerProfile.org_id}`,
      });
      if (error) throw error;
      results.push({ email, status: 'invited' });
    } catch (err) {
      results.push({ email, status: 'error', message: err.message });
    }
  }

  res.status(200).json({ results });
}
