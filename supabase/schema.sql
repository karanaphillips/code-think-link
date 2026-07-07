-- ================================================================
-- CodeThinkLink — Complete Supabase Schema
-- ================================================================
-- Run each section in order in the Supabase SQL Editor.
-- All CTL-specific tables are prefixed ctl_ to avoid collisions
-- if this project shares a Supabase instance with MathThinkLink.
-- ================================================================


-- ── SECTION 1: PROFILES ─────────────────────────────────────

CREATE TABLE public.profiles (
  id                      UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email                   TEXT,
  full_name               TEXT,
  avatar_url              TEXT,

  -- Platform role: 'admin' = TDAM platform admin, 'user' = everyone else
  role                    TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),

  -- Billing plan:
  --   free         = no subscription
  --   pro          = individual Stripe subscription ($5.99/mo)
  --   institutional = org-managed seat (no personal Stripe needed)
  plan                    TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'institutional')),

  -- FK set after ctl_organizations is created (see ALTER below)
  org_id                  UUID,

  -- Individual Stripe fields (populated for 'pro' plan)
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);


-- ── SECTION 3: ORGANIZATIONS ────────────────────────────────
-- Schools, coding bootcamps, companies — any institutional buyer.

CREATE TABLE public.ctl_organizations (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                    TEXT NOT NULL,
  -- URL-safe slug used in invite links (e.g. /org/join/lincoln-cs)
  slug                    TEXT NOT NULL UNIQUE,

  -- Billing status of the org's institutional plan
  plan                    TEXT DEFAULT 'pilot'
                            CHECK (plan IN ('pilot', 'trial', 'active', 'past_due', 'cancelled')),

  -- Max users this org is licensed for
  seat_limit              INTEGER DEFAULT 25,

  -- Primary contact info (may differ from the owner's profile)
  contact_name            TEXT,
  contact_email           TEXT,

  -- Org-level Stripe fields (populated when org upgrades to paid)
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  stripe_price_id         TEXT,   -- price per seat or flat bundle

  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Now add the FK from profiles → organizations
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.ctl_organizations(id) ON DELETE SET NULL;


-- ── SECTION 4: DEPARTMENTS ──────────────────────────────────
-- Sub-units within an organization: CS101, AP Computer Science, Bootcamp Cohort 3…

CREATE TABLE public.ctl_departments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID NOT NULL REFERENCES public.ctl_organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── SECTION 5: ORG MEMBERS ──────────────────────────────────
-- Every user who belongs to an organization.
--
-- Roles:
--   owner   = the person who created/set up the org (one per org)
--   admin   = org-level administrator (can invite, manage seats, view all dashboards)
--   teacher = can view activity for departments they're assigned to
--   student = end user of the tutor

CREATE TABLE public.ctl_org_members (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id         UUID NOT NULL REFERENCES public.ctl_organizations(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  role           TEXT NOT NULL DEFAULT 'student'
                   CHECK (role IN ('owner', 'admin', 'teacher', 'student')),

  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('active', 'inactive', 'pending')),

  -- Before the user accepts an invite, user_id is NULL and invited_email is set.
  -- After acceptance, user_id is filled and invited_email cleared.
  invited_email  TEXT,
  invited_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at     TIMESTAMPTZ,
  joined_at      TIMESTAMPTZ,

  created_at     TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (org_id, user_id)
);


-- ── SECTION 6: DEPARTMENT MEMBERS ───────────────────────────
-- A user can belong to multiple departments within an org.
--
-- Roles:
--   dept_admin = manages this department's membership
--   teacher    = views this department's student activity
--   student    = uses the tutor; activity visible to dept teachers

CREATE TABLE public.ctl_dept_members (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dept_id    UUID NOT NULL REFERENCES public.ctl_departments(id) ON DELETE CASCADE,
  org_id     UUID NOT NULL REFERENCES public.ctl_organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'student'
               CHECK (role IN ('dept_admin', 'teacher', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (dept_id, user_id)
);


-- ── SECTION 7: INVITATIONS ──────────────────────────────────
-- Invite tokens sent to email addresses to join an org (and optionally a dept).

CREATE TABLE public.ctl_invitations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID NOT NULL REFERENCES public.ctl_organizations(id) ON DELETE CASCADE,
  dept_id     UUID REFERENCES public.ctl_departments(id) ON DELETE SET NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'student'
                CHECK (role IN ('admin', 'teacher', 'student')),
  token       UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  status      TEXT DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── SECTION 8: SUBSCRIPTIONS ────────────────────────────────
-- Source of truth for billing state. Stripe webhook keeps this in sync.
-- Individual pro subscriptions reference user_id only.
-- Institutional subscriptions reference org_id only.

CREATE TABLE public.ctl_subscriptions (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Exactly one of these will be set
  user_id                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id                   UUID REFERENCES public.ctl_organizations(id) ON DELETE SET NULL,

  type                     TEXT NOT NULL CHECK (type IN ('individual', 'institutional')),

  stripe_customer_id       TEXT NOT NULL,
  stripe_subscription_id   TEXT NOT NULL UNIQUE,
  stripe_price_id          TEXT,

  -- Mirrors Stripe subscription.status
  status                   TEXT NOT NULL DEFAULT 'trialing'
                             CHECK (status IN (
                               'trialing', 'active', 'past_due',
                               'cancelled', 'unpaid', 'incomplete', 'paused'
                             )),

  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN DEFAULT FALSE,
  cancelled_at             TIMESTAMPTZ,

  -- For institutional: how many seats are on this subscription
  seat_count               INTEGER,

  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),

  -- Enforce: individual must have user_id, institutional must have org_id
  CONSTRAINT subscription_target_check CHECK (
    (type = 'individual' AND user_id IS NOT NULL AND org_id IS NULL)
    OR
    (type = 'institutional' AND org_id IS NOT NULL AND user_id IS NULL)
  )
);


-- ── SECTION 9: CHATS ────────────────────────────────────────
-- Saved tutoring sessions. org_id + dept_id allow activity tracking
-- at the institutional level without exposing message content.

CREATE TABLE public.chats (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      UUID REFERENCES public.ctl_organizations(id) ON DELETE SET NULL,
  dept_id     UUID REFERENCES public.ctl_departments(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  messages    JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── SECTION 9: PILOT APPLICATIONS ───────────────────────────

CREATE TABLE public.ctl_pilot_applications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('individual', 'institutional')),
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL,
  coding_level    TEXT CHECK (coding_level IN ('beginner', 'intermediate', 'advanced')),
  use_case        TEXT NOT NULL,
  org_name        TEXT,
  org_role        TEXT,
  estimated_users INTEGER,
  status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted')),
  notes           TEXT,   -- internal reviewer notes
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ================================================================
-- SECTION 10: HELPER FUNCTIONS
-- (defined after tables so SQL can validate the references)
-- ================================================================

CREATE OR REPLACE FUNCTION public.ctl_user_org_role(p_org_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.ctl_org_members
  WHERE org_id = p_org_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ctl_user_dept_role(p_dept_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.ctl_dept_members
  WHERE dept_id = p_dept_id
    AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ctl_is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ================================================================
-- SECTION 11: ROW LEVEL SECURITY — ENABLE
-- ================================================================

ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctl_organizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctl_departments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctl_org_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctl_dept_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctl_invitations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctl_subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctl_pilot_applications ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- SECTION 12: GRANTS (service_role bypasses RLS automatically)
-- ================================================================

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.ctl_organizations TO authenticated;
GRANT ALL ON public.ctl_organizations TO service_role;

GRANT SELECT ON public.ctl_departments TO authenticated;
GRANT ALL ON public.ctl_departments TO service_role;

GRANT SELECT, INSERT ON public.ctl_org_members TO authenticated;
GRANT ALL ON public.ctl_org_members TO service_role;

GRANT SELECT, INSERT ON public.ctl_dept_members TO authenticated;
GRANT ALL ON public.ctl_dept_members TO service_role;

GRANT SELECT, INSERT ON public.ctl_invitations TO authenticated;
GRANT SELECT ON public.ctl_invitations TO anon;   -- token lookup for accept page
GRANT ALL ON public.ctl_invitations TO service_role;

GRANT SELECT ON public.ctl_subscriptions TO authenticated;
GRANT ALL ON public.ctl_subscriptions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;
GRANT ALL ON public.chats TO service_role;

GRANT INSERT, SELECT ON public.ctl_pilot_applications TO authenticated;
GRANT ALL ON public.ctl_pilot_applications TO service_role;


-- ================================================================
-- SECTION 13: RLS POLICIES
-- ================================================================

-- ── profiles ────────────────────────────────────────────────
CREATE POLICY "profiles: own read/write"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: org admins can read members"
  ON public.profiles FOR SELECT
  USING (
    org_id IS NOT NULL
    AND ctl_user_org_role(org_id) IN ('owner', 'admin')
  );

CREATE POLICY "profiles: platform admins full access"
  ON public.profiles FOR ALL
  USING (ctl_is_platform_admin());

-- ── ctl_organizations ────────────────────────────────────────
CREATE POLICY "orgs: members can view their org"
  ON public.ctl_organizations FOR SELECT
  USING (ctl_user_org_role(id) IS NOT NULL);

CREATE POLICY "orgs: owner/admin can update"
  ON public.ctl_organizations FOR UPDATE
  USING (ctl_user_org_role(id) IN ('owner', 'admin'));

CREATE POLICY "orgs: authenticated can create"
  ON public.ctl_organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "orgs: platform admins full access"
  ON public.ctl_organizations FOR ALL
  USING (ctl_is_platform_admin());

-- ── ctl_departments ──────────────────────────────────────────
CREATE POLICY "depts: org members can view"
  ON public.ctl_departments FOR SELECT
  USING (ctl_user_org_role(org_id) IS NOT NULL);

CREATE POLICY "depts: org admin/owner can manage"
  ON public.ctl_departments FOR ALL
  USING (ctl_user_org_role(org_id) IN ('owner', 'admin'));

-- ── ctl_org_members ──────────────────────────────────────────
CREATE POLICY "org_members: own record"
  ON public.ctl_org_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "org_members: org admin can manage"
  ON public.ctl_org_members FOR ALL
  USING (ctl_user_org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "org_members: teachers can view their org"
  ON public.ctl_org_members FOR SELECT
  USING (ctl_user_org_role(org_id) IN ('teacher'));

-- ── ctl_dept_members ─────────────────────────────────────────
CREATE POLICY "dept_members: own record"
  ON public.ctl_dept_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "dept_members: dept admin and teachers can view"
  ON public.ctl_dept_members FOR SELECT
  USING (ctl_user_dept_role(dept_id) IN ('dept_admin', 'teacher'));

CREATE POLICY "dept_members: org admin can manage all depts"
  ON public.ctl_dept_members FOR ALL
  USING (ctl_user_org_role(org_id) IN ('owner', 'admin'));

-- ── ctl_invitations ──────────────────────────────────────────
-- Anyone (including anon) can look up an invitation by token to accept it
CREATE POLICY "invitations: public token lookup"
  ON public.ctl_invitations FOR SELECT
  USING (status = 'pending' AND expires_at > NOW());

CREATE POLICY "invitations: org admin can manage"
  ON public.ctl_invitations FOR ALL
  USING (ctl_user_org_role(org_id) IN ('owner', 'admin'));

-- ── ctl_subscriptions ────────────────────────────────────────
CREATE POLICY "subs: individual can view own"
  ON public.ctl_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "subs: org admin can view org sub"
  ON public.ctl_subscriptions FOR SELECT
  USING (
    org_id IS NOT NULL
    AND ctl_user_org_role(org_id) IN ('owner', 'admin')
  );

-- ── chats ────────────────────────────────────────────────────
CREATE POLICY "chats: users manage own"
  ON public.chats FOR ALL
  USING (user_id = auth.uid());

-- Org/dept admins and teachers can view (not edit) student chats in their scope
CREATE POLICY "chats: org admin can view org chats"
  ON public.chats FOR SELECT
  USING (
    org_id IS NOT NULL
    AND ctl_user_org_role(org_id) IN ('owner', 'admin')
  );

CREATE POLICY "chats: dept teacher can view dept chats"
  ON public.chats FOR SELECT
  USING (
    dept_id IS NOT NULL
    AND ctl_user_dept_role(dept_id) IN ('dept_admin', 'teacher')
  );

-- ── ctl_pilot_applications ───────────────────────────────────
CREATE POLICY "pilot: users submit and view own"
  ON public.ctl_pilot_applications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anon users can still submit (user_id will be NULL)
CREATE POLICY "pilot: anon can insert"
  ON public.ctl_pilot_applications FOR INSERT
  WITH CHECK (user_id IS NULL);

CREATE POLICY "pilot: platform admins full access"
  ON public.ctl_pilot_applications FOR ALL
  USING (ctl_is_platform_admin());


-- ================================================================
-- SECTION 14: TRIGGERS
-- ================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orgs_updated_at
  BEFORE UPDATE ON public.ctl_organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_depts_updated_at
  BEFORE UPDATE ON public.ctl_departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_subs_updated_at
  BEFORE UPDATE ON public.ctl_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- When an org member is activated, bump their profile.plan to 'institutional'
CREATE OR REPLACE FUNCTION public.ctl_sync_member_plan()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET plan = 'institutional', org_id = NEW.org_id, updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;

  -- If removed/deactivated, downgrade back to free (unless they have their own Pro sub)
  IF NEW.status = 'inactive' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET plan = 'free', org_id = NULL, updated_at = NOW()
    WHERE id = NEW.user_id
      AND stripe_subscription_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_member_plan
  AFTER INSERT OR UPDATE OF status ON public.ctl_org_members
  FOR EACH ROW EXECUTE FUNCTION public.ctl_sync_member_plan();


-- ================================================================
-- WHEN UPGRADING FROM PILOT TO PAID
-- ================================================================
-- Run these ALTER statements when you go live with Stripe payments:
--
-- -- Expand plan options to add per-seat variants if needed:
-- ALTER TABLE public.ctl_organizations
--   DROP CONSTRAINT ctl_organizations_plan_check,
--   ADD CONSTRAINT ctl_organizations_plan_check
--     CHECK (plan IN ('pilot','trial','active','past_due','cancelled'));
--
-- -- Index for Stripe webhook lookups:
-- CREATE INDEX idx_ctl_subs_stripe ON public.ctl_subscriptions(stripe_subscription_id);
-- CREATE INDEX idx_profiles_stripe  ON public.profiles(stripe_customer_id);
-- CREATE INDEX idx_orgs_stripe       ON public.ctl_organizations(stripe_customer_id);
-- ================================================================
