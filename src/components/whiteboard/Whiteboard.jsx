import React, { useState } from "react";
import { motion } from "framer-motion";
import { Send, Download, RotateCcw, Code2 } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";

const CODE_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "plaintext", label: "Pseudocode" },
];

const EXTENSIONS = {
  python: "py", javascript: "js", typescript: "ts", java: "java",
  cpp: "cpp", c: "c", html: "html", css: "css", sql: "sql",
  bash: "sh", plaintext: "txt",
};

export default function Whiteboard({ currentProblem, onSendSolution, onNewProblem, isLoading }) {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");

  const handleExport = () => {
    const ext = EXTENSIONS[language] ?? "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = () => {
    if (!code.trim()) return;
    const langLabel = CODE_LANGUAGES.find((l) => l.value === language)?.label ?? language;
    onSendSolution(`Here is my ${langLabel} code:\n\`\`\`${language}\n${code}\n\`\`\``);
    setCode("");
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      {/* Problem banner */}
      {currentProblem ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex-shrink-0"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Working on</p>
          <p className="text-sm text-foreground leading-relaxed line-clamp-2">{currentProblem}</p>
        </motion.div>
      ) : (
        <div className="bg-card border border-dashed border-border rounded-xl px-4 py-3 text-center flex-shrink-0">
          <p className="text-sm text-muted-foreground">Start a chat to get a problem to work on</p>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-border overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-xs px-2 py-0.5 rounded border border-border bg-background text-foreground focus:outline-none"
            >
              {CODE_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-green-400" />
          </div>
        </div>

        {/* Monaco */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(val) => setCode(val ?? "")}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              wordWrap: "on",
              scrollBeyondLastLine: false,
              renderLineHighlight: "line",
              tabSize: 2,
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0 flex-wrap">
        <Button onClick={onNewProblem} variant="outline" size="sm" className="gap-2" disabled={isLoading}>
          <RotateCcw className="w-3.5 h-3.5" />
          New Problem
        </Button>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2" disabled={!code.trim()}>
          <Download className="w-3.5 h-3.5" />
          Download
        </Button>
        <Button onClick={handleSubmit} disabled={!code.trim() || isLoading} className="flex-1 gap-2 min-w-[120px]" size="sm">
          <Send className="w-3.5 h-3.5" />
          {isLoading ? "Sending..." : "Send to Tutor"}
        </Button>
      </div>
    </div>
  );
}
