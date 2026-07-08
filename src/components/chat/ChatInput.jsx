import React, { useState, useRef, useEffect } from "react";
import { Send, Code2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CODE_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "csharp", label: "C#" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "pseudocode", label: "Pseudocode" },
];

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState("python");
  const [codeValue, setCodeValue] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const insertCodeBlock = () => {
    if (!codeValue.trim()) return;
    const block = `\`\`\`${codeLanguage}\n${codeValue}\n\`\`\``;
    setValue((v) => (v ? `${v}\n\n${block}` : block));
    setCodeValue("");
    setShowCodeEditor(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Code editor panel */}
      {showCodeEditor && (
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Insert code block</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value)}
                className="text-xs px-2 py-1 rounded-md border border-border bg-background text-foreground focus:outline-none"
              >
                {CODE_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCodeEditor(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value)}
            placeholder={`Paste your ${CODE_LANGUAGES.find((l) => l.value === codeLanguage)?.label ?? ""} code here...`}
            rows={6}
            className="w-full bg-muted/50 rounded-lg p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none border border-border"
          />
          <div className="mt-2.5 flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={insertCodeBlock}
              disabled={!codeValue.trim()}
              className="text-xs h-7 gap-1.5"
            >
              <Code2 className="w-3 h-3" />
              Insert Code Block
            </Button>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 p-2 rounded-2xl border border-border bg-card shadow-sm focus-within:border-primary/40 focus-within:shadow-md transition-all duration-300">
        <button
          type="button"
          onClick={() => setShowCodeEditor((v) => !v)}
          title="Insert code block"
          className={`shrink-0 h-10 w-10 flex items-center justify-center rounded-xl transition-colors ${
            showCodeEditor ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Code2 className="w-4 h-4" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a coding question or describe what you're trying to build..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 max-h-40"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim() || disabled}
          className="h-10 w-10 rounded-xl shrink-0 transition-all duration-200"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground/60 text-center">
        CodeThinkLink guides you through problems — it won't write your code for you
      </p>
    </form>
  );
}
