-- CodeThinkLink — Institutional Schema
-- Run AFTER schema.sql in the Supabase SQL Editor

-- Organizations
CREATE TABLE public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,             -- used in invite URLs: /org/join/:slug
  domain TEXT,                           -- optional: auto-join if user email matches domain
  billing_email TEXT,
  seats_purchased INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization memberships
CREATE TABLE public.organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Add org link to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS org_role TEXT CHECK (org_role IN ('admin', 'teacher', 'student'));

-- Add org context to chats (so teachers can view student sessions)
ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Update plan check to include institutional
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'paid', 'institutional'));

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Org members can view their own org
CREATE POLICY "Org members can view their org"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.org_id = id AND m.user_id = auth.uid()
    )
  );

-- Org admins can update their org
CREATE POLICY "Org admins can update their org"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.org_id = id AND m.user_id = auth.uid() AND m.role = 'admin'
    )
  );

-- Members can view their own memberships
CREATE POLICY "Members can view own memberships"
  ON public.organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Teachers and admins can view all memberships in their org
CREATE POLICY "Staff can view org memberships"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.org_id = org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'teacher')
    )
  );

-- Teachers/admins can view student chats in their org
CREATE POLICY "Staff can view org chats"
  ON public.chats FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      org_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.org_id = chats.org_id
          AND m.user_id = auth.uid()
          AND m.role IN ('admin', 'teacher')
      )
    )
  );

-- ─── Triggers ────────────────────────────────────────────────────────────────

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Helper: count seats used ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.org_seats_used(org_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.organization_members
  WHERE org_id = org_uuid AND role = 'student';
$$ LANGUAGE SQL STABLE;
