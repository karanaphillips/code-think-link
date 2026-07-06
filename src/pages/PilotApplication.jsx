import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Code2, CheckCircle2, ArrowLeft, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher / Instructor" },
  { value: "admin", label: "School or Org Administrator" },
  { value: "developer", label: "Software Developer" },
  { value: "parent", label: "Parent / Guardian" },
  { value: "other", label: "Other" },
];

const CODING_LEVELS = [
  { value: "beginner", label: "Beginner — new to programming" },
  { value: "intermediate", label: "Intermediate — comfortable with basics" },
  { value: "advanced", label: "Advanced — working on complex problems" },
];

const REFERRALS = [
  { value: "search", label: "Search engine" },
  { value: "social", label: "Social media" },
  { value: "colleague", label: "Colleague or friend" },
  { value: "tdam", label: "TDAM website" },
  { value: "other", label: "Other" },
];

export default function PilotApplication() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialType = searchParams.get("plan") === "institutional" ? "institutional" : "individual";

  const [type, setType] = useState(initialType);
  const [form, setForm] = useState({
    full_name: "", email: "", role: "", coding_level: "",
    org_name: "", org_role: "", estimated_users: "", use_case: "", referral: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      // Attach session token if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch("/api/pilot-apply", {
        method: "POST",
        headers,
        body: JSON.stringify({ type, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-3">Application received!</h1>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Thanks for applying to the CodeThinkLink pilot program.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-8">
            We'll review your application and reach out to{" "}
            <strong className="text-foreground">{form.email}</strong> within a few days.
          </p>
          <Button onClick={() => navigate("/")} className="gap-2">
            <Code2 className="w-4 h-4" />
            Start using CodeThinkLink (Free)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="h-14 px-4 md:px-6 flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">CodeThinkLink — Pilot Program</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Free pilot — no payment required
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Apply for the Pilot Program</h1>
          <p className="text-muted-foreground leading-relaxed">
            We're selecting early users to help shape CodeThinkLink before public launch. Tell us about yourself and how you'd use it — we'll review applications and reach out within a few days.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type selector */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Which plan interests you?</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "individual", label: "Pro — Individual", desc: "For students, self-learners, and developers", Icon: Code2 },
                { value: "institutional", label: "Institutional", desc: "For schools, bootcamps, and organizations", Icon: Users },
              ].map(({ value, label, desc, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    type === value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-2 ${type === value ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`text-sm font-semibold mb-1 ${type === value ? "text-foreground" : "text-muted-foreground"}`}>
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Name + Email */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="full_name">Full name <span className="text-destructive">*</span></Label>
              <Input id="full_name" value={form.full_name} onChange={set("full_name")} required placeholder="Jane Smith" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email address <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" value={form.email} onChange={set("email")} required placeholder="jane@example.com" className="mt-1.5" />
            </div>
          </div>

          {/* Role */}
          <div>
            <Label htmlFor="role">Your role <span className="text-destructive">*</span></Label>
            <select
              id="role"
              value={form.role}
              onChange={set("role")}
              required
              className="mt-1.5 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select your role...</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Coding level */}
          <div>
            <Label htmlFor="coding_level">Coding experience level</Label>
            <select
              id="coding_level"
              value={form.coding_level}
              onChange={set("coding_level")}
              className="mt-1.5 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select your level...</option>
              {CODING_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Institutional fields */}
          {type === "institutional" && (
            <>
              <div>
                <Label htmlFor="org_name">School or organization name <span className="text-destructive">*</span></Label>
                <Input
                  id="org_name"
                  value={form.org_name}
                  onChange={set("org_name")}
                  required
                  placeholder="Lincoln High School"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="org_role">Your role at the organization</Label>
                <Input
                  id="org_role"
                  value={form.org_role}
                  onChange={set("org_role")}
                  placeholder="e.g. CS Department Head"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="estimated_users">Approximate number of students</Label>
                <Input
                  id="estimated_users"
                  type="number"
                  min="1"
                  value={form.estimated_users}
                  onChange={set("estimated_users")}
                  placeholder="e.g. 120"
                  className="mt-1.5"
                />
              </div>
            </>
          )}

          {/* Individual: optional org context */}
          {type === "individual" && (
            <div>
              <Label htmlFor="org_name">School or organization (optional)</Label>
              <Input
                id="org_name"
                value={form.org_name}
                onChange={set("org_name")}
                placeholder="Optional"
                className="mt-1.5"
              />
            </div>
          )}

          {/* Use case */}
          <div>
            <Label htmlFor="use_case">How do you plan to use CodeThinkLink? <span className="text-destructive">*</span></Label>
            <Textarea
              id="use_case"
              value={form.use_case}
              onChange={set("use_case")}
              required
              rows={4}
              placeholder="Tell us about your learning goals, the course or context you'd use it in, and what you're hoping to get out of the pilot..."
              className="mt-1.5 resize-none"
            />
          </div>

          {/* Referral */}
          <div>
            <Label htmlFor="referral">How did you hear about us?</Label>
            <select
              id="referral"
              value={form.referral}
              onChange={set("referral")}
              className="mt-1.5 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select an option...</option>
              {REFERRALS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">{error}</p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full gap-2 h-11">
            <Sparkles className="w-4 h-4" />
            {isSubmitting ? "Submitting..." : "Submit Pilot Application"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            No payment required. We'll review your application and follow up by email.
          </p>
        </form>
      </main>
    </div>
  );
}
