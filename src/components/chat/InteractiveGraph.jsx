import React, { useMemo, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { Plus, Trash2, Send, RotateCcw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = [
  "hsl(252,56%,57%)",
  "hsl(340,60%,55%)",
  "hsl(160,50%,45%)",
  "hsl(200,60%,50%)",
];

function safeEval(expr, x) {
  try {
    const cleaned = expr
      .replace(/\^/g, "**")
      .replace(/(\d)(x)/g, "$1*x")
      .replace(/(\))(x|\()/g, "$1*$2")
      .replace(/\bsin\b/g, "Math.sin")
      .replace(/\bcos\b/g, "Math.cos")
      .replace(/\btan\b/g, "Math.tan")
      .replace(/\bsqrt\b/g, "Math.sqrt")
      .replace(/\babs\b/g, "Math.abs")
      .replace(/\bln\b/g, "Math.log")
      .replace(/\blog\b/g, "Math.log10")
      .replace(/\bpi\b/g, "Math.PI")
      .replace(/\be\b/g, "Math.E");
    // eslint-disable-next-line no-new-func
    const fn = new Function("x", `"use strict"; return (${cleaned});`);
    const result = fn(x);
    return isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function isValidExpr(expr) {
  return safeEval(expr, 1) !== null || safeEval(expr, 0) !== null;
}

export default function InteractiveGraph({ graphData, onSendToChat }) {
  const { functions: initialFns = [], xMin: initXMin = -10, xMax: initXMax = 10, title } = graphData;

  const [functions, setFunctions] = useState(
    initialFns.map((f) => ({ expr: f.expr, label: f.label || `y = ${f.expr}` }))
  );
  const [xRange, setXRange] = useState([initXMin, initXMax]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [draftExpr, setDraftExpr] = useState("");
  const [newExpr, setNewExpr] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const points = useMemo(() => {
    const [min, max] = xRange;
    const step = (max - min) / 300;
    const data = [];
    for (let x = min; x <= max + step / 2; x += step) {
      const rx = Math.round(x * 1000) / 1000;
      const entry = { x: Math.round(rx * 100) / 100 };
      functions.forEach((fn, i) => {
        entry[`y${i}`] = safeEval(fn.expr, rx);
      });
      data.push(entry);
    }
    return data;
  }, [functions, xRange]);

  const yValues = points.flatMap((p) =>
    functions.map((_, i) => p[`y${i}`]).filter((v) => v !== null)
  );
  const yMin = yValues.length ? Math.min(...yValues) : -10;
  const yMax = yValues.length ? Math.max(...yValues) : 10;
  const yPad = Math.max((yMax - yMin) * 0.15, 1);

  const startEdit = (i) => {
    setEditingIndex(i);
    setDraftExpr(functions[i].expr);
  };

  const commitEdit = (i) => {
    if (isValidExpr(draftExpr)) {
      setFunctions((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, expr: draftExpr, label: `y = ${draftExpr}` } : f
        )
      );
    }
    setEditingIndex(null);
  };

  const removeFunction = (i) => {
    setFunctions((prev) => prev.filter((_, idx) => idx !== i));
    if (editingIndex === i) setEditingIndex(null);
  };

  const addFunction = () => {
    if (!newExpr.trim() || !isValidExpr(newExpr)) return;
    setFunctions((prev) => [
      ...prev,
      { expr: newExpr.trim(), label: newLabel.trim() || `y = ${newExpr.trim()}` },
    ]);
    setNewExpr("");
    setNewLabel("");
    setShowAdd(false);
  };

  const handleSendToChat = useCallback(() => {
    if (!onSendToChat) return;
    const lines = functions.map((f) => `• ${f.label}`).join("\n");
    const msg = `I've modified the graph in the interactive editor. Here are my current functions:\n\n${lines}\n\nx range: [${xRange[0]}, ${xRange[1]}]\n\nCan you guide me on what I should observe or what this tells me about the problem?`;
    onSendToChat(msg);
  }, [functions, xRange, onSendToChat]);

  return (
    <div className="mt-3 rounded-xl border border-primary/30 bg-background shadow-sm space-y-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Interactive Graph Editor</p>
          {title && <p className="text-xs text-muted-foreground mt-0.5">{title}</p>}
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={handleSendToChat}>
          <Send className="w-3 h-3" />
          Ask Tutor
        </Button>
      </div>

      {/* Chart */}
      <div className="px-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickCount={9}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              domain={[yMin - yPad, yMax + yPad]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, name) => {
                const idx = parseInt(name.replace("y", ""));
                return [value !== null ? value.toFixed(3) : "—", functions[idx]?.label || `f${idx}(x)`];
              }}
            />
            <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.4} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.4} />
            {functions.length > 1 && (
              <Legend
                formatter={(_, entry) => {
                  const idx = parseInt(entry.dataKey.replace("y", ""));
                  return functions[idx]?.label || "";
                }}
              />
            )}
            {functions.map((fn, i) => (
              <Line
                key={i}
                type="monotone"
                dataKey={`y${i}`}
                stroke={COLORS[i % COLORS.length]}
                dot={false}
                strokeWidth={2.5}
                connectNulls={false}
                name={`y${i}`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Function list editor */}
      <div className="px-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Functions</p>
        {functions.map((fn, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            {editingIndex === i ? (
              <input
                autoFocus
                value={draftExpr}
                onChange={(e) => setDraftExpr(e.target.value)}
                onBlur={() => commitEdit(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit(i);
                  if (e.key === "Escape") setEditingIndex(null);
                }}
                className="flex-1 px-2 py-1 rounded border border-primary bg-background text-sm font-mono text-foreground focus:outline-none"
              />
            ) : (
              <span className="flex-1 text-sm font-mono text-foreground truncate">{fn.label}</span>
            )}
            <button
              onClick={() => startEdit(i)}
              className="p-1 text-muted-foreground hover:text-primary transition-colors"
              title="Edit expression"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => removeFunction(i)}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              title="Remove function"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Add function */}
        {showAdd ? (
          <div className="flex flex-col gap-2 p-3 rounded-lg border border-dashed border-border bg-muted/30">
            <input
              autoFocus
              placeholder="Expression (e.g. x^2 + 2*x - 1)"
              value={newExpr}
              onChange={(e) => setNewExpr(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFunction()}
              className="px-2 py-1.5 rounded border border-border bg-background text-sm font-mono text-foreground focus:outline-none focus:border-primary"
            />
            <input
              placeholder="Label (optional, e.g. y = x² + 2x − 1)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFunction()}
              className="px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={addFunction} className="text-xs">Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewExpr(""); setNewLabel(""); }} className="text-xs">Cancel</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add function
          </button>
        )}
      </div>

      {/* X range + reset */}
      <div className="flex items-center gap-3 px-4 pb-4 text-xs text-muted-foreground flex-wrap">
        <span>x range:</span>
        <input
          type="number"
          value={xRange[0]}
          onChange={(e) => setXRange([Number(e.target.value), xRange[1]])}
          className="w-16 px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
        />
        <span>to</span>
        <input
          type="number"
          value={xRange[1]}
          onChange={(e) => setXRange([xRange[0], Number(e.target.value)])}
          className="w-16 px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
        />
        <button
          onClick={() => {
            setXRange([initXMin, initXMax]);
            setFunctions(initialFns.map((f) => ({ expr: f.expr, label: f.label || `y = ${f.expr}` })));
          }}
          className="flex items-center gap-1 text-primary hover:underline text-xs"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>
    </div>
  );
}