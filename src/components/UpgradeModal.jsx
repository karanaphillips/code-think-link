import React from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, BookmarkPlus, Code2, PenLine } from "lucide-react";

const REASON_COPY = {
  save: {
    title: "Save your chats — join the pilot",
    description: "Free tutoring is unlimited. Apply for the pilot program to save sessions and pick up where you left off.",
  },
  whiteboard: {
    title: "Code Editor is a pilot feature",
    description: "Apply for the pilot program to access the full code editor alongside your tutoring session.",
  },
  scratchpad: {
    title: "Scratchpad is a pilot feature",
    description: "Apply for the pilot program to use the persistent scratchpad alongside your sessions.",
  },
  default: {
    title: "Unlock pilot features",
    description: "Apply for the free pilot program to save sessions, use the code editor, and more.",
  },
};

export default function UpgradeModal({ open, onClose, reason }) {
  const navigate = useNavigate();
  const copy = REASON_COPY[reason] ?? REASON_COPY.default;

  const handleApply = () => {
    onClose();
    navigate("/pilot");
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
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> Any language or topic</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> Pseudocode & algorithm guidance</li>
            </ul>
          </div>

          {/* Pilot */}
          <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 relative">
            <div className="absolute -top-3 left-4">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">Pilot Program</span>
            </div>
            <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> Free during the pilot
            </p>
            <ul className="space-y-1.5 text-sm text-foreground">
              <li className="flex items-center gap-2"><BookmarkPlus className="w-4 h-4 text-primary flex-shrink-0" /> Save & revisit chat sessions</li>
              <li className="flex items-center gap-2"><Code2 className="w-4 h-4 text-primary flex-shrink-0" /> Full code editor mode</li>
              <li className="flex items-center gap-2"><PenLine className="w-4 h-4 text-primary flex-shrink-0" /> Persistent scratchpad</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary flex-shrink-0" /> Export chat history</li>
            </ul>
            <Button className="w-full mt-4 gap-2" onClick={handleApply}>
              <Sparkles className="w-4 h-4" />
              Apply for the Pilot Program
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-2">No payment required</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
