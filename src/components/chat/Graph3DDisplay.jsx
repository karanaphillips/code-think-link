import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

function safeEval3D(expr, x, y) {
  try {
    const cleaned = expr
      .replace(/\^/g, "**")
      .replace(/\bsin\b/g, "Math.sin")
      .replace(/\bcos\b/g, "Math.cos")
      .replace(/\btan\b/g, "Math.tan")
      .replace(/\bsqrt\b/g, "Math.sqrt")
      .replace(/\babs\b/g, "Math.abs")
      .replace(/\bln\b/g, "Math.log")
      .replace(/\blog\b/g, "Math.log10")
      .replace(/\bexp\b/g, "Math.exp")
      .replace(/\bpi\b/g, "Math.PI")
      .replace(/\be\b/g, "Math.E");
    // eslint-disable-next-line no-new-func
    const fn = new Function("x", "y", `"use strict"; return (${cleaned});`);
    const result = fn(x, y);
    return isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

export default function Graph3DDisplay({ graphData }) {
  const { expr, label, title, xMin = -3, xMax = 3, yMin = -3, yMax = 3 } = graphData;
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const frameRef = useRef(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const spherical = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 8 });
  const cameraRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 320;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f8fc);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;
    const updateCamera = () => {
      const { theta, phi, radius } = spherical.current;
      camera.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // Grid / Axes
    const axesMat = (color) => new THREE.LineBasicMaterial({ color });
    const axisLine = (from, to, color) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...from),
        new THREE.Vector3(...to),
      ]);
      return new THREE.Line(geo, axesMat(color));
    };
    scene.add(axisLine([-5, 0, 0], [5, 0, 0], 0xef4444)); // x red
    scene.add(axisLine([0, -5, 0], [0, 5, 0], 0x22c55e)); // y green
    scene.add(axisLine([0, 0, -5], [0, 0, 5], 0x3b82f6)); // z blue

    // Axis labels (sprites)
    const makeLabel = (text, position) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, 32, 48);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
      sprite.position.set(...position);
      sprite.scale.set(0.6, 0.6, 1);
      return sprite;
    };
    scene.add(makeLabel("x", [5.4, 0, 0]));
    scene.add(makeLabel("y", [0, 5.4, 0]));
    scene.add(makeLabel("z", [0, 0, 5.4]));

    // Build surface geometry
    const segments = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const indices = [];

    let zValues = [];
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= segments; j++) {
        const x = xMin + (i / segments) * (xMax - xMin);
        const y = yMin + (j / segments) * (yMax - yMin);
        const z = safeEval3D(expr, x, y);
        zValues.push(z);
      }
    }

    const zMin = Math.min(...zValues);
    const zMax2 = Math.max(...zValues);
    const zRange = zMax2 - zMin || 1;

    // scale so surface fits nicely
    const scaleXY = 4 / Math.max(xMax - xMin, yMax - yMin);
    const scaleZ = 3 / zRange;

    let idx = 0;
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= segments; j++) {
        const x = xMin + (i / segments) * (xMax - xMin);
        const y = yMin + (j / segments) * (yMax - yMin);
        const z = zValues[idx++];
        positions.push(x * scaleXY, z * scaleZ, y * scaleXY);

        // Color by height (blue → purple → red)
        const t = (z - zMin) / zRange;
        const r = t;
        const g = 0.3 * (1 - Math.abs(t - 0.5) * 2);
        const b = 1 - t;
        colors.push(r, g, b);
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i * (segments + 1) + j;
        const b2 = a + 1;
        const c = a + (segments + 1);
        const d = c + 1;
        indices.push(a, b2, c, b2, d, c);
      }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 40,
      transparent: true,
      opacity: 0.92,
    });

    scene.add(new THREE.Mesh(geometry, material));

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x7c3aed, wireframe: true, opacity: 0.08, transparent: true });
    scene.add(new THREE.Mesh(geometry, wireMat));

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Mouse drag to orbit
    const onMouseDown = (e) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      spherical.current.theta -= dx * 0.01;
      spherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.current.phi + dy * 0.01));
      updateCamera();
    };
    const onMouseUp = () => { isDragging.current = false; };
    const onWheel = (e) => {
      spherical.current.radius = Math.max(3, Math.min(20, spherical.current.radius + e.deltaY * 0.01));
      updateCamera();
    };

    // Touch support
    let lastTouch = null;
    const onTouchStart = (e) => { lastTouch = e.touches[0]; };
    const onTouchMove = (e) => {
      if (!lastTouch) return;
      const t = e.touches[0];
      const dx = t.clientX - lastTouch.clientX;
      const dy = t.clientY - lastTouch.clientY;
      lastTouch = t;
      spherical.current.theta -= dx * 0.01;
      spherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.current.phi + dy * 0.01));
      updateCamera();
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [expr, xMin, xMax, yMin, yMax]);

  return (
    <div className="mt-3 rounded-xl border border-border bg-background overflow-hidden">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        {title && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>}
        <p className="text-xs text-muted-foreground">Drag to rotate · Scroll to zoom</p>
      </div>
      <div ref={mountRef} className="w-full cursor-grab active:cursor-grabbing" style={{ height: 320 }} />
      <div className="px-4 py-2 flex items-center gap-2">
        <span className="text-xs font-mono px-2 py-1 rounded bg-accent text-accent-foreground">
          z = {label || expr}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="inline-block w-3 h-1 bg-red-500 rounded" /> x
          <span className="inline-block w-3 h-1 bg-green-500 rounded ml-2" /> y
          <span className="inline-block w-3 h-1 bg-blue-500 rounded ml-2" /> z
        </span>
      </div>
    </div>
  );
}