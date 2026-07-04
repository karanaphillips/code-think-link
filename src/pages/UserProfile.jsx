import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import PlansModal from "@/components/PlansModal";

export default function UserProfile() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoadingAuth, logout, updateProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
  });

  // Sync form when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData({ full_name: profile.full_name || "" });
    }
  }, [profile]);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateProfile({ full_name: formData.full_name });
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
    <PlansModal open={showPlansModal} onClose={() => setShowPlansModal(false)} currentPlan={profile?.plan} />
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Full Name
              </label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Email Address
              </label>
              <Input
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm font-medium text-foreground capitalize">
                {profile?.plan === 'paid' ? 'Pro Plan' : 'Free Plan'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {profile?.plan === 'paid'
                  ? 'You have unlimited prompts'
                  : "You're currently on the Free plan — 3 prompts per day"}
              </p>
            </div>
            {profile?.plan !== 'paid' && (
              <Button variant="outline" className="w-full" onClick={() => setShowPlansModal(true)}>
                View Available Plans
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleLogout}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
