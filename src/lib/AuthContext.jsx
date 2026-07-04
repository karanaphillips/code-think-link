import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [org, setOrg] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  };

  const fetchOrg = async (orgId) => {
    if (!orgId) return null;
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    return data;
  };

  const loadUserData = async (authUser) => {
    const p = await fetchProfile(authUser.id);
    setProfile(p);
    if (p?.org_id) {
      const o = await fetchOrg(p.org_id);
      setOrg(o);
    } else {
      setOrg(null);
    }
    return p;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        await loadUserData(session.user);
      }
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        await loadUserData(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setOrg(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (!error) setProfile(data);
    return { data, error };
  };

  const refreshProfile = async () => {
    if (!user) return null;
    const p = await fetchProfile(user.id);
    setProfile(p);
    if (p?.org_id) {
      const o = await fetchOrg(p.org_id);
      setOrg(o);
    }
    return p;
  };

  // Pro = individual paid OR institutional member
  const isPro = profile?.plan === 'paid' || profile?.plan === 'institutional';
  const isOrgAdmin = profile?.org_role === 'admin';
  const isTeacher = profile?.org_role === 'teacher' || profile?.org_role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      org,
      isAuthenticated,
      isLoadingAuth,
      isPro,
      isOrgAdmin,
      isTeacher,
      logout,
      updateProfile,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
