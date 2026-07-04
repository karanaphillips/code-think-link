import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, BookmarkPlus, PenTool, PenLine } from "lucide-react";
import { supabase } from "@/lib/supabase";

const REASON_COPY = {
  save: {
    title: "Save your chats with Pro",
    description: "Free tutoring is unlimited — upgrade to save your sessions and pick up where you left off.",
  },
  whiteboard: {
    title: "Whiteboard is a Pro feature",
    description: "Upgrade to access the interactive whiteboard and work through problems step by step.",
  },
  scratchpad: {
    title: "Scratchpad is a Pro feature",
    description: "Upgrade to use the handwriting scratchpad alongside your tutoring session.",
  },
  default: {
    title: "Unlock Pro features",
    description: "Upgrade for $5.99/month to save sessions, use the whiteboard, and more.",
  },
};

export default function UpgradeModal({ open, onClose, reason }) {
  const [isLoading, setIsLoading] = useState(false);

  const copy = REASON_COPY[reason] ?? REASON_COPY.default;

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <DialogTitle>{copy.title}</DialogTitle>
          </div>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Free */}
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Free — always</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> Unlimited tutoring sessions</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> All math topics</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> Graph & 3D visualizations</li>
            </ul>
          </div>

          {/* Pro */}
          <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 relative">
            <div className="absolute -top-3 left-4">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">Pro</span>
            </div>
            <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> $5.99 / month
            </p>
            <ul className="space-y-1.5 text-sm text-foreground">
              <li className="flex items-center gap-2"><BookmarkPlus className="w-4 h-4 text-primary flex-shrink-0" /> Save & revisit chat sessions</li>
              <li className="flex items-center gap-2"><PenTool className="w-4 h-4 text-primary flex-shrink-0" /> Interactive whiteboard</li>
              <li className="flex items-center gap-2"><PenLine className="w-4 h-4 text-primary flex-shrink-0" /> Handwriting scratchpad</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Export chat history</li>
            </ul>
            <Button className="w-full mt-4 gap-2" onClick={handleUpgrade} disabled={isLoading}>
              <Sparkles className="w-4 h-4" />
              {isLoading ? "Redirecting to checkout..." : "Upgrade for $5.99/mo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
