import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../../styles/demos/flowcharts.css';

type View = { x: number; y: number; scale: number };
type ExtensionEdge = { target: 'B' | 'C' | 'D'; kind: '加强' | '赋能'; short: string; title: string; detail: string };
const extensions: { title: string; lines: string[]; color: string; fill: string; ink: string; edges: ExtensionEdge[] }[] = [
  { title: '购买入口 / 商业分析扩展', lines: ['AI Commerce Visibility · Profound'], color: '#bf515a', fill: '#ffe7e8', ink: '#842d35', edges: [
    { target: 'B', kind: '加强', short: '购买入口监测', title: '新增商品推荐与购买入口监测', detail: '在品牌提及之外，监测具体商品是否被推荐、购买链接指向哪个商家、展示信息是否准确，以及竞品占据哪些购买入口。' },
    { target: 'C', kind: '赋能', short: '购买路径分析', title: '新增购买路径分析与商品优化优先级', detail: '分析从 AI 推荐到购买入口的缺口；接入商品价值、库存等数据后确定优化优先级；接入访问和订单数据后，再观察可识别来源的业务表现。' },
  ] },
  { title: '优化执行自动化', lines: ['AthenaHQ · Rex · SEO.AI'], color: '#a458b1', fill: '#f7eafa', ink: '#6a2775', edges: [
    { target: 'D', kind: '加强', short: '任务编排与追踪', title: '深化任务编排、执行追踪与失败处理', detail: '将已有 Agent 执行从单次修改深化为任务编排：拆解步骤、排序、处理依赖，并记录执行状态、失败及重试结果。' },
    { target: 'D', kind: '赋能', short: '自动执行与复检', title: '将优化建议自动转为执行任务并触发复检', detail: '把监测发现的问题和分析建议转为可追踪任务，在授权范围内调用原站、CMS 或电商平台完成修改，再触发复检，形成持续运行的闭环。' },
  ] },
  { title: '监测覆盖 / 分析解释', lines: ['Peec AI · AthenaHQ', 'Profound · Rankscale'], color: '#4166bd', fill: '#e8efff', ink: '#233f85', edges: [
    { target: 'B', kind: '加强', short: '多维监测与对比', title: '细化多维度可见性监测与历史对比', detail: '按问题、模型、地区、语言和时间持续记录品牌提及、推荐位置、引用来源及竞品表现，形成可比较的历史数据。' },
    { target: 'C', kind: '赋能', short: '变化解释与建议', title: '解释变化来源，定位问题并生成优化建议', detail: '将可见性变化拆解到具体问题和引用来源，定位哪些场景变好或变差，形成待验证的原因假设和优化建议。' },
  ] },
  { title: '批量内容生产与发布', lines: ['CataSEO · WriteText.ai · SEO.AI'], color: '#c86636', fill: '#fff0e8', ink: '#823916', edges: [
    { target: 'C', kind: '加强', short: '内容缺口与查重', title: '识别全站内容缺口与重复内容', detail: '将单页内容分析扩展为全站内容缺口分析：识别缺失的商品页、类目内容、购买指南、对比内容及内链，并检查搜索意图重叠和重复内容。' },
    { target: 'D', kind: '赋能', short: '批量生成与发布', title: '批量生成、更新并发布搜索导向内容', detail: '根据商品数据、关键词和模板批量生成或更新内容，经过质量检查与发布控制后写入原站／CMS，并支持持续更新。' },
  ] },
  { title: '技术修复 / 实体理解', lines: ['Risify · Booster SEO · WordLift'], color: '#29834c', fill: '#e3f5e9', ink: '#175b33', edges: [
    { target: 'B', kind: '加强', short: '技术与实体检查', title: '深化抓取、索引与实体语义检查', detail: '深化抓取、索引、canonical、结构化数据等检查，并检查品牌、商品及其属性关系是否清楚、相互一致。' },
    { target: 'D', kind: '赋能', short: '技术问题修复', title: '将技术与结构化数据问题转为可执行修复', detail: '将诊断问题转成可执行修复：调整页面技术配置、补充或修正结构化数据、明确品牌与商品关系；执行后重新检测。' },
  ] },
  { title: '商品 / SKU 与平台适配', lines: ['Ecomtent · Sixthshop', 'AI Commerce Visibility'], color: '#d28b18', fill: '#fff0d6', ink: '#754400', edges: [
    { target: 'B', kind: '加强', short: '商品／SKU 诊断', title: '细化商品／SKU 信息诊断', detail: '将网站和品牌层面的诊断细化到商品、SKU、类目；检查标题、属性、描述、规格及变体信息是否完整、一致，是否便于搜索与 AI 理解。' },
    { target: 'C', kind: '赋能', short: '商品字段建议', title: '接入商品目录，支持按字段优化', detail: '接入电商平台商品目录及字段映射，让分析与优化建议能够定位到具体商品和字段。平台回写由另一条连线交给 Agent 执行。' },
    { target: 'D', kind: '赋能', short: '平台回写', title: '接入商品目录，支持按字段优化与平台回写', detail: '依据商品目录及字段映射，将具体商品和字段的优化建议通过平台连接执行修改。' },
  ] },
];
const frames = [{ x: 0, y: 0, w: 860, h: 1480, title: '品牌增长闭环' }, ...extensions.map((e, i) => ({ x: 920 + i % 2 * 1160, y: Math.floor(i / 2) * 510, w: 1100, h: 460, title: e.title }))];

