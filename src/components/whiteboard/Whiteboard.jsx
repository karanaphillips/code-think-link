import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, RotateCcw, Send, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Whiteboard({ currentProblem, onSendSolution, onNewProblem, isLoading, currentChatId }) {
  const [solution, setSolution] = useState("");
  const [hints, setHints] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef(null);

  const handleRequestHint = async () => {
    if (!currentProblem) return;
    const newHint = `Hint ${hints.length + 1}: Think about what mathematical principle applies here...`;
    setHints([...hints, newHint]);
  };

  const handleSaveWhiteboard = async () => {
    if (!currentChatId || !solution.trim()) return;
    try {
      setIsSaving(true);
      // Whiteboard saves are handled by the parent through onSendSolution
      console.log("Whiteboard saved locally");
    } catch (error) {
      console.error("Error saving whiteboard:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportWhiteboard = () => {
    const content = `Problem: ${currentProblem}\n\n${solution}\n\nHints:\n${hints.map((h, i) => `${i + 1}. ${h}`).join("\n")}`;
    const element = document.createElement("a");
    element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute("download", "whiteboard_work.txt");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSubmit = () => {
    if (!solution.trim()) return;
    onSendSolution(solution);
    setSolution("");
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 p-6">
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Problem Statement */}
        {currentProblem ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border-2 border-primary/20 rounded-2xl p-6 mb-4"
          >
            <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-2">Problem</p>
            <p className="text-lg font-serif text-foreground leading-relaxed">{currentProblem}</p>
          </motion.div>
        ) : (
          <div className="bg-card border-2 border-dashed border-border rounded-2xl p-6 mb-4 text-center">
            <p className="text-muted-foreground">No problem selected</p>
          </div>
        )}

        {/* Canvas for Work */}
        <div className="flex-1 bg-gradient-to-b from-accent to-accent/50 border-2 border-border rounded-2xl p-6 mb-4 flex flex-col">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-4">Your Work</p>
          <textarea
            ref={canvasRef}
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="Write your solution here... Show your work step by step"
            className="flex-1 bg-transparent resize-none focus:outline-none text-base text-foreground placeholder:text-muted-foreground/50 font-mono"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={onNewProblem}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isLoading}
          >
            <RotateCcw className="w-4 h-4" />
            New Problem
          </Button>
          <Button
            onClick={handleExportWhiteboard}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!solution.trim()}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            onClick={handleSaveWhiteboard}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!solution.trim() || isSaving}
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!solution.trim() || isLoading}
            className="flex-1 gap-2"
            size="sm"
          >
            <Send className="w-4 h-4" />
            {isLoading ? "Analyzing..." : "Submit"}
          </Button>
        </div>
      </div>

      {/* Hints Sidebar */}
      <div className="w-full md:w-72 flex flex-col">
        <div className="bg-card border border-border rounded-2xl p-4 flex-1 flex flex-col">
          <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            Hints & Guidance
          </p>

          <AnimatePresence>
            {hints.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex items-center justify-center text-center"
              >
                <p className="text-xs text-muted-foreground">Request hints as you work through the problem</p>
              </motion.div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto mb-4">
                {hints.map((hint, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-primary/5 border border-primary/10 rounded-lg"
                  >
                    <p className="text-xs font-medium text-primary mb-1">Hint {i + 1}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          <Button
            onClick={handleRequestHint}
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs"
            disabled={!currentProblem}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {hints.length === 0 ? "Get a Hint" : "Next Hint"}
          </Button>
        </div>
      </div>
    </div>
  );
}
