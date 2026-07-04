import React from "react";
import { MessageCircle, PenTool, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ModeSelector({ mode, onModeChange, isPro }) {
  return (
    <div className="flex gap-2 bg-secondary rounded-lg p-1">
      <Button
        onClick={() => onModeChange("chat")}
        variant={mode === "chat" ? "default" : "ghost"}
        size="sm"
        className="gap-2 text-xs"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Chat
      </Button>
      <Button
        onClick={() => onModeChange("whiteboard")}
        variant={mode === "whiteboard" ? "default" : "ghost"}
        size="sm"
        className="gap-2 text-xs"
      >
        <PenTool className="w-3.5 h-3.5" />
        Whiteboard
        {!isPro && <Lock className="w-3 h-3 text-muted-foreground" />}
      </Button>
    </div>
  );
}