function Node({ x, y, w = 220, h = 78, lines, accent }: { x: number; y: number; w?: number; h?: number; lines: string[]; accent?: typeof extensions[number] }) {
  return <g><rect x={x} y={y} width={w} height={h} rx="8" fill={accent?.fill ?? '#eef5fa'} stroke={accent?.color ?? '#a8bfce'} /><text x={x + w / 2} y={y + h / 2 - (lines.length - 1) * 11} textAnchor="middle" dominantBaseline="middle" fill={accent?.ink ?? '#173042'}>{lines.map((line, i) => <tspan key={line} x={x + w / 2} dy={i ? 22 : 0} fontSize={i ? 13 : 16} fontWeight={i ? 400 : 600}>{line}</tspan>)}</text></g>;
}
function Edge({ d, label, x, y, dashed = false, id, color = '#7c919b' }: { d: string; label?: string; x?: number; y?: number; dashed?: boolean; id: string; color?: string }) {
  return <g><path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray={dashed ? '6 5' : undefined} markerEnd={`url(#${id})`} />{label && <text x={x} y={y} textAnchor="middle" fontSize="12" fill={color} stroke="#fffefa" strokeWidth="6" paintOrder="stroke">{label}</text>}</g>;
}
function ExtensionLink({ edge, d, x, y, id, color }: { edge: ExtensionEdge; d: string; x: number; y: number; id: string; color: string }) {
  const tooltipId = useId();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const keepOpen = () => clearTimeout(timer.current);
  const closeSoon = () => { keepOpen(); timer.current = setTimeout(() => setPosition(null), 160); };
  function open(el: SVGGElement) {
    keepOpen();
    const rect = el.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 24);
    setPosition({ x: Math.max(12, Math.min(window.innerWidth - width - 12, rect.x + rect.width / 2 - width / 2)), y: Math.max(12, Math.min(window.innerHeight - 310, rect.bottom + 12)) });
  }
  useEffect(() => {
    const close = () => { clearTimeout(timer.current); setPosition(null); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', key);
    window.addEventListener('wheel', close, { passive: true });
    window.addEventListener('pointerdown', close);
    window.addEventListener('resize', close);
    return () => { clearTimeout(timer.current); window.removeEventListener('keydown', key); window.removeEventListener('wheel', close); window.removeEventListener('pointerdown', close); window.removeEventListener('resize', close); };
  }, []);
  return <>
    <Edge id={id} color={color} d={d} />
    <g className="flow-edge-label" tabIndex={0} role="button" aria-label={`${edge.kind}：${edge.title}`} aria-describedby={position ? tooltipId : undefined} aria-expanded={!!position}
      onMouseEnter={event => open(event.currentTarget)} onMouseLeave={closeSoon}
      onFocus={event => open(event.currentTarget)} onBlur={closeSoon}
      onPointerDown={event => event.stopPropagation()}
      onClick={event => { event.stopPropagation(); open(event.currentTarget); }}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); open(event.currentTarget); } }}>
      <rect x={x - 73} y={y - 17} width="146" height="28" rx="5" fill="#fffefa" stroke={color} strokeOpacity="0.3" />
      <text x={x} y={y} textAnchor="middle" fontSize="12" fill={color}>{edge.short} ···</text>
    </g>
    {position && createPortal(<div className="flow-edge-tooltip" id={tooltipId} role="tooltip" style={{ left: position.x, top: position.y }} onMouseEnter={keepOpen} onMouseLeave={closeSoon} onPointerDown={event => event.stopPropagation()}>
      <span>{edge.kind} · {edge.target === 'B' ? '监控与诊断' : edge.target === 'C' ? '分析与优化建议' : 'Agent 执行'}</span>
      <strong>{edge.title}</strong><p>{edge.detail}</p>
    </div>, document.body)}
  </>;
}
function Diagram({ index }: { index: number }) {
  const id = `arrow-${index}`;
  const e = extensions[index - 1];
  return <svg viewBox={index ? '0 0 1100 400' : '0 0 860 1360'} role="group" aria-label={frames[index].title}>
    <defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#7c919b" /></marker></defs>
    {index === 0 ? <>
      <rect x="125" y="300" width="610" height="230" rx="12" fill="#f4f5ef" stroke="#ccd1c4" />
      <text x="155" y="337" fill="#51604c" fontSize="17" fontWeight="600">监控与诊断</text>
      <Edge id={id} d="M430 174 V260 H280 V390" /><Edge id={id} d="M430 260 H580 V390" />
      <Edge id={id} d="M280 468 V620 H430 V710" /><Edge id={id} d="M580 468 V620 H430" />
      <Edge id={id} d="M430 808 V1010" />
      <Edge id={id} d="M250 1060 H65 V429 H170" label="重新检测，验证修复" x={162} y={900} />
      <Edge id={id} d="M610 1060 H795 V429 H690" label="持续采样，观察效果" x={684} y={950} />
      <Edge id={id} d="M430 1220 H100 V520 H125" dashed /><Edge id={id} d="M430 1220 H745 V760 H610" dashed />
      <Node x={200} y={76} w={460} h={98} lines={['品牌与追踪配置', '域名 · 品牌信息 · 竞品 · 问题 · 地区与语言']} />
      <Node x={170} y={390} lines={['网站健康 Site Health', '技术 SEO 检测']} />
      <Node x={470} y={390} lines={['AI 可见性 AI Visibility', '回答采样与引用追踪']} />
      <Node x={250} y={710} w={360} h={98} lines={['分析与优化建议', '汇总证据 · 定位问题 · 生成任务']} />
      <Node x={250} y={1010} w={360} h={98} lines={['Agent 执行', '优化原站页面 · 通过 CMS 创建内容']} />
      <Node x={250} y={1220} w={360} h={86} lines={['定时任务', '驱动检测、采样与周期分析']} />
    </> : <>
      <Edge id={id} d="M240 179 H310" /><Edge id={id} d="M530 179 H600" /><Edge id={id} d="M800 179 H870" />
      <Edge id={id} d="M970 140 V82 H420 V140" label="重新检测" x={700} y={78} />
      <Edge id={id} d="M1010 140 V48 H380 V140" label="持续采样" x={700} y={44} />
      <Edge id={id} d="M185 302 V255 H420 V218" dashed /><Edge id={id} d="M245 302 V270 H700 V218" dashed />
      {e.edges.map((edge, i) => {
        const duplicate = e.edges.filter(item => item.target === edge.target).length > 1;
        const tx = edge.target === 'B' ? 475 : edge.target === 'C' ? 740 : duplicate ? 910 + i * 120 : 990;
        const sx = 620 + i * 90;
        const mid = 242 + i * 24;
        const labelX = duplicate ? (i === 0 ? 805 : 1000) : tx;
        return <ExtensionLink key={`${edge.target}-${i}`} edge={edge} id={id} color={e.ink} d={`M${sx} 302 V${mid} H${tx} V218`} x={labelX} y={mid + 13} />;
      })}
      <Node x={40} y={140} w={200} lines={['品牌与追踪配置']} />
      <Node x={310} y={140} lines={['监控与诊断', '网站健康 / AI 可见性']} />
      <Node x={600} y={140} w={200} lines={['分析与优化建议']} />
      <Node x={870} y={140} w={190} lines={['Agent 执行', '原站 / CMS']} />
      <Node x={115} y={302} w={200} lines={['定时任务']} />
      <Node x={540} y={302} w={400} h={88} lines={[e.title, ...e.lines]} accent={e} />
    </>}
  </svg>;
}
export default function FlowchartsDemo() {
  const viewport = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 24, y: 24, scale: .3 });
  const [active, setActive] = useState(-1);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  function fit(index = -1) {
    const el = viewport.current;
    if (!el) return;
    const f = index < 0 ? { x: 0, y: 0, w: 3180, h: 1480 } : frames[index];
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
    <header className="flow-header"><a className="flow-back" href="/" aria-label="返回作品列表"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" /></svg>返回</a><h1>流程图画布</h1><span>7 张流程图</span></header>
    <nav className="flow-nav" aria-label="定位流程图"><button aria-pressed={active === -1} onClick={() => fit()}>全部</button>{frames.map((f, i) => <button key={f.title} aria-pressed={active === i} onClick={() => fit(i)}>{f.title}</button>)}</nav>
    <div ref={viewport} className={`flow-viewport${dragging ? ' is-dragging' : ''}`} tabIndex={0} role="region" aria-label="流程图画布，方向键平移，加减键缩放，0 键显示全部"
      onKeyDown={event => {
        if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
        if (event.key === '+' || event.key === '=') zoom(1.25);
        if (event.key === '-') zoom(.8);
        if (event.key === '0') fit();
        if (event.key.startsWith('Arrow')) setView(v => ({ ...v, x: v.x + (event.key === 'ArrowLeft' ? 60 : event.key === 'ArrowRight' ? -60 : 0), y: v.y + (event.key === 'ArrowUp' ? 60 : event.key === 'ArrowDown' ? -60 : 0) }));
      }}
      onPointerDown={event => { if (event.button !== 0 || drag.current) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; setDragging(true); }}
      onPointerMove={event => { const p = drag.current; if (!p || p.id !== event.pointerId) return; const dx = event.clientX - p.x, dy = event.clientY - p.y; p.x = event.clientX; p.y = event.clientY; setView(v => ({ ...v, x: v.x + dx, y: v.y + dy })); }}
      onPointerUp={event => { if (drag.current?.id === event.pointerId) { drag.current = null; setDragging(false); event.currentTarget.releasePointerCapture(event.pointerId); } }}
      onLostPointerCapture={() => { drag.current = null; setDragging(false); }} onPointerCancel={() => { drag.current = null; setDragging(false); }}>
      <div className="flow-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>{frames.map((frame, i) => <section key={frame.title} className="flow-frame" style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}><h2><span style={{ background: i ? extensions[i - 1].color : '#53684e' }} />{frame.title}</h2><Diagram index={i} /></section>)}</div>
    </div>
    <div className="flow-controls" role="group" aria-label="画布缩放"><button aria-label="缩小" onClick={() => zoom(.8)}>−</button><button className="flow-percentage" aria-label="重置为百分之百" onClick={() => zoom(1 / view.scale)}>{Math.round(view.scale * 100)}%</button><button aria-label="放大" onClick={() => zoom(1.25)}>+</button><button className="flow-fit" onClick={() => fit()}>适应画布</button></div>
  </main>;
}
