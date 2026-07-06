import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Code2, CheckCircle2, ArrowLeft, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher / Instructor" },
  { value: "admin", label: "School or Org Administrator" },
  { value: "developer", label: "Software Developer" },
  { value: "parent", label: "Parent / Guardian" },
  { value: "other", label: "Other" },
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
  const initialPlan = searchParams.get("plan") === "institutional" ? "institutional" : "pro";

  const [plan, setPlan] = useState(initialPlan);
  const [form, setForm] = useState({
    name: "", email: "", role: "", institution: "",
    student_count: "", use_case: "", referral: "",
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
      const res = await fetch("/api/pilot-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, ...form }),
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
            We'll review your application and reach out to <strong className="text-foreground">{form.email}</strong> within a few days.
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
          {/* Plan selector */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Which plan interests you?</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "pro", label: "Pro — Individual", desc: "For students, self-learners, and individual developers", Icon: Code2 },
                { value: "institutional", label: "Institutional", desc: "For schools, bootcamps, and organizations", Icon: Users },
              ].map(({ value, label, desc, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPlan(value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    plan === value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-2 ${plan === value ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`text-sm font-semibold mb-1 ${plan === value ? "text-foreground" : "text-muted-foreground"}`}>
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
              <Label htmlFor="name">Full name <span className="text-destructive">*</span></Label>
              <Input id="name" value={form.name} onChange={set("name")} required placeholder="Jane Smith" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email address <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" value={form.email} onChange={set("email")} required placeholder="jane@example.com" className="mt-1.5" />
            </div>
          </div>

          {/* Role */}
          <div>
            <Label htmlFor="role">Your role</Label>
            <select
              id="role"
              value={form.role}
              onChange={set("role")}
              className="mt-1.5 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select your role...</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Institution */}
          <div>
            <Label htmlFor="institution">
              {plan === "institutional" ? "School or organization name" : "School or organization (optional)"}
            </Label>
            <Input
              id="institution"
              value={form.institution}
              onChange={set("institution")}
              required={plan === "institutional"}
              placeholder={plan === "institutional" ? "Lincoln High School" : "Optional"}
              className="mt-1.5"
            />
          </div>

          {/* Student count — institutional only */}
          {plan === "institutional" && (
            <div>
              <Label htmlFor="student_count">Approximate number of students</Label>
              <Input
                id="student_count"
                type="number"
                min="1"
                value={form.student_count}
                onChange={set("student_count")}
                placeholder="e.g. 120"
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
