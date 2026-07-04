import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)
    + '-' + Math.random().toString(36).slice(2, 7);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { name, billing_email, domain } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    // Create org
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug: slugify(name),
        billing_email: billing_email || user.email,
        domain: domain || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Add creator as admin member
    await supabase.from('organization_members').insert({
      org_id: org.id,
      user_id: user.id,
      role: 'admin',
    });

    // Update creator's profile
    await supabase
      .from('profiles')
      .update({ org_id: org.id, org_role: 'admin', plan: 'institutional' })
      .eq('id', user.id);

    res.status(200).json({ org });
  } catch (error) {
    console.error('Org create error:', error);
    res.status(500).json({ error: error.message });
  }
}
