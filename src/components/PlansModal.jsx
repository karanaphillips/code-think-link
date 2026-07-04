import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, BookmarkPlus, PenTool, PenLine, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PlansModal({ open, onClose, currentPlan }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isPro = currentPlan === 'paid';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Choose Your Plan</DialogTitle>
          <p className="text-muted-foreground text-center text-sm mt-1">
            Tutoring is always free. Upgrade for saving and advanced tools.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Free */}
          <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Free</h3>
              <p className="text-muted-foreground text-xs mt-0.5">Everything you need to start learning</p>
            </div>
            <div>
              <span className="text-3xl font-bold text-foreground">$0</span>
              <span className="text-muted-foreground text-sm ml-1">forever</span>
            </div>
            <ul className="space-y-2 flex-1">
              <li className="flex items-start gap-2 text-sm text-foreground">
                <MessageCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                Unlimited tutoring sessions
              </li>
              <li className="flex items-start gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                All math topics (Algebra → Calculus → Proofs)
              </li>
              <li className="flex items-start gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                Graph & 3D visualizations
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                <span className="line-through">Save chat sessions</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                <span className="line-through">Whiteboard & scratchpad</span>
              </li>
            </ul>
            <Button variant="outline" disabled={!isPro} className="w-full">
              {isPro ? "Downgrade to Free" : "Current Plan"}
            </Button>
          </div>

          {/* Pro */}
          <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 flex flex-col gap-4 relative">
            <div className="absolute -top-3 left-4">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">Most Popular</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Pro</h3>
              <p className="text-muted-foreground text-xs mt-0.5">Save your work and use all tools</p>
            </div>
            <div>
              <span className="text-3xl font-bold text-foreground">$5.99</span>
              <span className="text-muted-foreground text-sm ml-1">per month</span>
            </div>
            <ul className="space-y-2 flex-1">
              <li className="flex items-start gap-2 text-sm text-foreground">
                <MessageCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                Everything in Free
              </li>
              <li className="flex items-start gap-2 text-sm text-foreground">
                <BookmarkPlus className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                Save & revisit sessions anytime
              </li>
              <li className="flex items-start gap-2 text-sm text-foreground">
                <PenTool className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                Interactive whiteboard mode
              </li>
              <li className="flex items-start gap-2 text-sm text-foreground">
                <PenLine className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                Handwriting scratchpad
              </li>
              <li className="flex items-start gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                Export chat history
              </li>
            </ul>
            <Button
              className="w-full"
              disabled={isPro || isLoading}
              onClick={handleUpgrade}
            >
              {isPro ? "Current Plan" : isLoading ? "Redirecting..." : "Upgrade for $5.99/mo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
