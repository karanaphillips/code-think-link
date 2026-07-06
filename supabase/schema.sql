-- CodeThinkLink — Supabase Schema
-- Run this in the Supabase SQL Editor after creating your project

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'paid')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chats table
CREATE TABLE public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Chats policies
CREATE POLICY "Users can manage own chats"
  ON public.chats FOR ALL
  USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Pilot applications table (CTL = CodeThinkLink)
CREATE TABLE public.ctl_pilot_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('individual', 'institutional')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  coding_level TEXT,
  use_case TEXT NOT NULL,
  org_name TEXT,
  org_role TEXT,
  estimated_users INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ctl_pilot_applications ENABLE ROW LEVEL SECURITY;

GRANT INSERT, SELECT ON public.ctl_pilot_applications TO authenticated;
GRANT ALL ON public.ctl_pilot_applications TO service_role;

CREATE POLICY "Users can submit and view own applications"
  ON public.ctl_pilot_applications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
