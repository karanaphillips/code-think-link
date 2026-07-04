import React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { User, Sparkles } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import Graph3DDisplay from "./Graph3DDisplay";
import InteractiveGraph from "./InteractiveGraph";

// Extract graph blocks, returning interleaved text/graph sections
const extractGraphs = (text) => {
  const parts = [];
  const regex = /```(graph3d|graph)\n([\s\S]*?)```/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: "text", content: text.slice(last, match.index) });
    try {
      const data = JSON.parse(match[2]);
      parts.push({ type: match[1], data });
    } catch {
      parts.push({ type: "text", content: match[0] });
    }
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  return parts;
};

// Render a text segment: process math expressions within markdown
// Strategy: replace $...$ and $$...$$ with unique placeholders, render markdown,
// then swap placeholders back with KaTeX HTML via dangerouslySetInnerHTML on a wrapper.
// Simpler approach: render the whole thing by splitting on math delimiters and
// rendering each segment appropriately.
function MathMarkdown({ content }) {
  // Split on $$...$$, \[...\], $...$, \(...\) patterns
  const segments = [];
  const regex = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$([^$\n]+?)\$/g;
  let last = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", content: content.slice(last, match.index) });
    }

    let mathContent, isBlock;
    if (match[1] !== undefined) {
      mathContent = match[1]; isBlock = true;
    } else if (match[2] !== undefined) {
      mathContent = match[2]; isBlock = true;
    } else if (match[3] !== undefined) {
      mathContent = match[3]; isBlock = false;
    } else {
      mathContent = match[4]; isBlock = false;
    }

    try {
      const html = katex.renderToString(mathContent.trim(), { displayMode: isBlock, throwOnError: false });
      segments.push({ type: "math", html, isBlock });
    } catch {
      segments.push({ type: "text", content: match[0] });
    }
    last = regex.lastIndex;
  }

  if (last < content.length) {
    segments.push({ type: "text", content: content.slice(last) });
  }

  // If no math was found, just render plain markdown
  if (!segments.some((s) => s.type === "math")) {
    return (
      <ReactMarkdown className="prose prose-sm max-w-none text-foreground prose-p:leading-7 prose-p:my-2 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-headings:mt-4 prose-headings:mb-2 prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded">
        {content}
      </ReactMarkdown>
    );
  }

  // Mix of text + math — render segments
  return (
    <div className="text-sm leading-7 space-y-1">
      {segments.map((seg, i) => {
        if (seg.type === "math" && seg.isBlock) {
          return (
            <div
              key={i}
              className="my-5 flex justify-center overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: seg.html }}
            />
          );
        }
        if (seg.type === "math") {
          return (
            <span
              key={i}
              className="inline"
              dangerouslySetInnerHTML={{ __html: seg.html }}
            />
          );
        }
        // Text segment — render as markdown
        return (
          <ReactMarkdown
            key={i}
            className="prose prose-sm max-w-none text-foreground prose-p:leading-7 prose-p:my-1 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mt-4 prose-headings:mb-2 prose-headings:text-foreground prose-strong:text-foreground inline"
          >
            {seg.content}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}

export default function ChatMessage({ message, onSendToChat }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
      role="article"
      aria-label={`${isUser ? "User" : "CodeThinkLink tutor"} message`}
    >
      {!isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-1"
          aria-hidden="true"
        >
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      )}

      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-4 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card border border-border rounded-bl-md"
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="[&_.katex]:text-foreground [&_.katex-display]:text-foreground">
            {extractGraphs(message.content).map((section, si) =>
              section.type === "graph" ? (
                <InteractiveGraph key={si} graphData={section.data} onSendToChat={onSendToChat} />
              ) : section.type === "graph3d" ? (
                <Graph3DDisplay key={si} graphData={section.data} />
              ) : (
                <MathMarkdown key={si} content={section.content} />
              )
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center mt-1"
          aria-hidden="true"
        >
          <User className="w-4 h-4 text-secondary-foreground" />
        </div>
      )}
    </motion.div>
  );
}
