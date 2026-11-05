import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export type ToolTrace = { x: number; y: number; progress: number };

type Props = {
  svg: RefObject<SVGSVGElement | null>;
  path: RefObject<SVGPathElement | null>;
  trace: RefObject<ToolTrace>;
  stage: number;
};

export default function PiToolLens({ svg, path, trace, stage }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pinned, setPinned] = useState(false);
  const close = useRef<() => void>(() => {});

  useEffect(() => { close.current(); setPinned(false); }, [stage]);

  useEffect(() => {
    const surface = svg.current?.parentElement;
    const layer = canvas.current;
    const ctx = layer?.getContext('2d');
    if (!surface || !layer || !ctx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const accent = '#ff6952';
    const paper = '#f2eee5';
    let held = false;
    let pointer: number | null = null;
    let timer = 0;
    let frame = 0;
    let radius = 0;
    let x = 0;
    let y = 0;
    let startX = 0;
    let startY = 0;
    let touch = false;
    let bounds = surface.getBoundingClientRect();
    let width = bounds.width;
    let height = bounds.height;
    let dpr = Math.min(devicePixelRatio || 1, 2);
    const resize = () => {
      bounds = surface.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      layer.width = Math.round(width * dpr);
      layer.height = Math.round(height * dpr);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    resize();

    const end = () => {
      clearTimeout(timer);
      held = false;
      surface.classList.remove('is-inspecting');
      if (pointer !== null && surface.hasPointerCapture(pointer)) surface.releasePointerCapture(pointer);
      pointer = null;
      wake();
    };
    close.current = end;
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || (event.target as Element).closest('button, a') || pointer !== null) return;
      bounds = surface.getBoundingClientRect();
      startX = x = event.clientX - bounds.left;
      startY = y = event.clientY - bounds.top;
      touch = event.pointerType !== 'mouse';
      pointer = event.pointerId;
      timer = window.setTimeout(() => {
        held = true;
        surface.classList.add('is-inspecting');
        if (pointer !== null) surface.setPointerCapture(pointer);
        wake();
      }, touch ? 380 : 170);
    };
    const move = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      x = event.clientX - bounds.left;
      y = event.clientY - bounds.top;
      if (held) wake();
      if (!held && touch && Math.hypot(x - startX, y - startY) > 10) end();
    };
    const stopTouch = (event: TouchEvent) => { if (held) event.preventDefault(); };
    const stopMenu = (event: Event) => { if (held || pointer !== null) event.preventDefault(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { end(); setPinned(false); }
    };
    const visibility = () => {
      if (document.hidden) { end(); setPinned(false); cancelAnimationFrame(frame); frame = 0; }
      else wake();
    };
    const scroll = () => { end(); setPinned(false); };
    const line = (ax: number, ay: number, bx: number, by: number) => {
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    };
    const text = (value: string, tx: number, ty: number, color = paper, size = 12) => {
      ctx.fillStyle = color;
      ctx.font = `${size}px "IBM Plex Mono", monospace`;
      ctx.fillText(value, tx, ty);
    };
    const draw = () => {
      frame = 0;
      if (document.hidden) return;
      const matrix = svg.current?.getScreenCTM();
      if (!matrix) return;
      const screen = (px: number, py: number) => ({
        x: matrix.a * px + matrix.c * py + matrix.e - bounds.left,
        y: matrix.b * px + matrix.d * py + matrix.f - bounds.top,
      });
      const tool = screen(1020, 380);
      const limit = Math.min(178, (width - 24) / 2, (height - 24) / 2);
      if (pinned) {
        x = Math.max(limit + 10, Math.min(width - limit - 10, tool.x));
        y = Math.max(limit + 10, Math.min(height - limit - 10, tool.y));
      }
      const target = held || pinned ? limit : 0;
      radius = motion.matches ? target : radius + (target - radius) * .22;
      if (Math.abs(radius - target) < .2) radius = target;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (radius > .5) {
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#191b1a'; ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#30332f'; ctx.lineWidth = .5;
        for (let gx = Math.floor((x - radius) / 20) * 20; gx < x + radius; gx += 20) line(gx, y - radius, gx, y + radius);
        for (let gy = Math.floor((y - radius) / 20) * 20; gy < y + radius; gy += 20) line(x - radius, gy, x + radius, gy);
        ctx.save();
        ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e - bounds.left, matrix.f - bounds.top);
        ctx.strokeStyle = '#a6ada1'; ctx.lineWidth = 1.5 / matrix.a;
        ctx.stroke(new Path2D(path.current?.getAttribute('d') || ''));
        ctx.restore();
        const spark = screen(trace.current.x, trace.current.y);
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(spark.x, spark.y, 4, 0, Math.PI * 2); ctx.fill();
        const progress = trace.current.progress;
        const executing = progress >= .32 && progress < .72;
        const returned = progress >= .72;
        const nearTool = Math.hypot(tool.x - x, tool.y - y) < radius + 30;
        if (nearTool) {
          // Keep payload type readable in CSS pixels, while its connector stays on the SVG node.
          const tx = Math.max(x - radius + 30, Math.min(x + radius - 240, tool.x - 120));
          const ty = y - 85;
          ctx.fillStyle = '#191b1a';
          ctx.fillRect(tx - 8, ty - 20, 248, 92);
          ctx.fillRect(tx - 8, ty + 112, 248, 48);
          text('read', tx, ty + 10, paper, 27);
          text('DEMO / tool_01', tx, ty - 12, '#a6ada1', 10);
          text(returned ? 'tool_execution_end' : executing ? 'tool_execution_start' : 'tool_call', tx, ty + 38, accent, 11);
          text('path  "src/agent.ts"', tx, ty + 64);
          ctx.strokeStyle = '#454b42'; line(tx, ty + 74, tx + 224, ty + 74);
          text(returned ? 'result  →  context' : executing ? 'reading file…' : 'arguments  →  tool', tx, ty + 126, returned ? accent : paper);
          text(returned ? '"export function run()…"' : executing ? 'await execute(args)' : '{ path: "src/agent.ts" }', tx, ty + 148, '#b8bfb2', 11);
          ctx.strokeStyle = accent;
          line(tx, ty + 168, tx + 224 * Math.max(.03, progress), ty + 168);
          line(tool.x, tool.y, tx + 232, tool.y);
          ctx.beginPath(); ctx.arc(tool.x, tool.y, 6, 0, Math.PI * 2); ctx.stroke();
        } else {
          text('MESSAGE FLOW', x - 67, y - 58, '#b8bfb2', 11);
          text('→ TOOL', x - 25, y + 65, accent, 12);
        }
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(spark.x, spark.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ff695255'; ctx.lineWidth = 1;
        line(x - radius, y, x - radius + 18, y);
        line(x + radius - 18, y, x + radius, y);
        line(x, y - radius, x, y - radius + 18);
        text(`${Math.round(trace.current.x)} : ${Math.round(trace.current.y)}`, x - 39, y + radius - 24, '#b8bfb2', 10);
        ctx.restore();
        ctx.strokeStyle = accent; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 72; i++) {
          const angle = i * Math.PI / 36;
          const length = i % 6 === 0 ? 8 : 3;
          line(x + Math.cos(angle) * (radius + 3), y + Math.sin(angle) * (radius + 3), x + Math.cos(angle) * (radius + 3 + length), y + Math.sin(angle) * (radius + 3 + length));
        }
      }
      if ((!motion.matches && (held || pinned)) || radius !== target) frame = requestAnimationFrame(draw);
    };
    function wake() { if (!frame && !document.hidden) frame = requestAnimationFrame(draw); }
    surface.addEventListener('pointerdown', down);
    surface.addEventListener('pointermove', move);
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);
    surface.addEventListener('lostpointercapture', end);
    surface.addEventListener('touchmove', stopTouch, { passive: false });
    surface.addEventListener('contextmenu', stopMenu);
    window.addEventListener('pointerup', end);
    window.addEventListener('blur', scroll);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('keydown', escape);
    document.addEventListener('visibilitychange', visibility);
    wake();
    return () => {
      clearTimeout(timer); cancelAnimationFrame(frame); observer.disconnect();
      surface.classList.remove('is-inspecting');
      surface.removeEventListener('pointerdown', down);
      surface.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerup', end);
      surface.removeEventListener('pointercancel', end);
      surface.removeEventListener('lostpointercapture', end);
      surface.removeEventListener('touchmove', stopTouch);
      surface.removeEventListener('contextmenu', stopMenu);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('blur', scroll);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('keydown', escape);
      document.removeEventListener('visibilitychange', visibility);
      ctx.clearRect(0, 0, layer.width, layer.height);
    };
  }, [pinned, svg, path, trace]);

  return <>
    <canvas className="pi-tool-lens" ref={canvas} aria-hidden="true" />
    <button className="pi-lens-toggle" type="button" aria-pressed={pinned}
      aria-describedby="pi-lens-description" onClick={() => setPinned(value => !value)}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="10" cy="10" r="6" /><path d="m15 15 6 6M10 7v6M7 10h6" />
      </svg>
      {pinned ? '收起透视' : '透视 TOOL'}
    </button>
    <span className="pi-sr" id="pi-lens-description">演示数据：read 工具接收路径 src/agent.ts，执行后把文本结果返回上下文。也可在图上长按查看，松开或按 Escape 关闭。</span>
  </>;
}
