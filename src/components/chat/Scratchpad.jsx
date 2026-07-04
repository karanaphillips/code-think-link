import React, { useRef, useState, useEffect, useCallback } from "react";
import { Pencil, Eraser, Trash2, Download, Send, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = ["#1e1e2e", "#7c3aed", "#ef4444", "#2563eb", "#16a34a", "#d97706"];

export default function Scratchpad({ onSendToTutor }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const [tool, setTool] = useState("pen"); // pen | eraser
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(3);
  const [canSend, setCanSend] = useState(false);

  // Set canvas resolution on mount and resize
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Save current drawing
    const imageData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    const ctx = canvas.getContext("2d");
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.putImageData(imageData, 0, 0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    const ctx = canvas.getContext("2d");
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "eraser" ? "#fafafa" : color;
    ctx.lineWidth = tool === "eraser" ? lineWidth * 5 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    lastPos.current = pos;
    setCanSend(true);
  };

  const stopDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setCanSend(false);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "scratchpad.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const sendToTutor = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    onSendToTutor(dataUrl);
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scratchpad</p>

        {/* Tool row */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setTool("pen")}
            title="Pen"
            className={`p-1.5 rounded-lg transition-colors ${tool === "pen" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool("eraser")}
            title="Eraser"
            className={`p-1.5 rounded-lg transition-colors ${tool === "eraser" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
          >
            <Eraser className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Colors */}
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c && tool === "pen" ? "border-primary scale-110" : "border-transparent"}`}
              style={{ background: c }}
            />
          ))}

          <div className="w-px h-4 bg-border mx-1" />

          {/* Stroke size */}
          <button onClick={() => setLineWidth((w) => Math.max(1, w - 1))} className="p-1 text-muted-foreground hover:text-foreground">
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-xs text-muted-foreground w-4 text-center">{lineWidth}</span>
          <button onClick={() => setLineWidth((w) => Math.min(20, w + 1))} className="p-1 text-muted-foreground hover:text-foreground">
            <Plus className="w-3 h-3" />
          </button>

          <div className="flex-1" />

          <button onClick={downloadCanvas} title="Download" className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={clearCanvas} title="Clear" className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          style={{ background: "#fafafa" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!canSend && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-muted-foreground/40 select-none">Draw your work here</p>
          </div>
        )}
      </div>

      {/* Send button */}
      <div className="flex-shrink-0 p-3 border-t border-border">
        <Button
          onClick={sendToTutor}
          disabled={!canSend}
          size="sm"
          className="w-full gap-2"
        >
          <Send className="w-3.5 h-3.5" />
          Share with Tutor
        </Button>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-1">Sends your drawing as a message</p>
      </div>
    </div>
  );
}