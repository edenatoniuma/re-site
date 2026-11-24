import { useEffect, useRef, useState, type ReactNode } from 'react';
import '../../styles/demos/flowcharts.css';

type View = { x: number; y: number; scale: number };
type Frame = { x: number; y: number; w: number; h: number; title: string; color: string; content: ReactNode };

export default function FlowCanvas({ title, frames }: { title: string; frames: Frame[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 24, y: 24, scale: .3 });
  const [active, setActive] = useState(-1);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  function fit(index = -1) {
    const el = viewport.current;
    if (!el) return;
    const f = index < 0 ? { x: 0, y: 0, w: Math.max(...frames.map(f => f.x + f.w)), h: Math.max(...frames.map(f => f.y + f.h)) } : frames[index];
    const padding = el.clientWidth < 600 ? 20 : 48;
    const availableHeight = el.clientHeight - (document.documentElement.classList.contains('is-embedded') ? 0 : 64);
    const scale = Math.min((el.clientWidth - padding * 2) / f.w, (availableHeight - padding * 2) / f.h);
    setView({ x: (el.clientWidth - f.w * scale) / 2 - f.x * scale, y: (availableHeight - f.h * scale) / 2 - f.y * scale, scale });
    setActive(index);
  }
  function zoom(factor: number, x?: number, y?: number) {
    const el = viewport.current;
    if (!el) return;
    const px = x ?? el.clientWidth / 2, py = y ?? el.clientHeight / 2;
    setView(v => {
      // Keep transforms finite at the numerical limits while leaving a broad zoom range.
      const scale = Math.max(.005, Math.min(64, v.scale * factor));
      const ratio = scale / v.scale;
      return { x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio, scale };
    });
  }
  useEffect(() => {
    const el = viewport.current!;
    const observer = new ResizeObserver(() => fit());
    observer.observe(el);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1);
      zoom(Math.exp(-Math.max(-300, Math.min(300, delta)) * .002), event.clientX - rect.left, event.clientY - rect.top);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { observer.disconnect(); el.removeEventListener('wheel', wheel); };
  }, []);
  return <main className="flow-app">
    <header className="flow-header"><a className="flow-back" href="/" aria-label="返回作品列表"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" /></svg>返回</a><h1>{title}</h1><span>{frames.length} 张流程图</span></header>
    <nav className="flow-nav" aria-label="定位流程图"><button aria-pressed={active === -1} onClick={() => fit()}>全部</button>{frames.map((f, i) => <button key={f.title} aria-pressed={active === i} onClick={() => fit(i)}>{f.title}</button>)}</nav>
    <div ref={viewport} className={`flow-viewport${dragging ? ' is-dragging' : ''}`} tabIndex={0} role="region" aria-label="流程图画布，方向键平移，加减键缩放，0 键显示全部"
      onKeyDown={event => {
        if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
        if (event.key === '+' || event.key === '=') zoom(1.25);
        if (event.key === '-') zoom(.8);
        if (event.key === '0') fit();
        if (event.key.startsWith('Arrow')) setView(v => ({ ...v, x: v.x + (event.key === 'ArrowLeft' ? 60 : event.key === 'ArrowRight' ? -60 : 0), y: v.y + (event.key === 'ArrowUp' ? 60 : event.key === 'ArrowDown' ? -60 : 0) }));
      }}
      onPointerDown={event => { if (event.button !== 0 || drag.current || (event.target instanceof Element && event.target.closest('a, summary, button'))) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; setDragging(true); }}
      onPointerMove={event => { const p = drag.current; if (!p || p.id !== event.pointerId) return; const dx = event.clientX - p.x, dy = event.clientY - p.y; p.x = event.clientX; p.y = event.clientY; setView(v => ({ ...v, x: v.x + dx, y: v.y + dy })); }}
      onPointerUp={event => { if (drag.current?.id === event.pointerId) { drag.current = null; setDragging(false); event.currentTarget.releasePointerCapture(event.pointerId); } }}
      onLostPointerCapture={() => { drag.current = null; setDragging(false); }} onPointerCancel={() => { drag.current = null; setDragging(false); }}>
      <div className="flow-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>{frames.map(frame => <section key={frame.title} className="flow-frame" style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}><h2><span style={{ background: frame.color }} />{frame.title}</h2>{frame.content}</section>)}</div>
    </div>
    <div className="flow-controls" role="group" aria-label="画布缩放"><button aria-label="缩小" onClick={() => zoom(.8)}>−</button><button className="flow-percentage" aria-label="重置为百分之百" onClick={() => zoom(1 / view.scale)}>{Math.round(view.scale * 100)}%</button><button aria-label="放大" onClick={() => zoom(1.25)}>+</button><button className="flow-fit" onClick={() => fit()}>适应画布</button></div>
  </main>;
}
