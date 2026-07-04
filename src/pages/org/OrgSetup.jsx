import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building2, Users, BookOpen, GraduationCap } from "lucide-react";

const ORG_TYPES = [
  { id: "k12", label: "K–12 School / District", icon: BookOpen, description: "High school, middle school, or school district" },
  { id: "college", label: "College / University", icon: GraduationCap, description: "Higher education institution" },
  { id: "tutoring", label: "Tutoring Center", icon: Users, description: "Private tutoring business or learning center" },
  { id: "other", label: "Other Institution", icon: Building2, description: "Any other organization or group" },
];

const SEAT_TIERS = [
  { seats: 30, label: "Starter", sublabel: "Up to 30 students" },
  { seats: 100, label: "School", sublabel: "Up to 100 students" },
  { seats: 300, label: "Department", sublabel: "Up to 300 students" },
  { seats: 1000, label: "District", sublabel: "Up to 1,000 students" },
];

export default function OrgSetup() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [orgType, setOrgType] = useState(null);
  const [form, setForm] = useState({ name: "", billing_email: "", domain: "" });
  const [seats, setSeats] = useState(30);
  const [customSeats, setCustomSeats] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, isLoadingAuth, navigate]);

  const handleCreateOrg = async () => {
    if (!form.name.trim()) { setError("Organization name is required"); return; }
    setIsLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/org/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: form.name,
          billing_email: form.billing_email,
          domain: form.domain || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshProfile();
      setStep(3); // move to seat selection
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    const seatCount = customSeats ? parseInt(customSeats) : seats;
    if (seatCount < 1) { setError("Enter a valid seat count"); return; }
    setIsLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/org/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ seats: seatCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/profile")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Set Up Your Institution</h1>
            <p className="text-sm text-muted-foreground">Step {step} of 3</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${step >= s ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        {/* Step 1: Type */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">What type of institution are you?</h2>
              <p className="text-sm text-muted-foreground">This helps us tailor the setup for you.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ORG_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setOrgType(type.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-colors ${orgType === type.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <Icon className="w-5 h-5 text-primary mb-2" />
                    <p className="font-medium text-sm text-foreground">{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                  </button>
                );
              })}
            </div>
            <Button className="w-full" disabled={!orgType} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Institution Details</CardTitle>
              <CardDescription>We'll use this to set up your organization and billing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-1 block">Institution Name *</label>
                <Input
                  placeholder="e.g. Lincoln High School"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Billing Email</label>
                <Input
                  type="email"
                  placeholder="billing@yourschool.edu"
                  value={form.billing_email}
                  onChange={e => setForm(f => ({ ...f, billing_email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">School Domain <span className="text-muted-foreground font-normal">(optional)</span></label>
                <Input
                  placeholder="yourschool.edu"
                  value={form.domain}
                  onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Students with this email domain can self-join your org.
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" onClick={handleCreateOrg} disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Institution"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Seats & Billing */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Choose your seat count</h2>
              <p className="text-sm text-muted-foreground">
                Each seat covers one student. Teachers and admins are always free.
                Billed annually — contact us for custom pricing over 1,000 seats.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SEAT_TIERS.map(tier => (
                <button
                  key={tier.seats}
                  onClick={() => { setSeats(tier.seats); setCustomSeats(""); }}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${seats === tier.seats && !customSeats ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <p className="font-semibold text-foreground">{tier.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{tier.sublabel}</p>
                </button>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Custom seat count</label>
              <Input
                type="number"
                min="1"
                placeholder="Enter exact number of seats"
                value={customSeats}
                onChange={e => { setCustomSeats(e.target.value); setSeats(0); }}
              />
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Seats</span>
                  <span className="font-medium">{customSeats || seats}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-muted-foreground">Billing</span>
                  <span className="font-medium">Annual, per seat</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Pricing confirmed at checkout. Cancel or adjust seats anytime.
                </p>
              </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleCheckout} disabled={isLoading || (!seats && !customSeats)}>
              {isLoading ? "Redirecting to checkout..." : "Continue to Billing"}
            </Button>
            <button
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate("/org/dashboard")}
            >
              Skip for now — set up billing later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
