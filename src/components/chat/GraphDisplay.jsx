import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["hsl(252,56%,57%)", "hsl(340,60%,55%)", "hsl(160,50%,45%)", "hsl(200,60%,50%)"];

function safeEval(expr, x) {
  try {
    // Replace common math notation
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

export default function GraphDisplay({ graphData }) {
  const { functions = [], xMin = -10, xMax = 10, title } = graphData;
  const [xRange, setXRange] = useState([xMin, xMax]);

  const points = useMemo(() => {
    const [min, max] = xRange;
    const step = (max - min) / 200;
    const data = [];
    for (let x = min; x <= max + step / 2; x += step) {
      const rounded = Math.round(x * 1000) / 1000;
      const entry = { x: Math.round(rounded * 100) / 100 };
      functions.forEach((fn, i) => {
        entry[`y${i}`] = safeEval(fn.expr, rounded);
      });
      data.push(entry);
    }
    return data;
  }, [functions, xRange]);

  const yValues = points.flatMap((p) =>
    functions.map((_, i) => p[`y${i}`]).filter((v) => v !== null)
  );
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yPad = Math.max((yMax - yMin) * 0.1, 1);

  return (
    <div className="mt-3 rounded-xl border border-border bg-background p-4 space-y-3">
      {title && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>}

      <ResponsiveContainer width="100%" height={260}>
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
          <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
          {functions.length > 1 && <Legend formatter={(_, entry) => {
            const idx = parseInt(entry.dataKey.replace("y", ""));
            return functions[idx]?.label || `y = ${functions[idx]?.expr}`;
          }} />}
          {functions.map((fn, i) => (
            <Line
              key={i}
              type="monotone"
              dataKey={`y${i}`}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              strokeWidth={2}
              connectNulls={false}
              name={`y${i}`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* X-range controls */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
          onClick={() => setXRange([xMin, xMax])}
          className="text-primary hover:underline text-xs"
        >
          Reset
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {functions.map((fn, i) => (
          <span key={i} className="text-xs font-mono px-2 py-1 rounded bg-accent text-accent-foreground">
            {fn.label || `y = ${fn.expr}`}
          </span>
        ))}
      </div>
    </div>
  );
}