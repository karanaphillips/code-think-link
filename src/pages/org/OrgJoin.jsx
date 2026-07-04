import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase, isSupabaseConfigured, supabaseConfigError } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Check } from "lucide-react";

export default function OrgJoin() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const orgIdParam = searchParams.get("org_id");
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, user, refreshProfile } = useAuth();

  const [org, setOrg] = useState(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");

  // Auth state for new users
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const loadOrg = async () => {
      setIsLoadingOrg(true);
      let query = supabase.from("organizations").select("id, name, slug, domain");
      if (slug) query = query.eq("slug", slug);
      else if (orgIdParam) query = query.eq("id", orgIdParam);
      else { setIsLoadingOrg(false); return; }
      const { data } = await query.single();
      setOrg(data || null);
      setIsLoadingOrg(false);
    };
    loadOrg();
  }, [slug, orgIdParam]);

  // Auto-join if already authenticated
  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && org && !joined) {
      handleJoin();
    }
  }, [isLoadingAuth, isAuthenticated, org]);

  const handleJoin = async () => {
    if (!org) return;
    setIsJoining(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Add to org_members
      const { error: memberError } = await supabase
        .from("organization_members")
        .upsert({ org_id: org.id, user_id: session.user.id, role: "student" }, { onConflict: "org_id,user_id" });
      if (memberError) throw memberError;

      // Update profile
      await supabase
        .from("profiles")
        .update({ org_id: org.id, org_role: "student", plan: "institutional" })
        .eq("id", session.user.id);

      await refreshProfile();
      setJoined(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      setAuthError(supabaseConfigError);
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setAuthError(error.message);
        // onAuthStateChange + useEffect above will auto-join after signup
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setAuthError(error.message);
      }
    } catch (err) {
      setAuthError(
        err?.message === "Failed to fetch"
          ? "Could not reach Supabase. Check your internet connection and VITE_SUPABASE_URL, then try again."
          : err?.message || "Authentication failed. Please try again."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  if (isLoadingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <p className="text-lg font-semibold text-foreground">Invalid invite link</p>
            <p className="text-sm text-muted-foreground mt-2">This link may have expired or been removed.</p>
            <Button className="mt-4" onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-foreground">You've joined {org.name}!</p>
            <p className="text-sm text-muted-foreground mt-2">Taking you to CodeThinkLink...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Join {org.name}</CardTitle>
          <CardDescription>
            You've been invited to use CodeThinkLink through {org.name}.
            {isAuthenticated ? " Click below to join." : " Create an account or sign in to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAuthenticated ? (
            <div className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" onClick={handleJoin} disabled={isJoining}>
                {isJoining ? "Joining..." : `Join ${org.name}`}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
              </div>
              {authError && <p className="text-sm text-destructive">{authError}</p>}
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? "Loading..." : isSignUp ? `Create account & join ${org.name}` : `Sign in & join ${org.name}`}
              </Button>
              <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
