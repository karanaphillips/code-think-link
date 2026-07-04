import React, { useState, useRef, useEffect } from "react";
import { Send, FunctionSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import katex from "katex";
import "katex/dist/katex.min.css";

const MATH_SNIPPETS = [
  { label: "x²", insert: "x^{2}" },
  { label: "xⁿ", insert: "x^{n}" },
  { label: "√", insert: "\\sqrt{}" },
  { label: "∛", insert: "\\sqrt[3]{}" },
  { label: "frac", insert: "\\frac{}{}" },
  { label: "∫", insert: "\\int_{a}^{b}" },
  { label: "∑", insert: "\\sum_{i=1}^{n}" },
  { label: "∏", insert: "\\prod_{i=1}^{n}" },
  { label: "lim", insert: "\\lim_{x \\to }" },
  { label: "→", insert: "\\to" },
  { label: "∞", insert: "\\infty" },
  { label: "≤", insert: "\\leq" },
  { label: "≥", insert: "\\geq" },
  { label: "≠", insert: "\\neq" },
  { label: "±", insert: "\\pm" },
  { label: "sin", insert: "\\sin()" },
  { label: "cos", insert: "\\cos()" },
  { label: "tan", insert: "\\tan()" },
  { label: "ln", insert: "\\ln()" },
  { label: "log", insert: "\\log_{}" },
  { label: "eˣ", insert: "e^{x}" },
  { label: "π", insert: "\\pi" },
  { label: "θ", insert: "\\theta" },
  { label: "α", insert: "\\alpha" },
  { label: "β", insert: "\\beta" },
  { label: "Δ", insert: "\\Delta" },
  { label: "∂", insert: "\\partial" },
  { label: "∇", insert: "\\nabla" },
  { label: "matrix", insert: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
  { label: "|x|", insert: "\\left| x \\right|" },
];

// Extract all $...$ regions and render them as KaTeX
function renderPreview(text) {
  if (!text) return null;
  const parts = [];
  const regex = /\$\$([\s\S]*?)\$\$|\$((?:[^$\\]|\\.)*)\$/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: "text", content: text.slice(last, match.index) });
    const isBlock = match[0].startsWith("$$");
    const math = isBlock ? match[1] : match[2];
    try {
      parts.push({ type: "math", html: katex.renderToString(math, { displayMode: isBlock }), isBlock });
    } catch {
      parts.push({ type: "text", content: match[0] });
    }
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  // Only show preview if there's actual math
  if (!parts.some((p) => p.type === "math")) return null;
  return parts;
}

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const [showLatex, setShowLatex] = useState(false);
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

  const insertSnippet = (snippet) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    // Wrap in $ if not already inside math context
    const before = value.slice(0, start);
    const after = value.slice(end);
    const insertion = `$${snippet}$`;
    const newVal = before + insertion + after;
    setValue(newVal);
    // Place cursor inside the first {} if present, else after the $
    setTimeout(() => {
      const bracePos = newVal.indexOf("{", start);
      const cursorPos = bracePos !== -1 && bracePos < start + insertion.length
        ? bracePos + 1
        : start + insertion.length - 1;
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const preview = renderPreview(value);

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* LaTeX toolbar */}
      {showLatex && (
        <div className="rounded-xl border border-border bg-card p-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Math Symbols — click to insert</span>
            <button type="button" onClick={() => setShowLatex(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {MATH_SNIPPETS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => insertSnippet(s.insert)}
                className="px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors font-mono"
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Wrap LaTeX in <span className="font-mono bg-muted px-1 rounded">$...$</span> for inline or <span className="font-mono bg-muted px-1 rounded">$$...$$</span> for display math.
          </p>
        </div>
      )}

      {/* Live preview */}
      {preview && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-foreground [&_.katex]:text-foreground [&_.katex-display]:my-1">
          {preview.map((part, i) =>
            part.type === "math" ? (
              <span key={i} dangerouslySetInnerHTML={{ __html: part.html }} className={part.isBlock ? "block my-1" : "inline"} />
            ) : (
              <span key={i}>{part.content}</span>
            )
          )}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 p-2 rounded-2xl border border-border bg-card shadow-sm focus-within:border-primary/40 focus-within:shadow-md transition-all duration-300">
        <button
          type="button"
          onClick={() => setShowLatex((v) => !v)}
          title="LaTeX equation editor"
          className={`shrink-0 h-10 w-10 flex items-center justify-center rounded-xl transition-colors ${showLatex ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
        >
          <FunctionSquare className="w-4 h-4" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a math question... use $x^2$ for equations"
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