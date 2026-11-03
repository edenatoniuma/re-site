import { useEffect, useRef, useState } from 'react';
import '../../styles/demos/sources-sankey.css';

const W = 1200;
const H = 580;
const PAD_Y = 26;
const GAP_LEFT = 9;
const GAP_RIGHT = 3;
const LABEL_X = 320;
const BAR_X = 344;
const BAR_W = 8;
const RIBBON_X1 = 354;
const RIBBON_X2 = 1120;
const BAR_RIGHT_X = 1120;
const BAR_RIGHT_W = 10;
const TARGET_LABEL_X = 1146;
const TIP_X = 336;

const SOURCES = [
  { name: 'shopchief.ai', value: 30 },
  { name: 'fazier.com', value: 18 },
  { name: 'thereisanaiforyou.com', value: 14 },
  { name: 'topai.tools', value: 12 },
  { name: 'uraitools.com', value: 10 },
  { name: 'herramientas.ai', value: 9 },
  { name: 'agentlyfy.ai', value: 5 },
  { name: 'aiagentsdirectory.com', value: 5 },
  { name: 'aisotools.com', value: 4 },
  { name: 'github.com', value: 4 },
  { name: 'kuponaut.com', value: 4 },
  { name: 'peerlist.io', value: 3 },
  { name: 'theresanaiforthat.com', value: 3 },
  { name: 'topbusinesssoftware.com', value: 3 },
  { name: 'agentry.com', value: 2.5 },
  { name: 'aiwizard.ai', value: 2.5 },
  { name: 'instagram.com', value: 2 },
  { name: 'toolify.ai', value: 1.8 },
];

const TOTAL = SOURCES.reduce((sum, item) => sum + item.value, 0);
const UNIT = (H - PAD_Y * 2 - GAP_LEFT * (SOURCES.length - 1)) / TOTAL;

type Node = {
  index: number;
  name: string;
  value: number;
  height: number;
  y: number;
  center: number;
  rightCenter: number;
  path: string;
};

let cursor = PAD_Y;
const rightHeight = TOTAL * UNIT + GAP_RIGHT * (SOURCES.length - 1);
let rightCursor = (H - rightHeight) / 2;

const NODES: Node[] = SOURCES.map((source, index) => {
  const height = source.value * UNIT;
  const y = cursor;
  const center = y + height / 2;
  cursor += height + GAP_LEFT;

  const rightCenter = rightCursor + height / 2;
  rightCursor += height + GAP_RIGHT;

  const control = (RIBBON_X2 - RIBBON_X1) * 0.45;
  const path = `M${RIBBON_X1},${center.toFixed(1)} C${(
    RIBBON_X1 + control
  ).toFixed(1)},${center.toFixed(1)} ${(RIBBON_X2 - control).toFixed(1)},${rightCenter.toFixed(
    1,
  )} ${RIBBON_X2},${rightCenter.toFixed(1)}`;

  return {
    index,
    name: source.name,
    value: source.value,
    height,
    y,
    center,
    rightCenter,
    path,
  };
});

const TARGET_TOP = (H - rightHeight) / 2;

function share(value: number) {
  return ((value / TOTAL) * 100).toFixed(1);
}

export default function SourcesSankeyDemo() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  const active = hovered ?? pinned;

  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPinned(null);
        setHovered(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (active === null) return;
    const svg = svgRef.current;
    const tip = tipRef.current;
    const wrap = chartRef.current;
    if (!svg || !tip || !wrap) return;

    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const point = svg.createSVGPoint();
    point.x = TIP_X;
    point.y = NODES[active].center;
    const screen = point.matrixTransform(ctm);
    const wrapRect = wrap.getBoundingClientRect();

    const tipWidth = tip.offsetWidth;
    const tipHeight = tip.offsetHeight;
    const x = Math.min(
      Math.max(8, screen.x - wrapRect.left),
      wrapRect.width - tipWidth - 8,
    );
    const y = Math.min(
      Math.max(8, screen.y - wrapRect.top - tipHeight / 2),
      wrapRect.height - tipHeight - 8,
    );

    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  }, [active, pinned]);

  const ordered = [...NODES].sort(
    (a, b) => Number(a.index === active) - Number(b.index === active),
  );

  const currentNode = active === null ? null : NODES[active];

  return (
    <div className="sankey-card">
      <header className="sankey-head">
        <div>
          <h1>
            Sources Visualization <span className="info-dot">i</span>
          </h1>
          <p className="sankey-sub">
            Sources driving brand mentions in AI responses
          </p>
        </div>
        <button className="grid-btn" type="button" aria-label="Layout options">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            {[3, 8, 13].map((x) =>
              [3, 8, 13].map((y) => (
                <rect
                  key={`${x}-${y}`}
                  x={x - 1.2}
                  y={y - 1.2}
                  width="2.4"
                  height="2.4"
                  rx="0.6"
                />
              )),
            )}
          </svg>
        </button>
      </header>

      <div
        className="chart-body"
        ref={chartRef}
        onPointerLeave={() => setHovered(null)}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Sankey diagram of sources driving ShopChief brand mentions"
          onClick={(event) => {
            const target = event.target as Element;
            if (!target.closest('.hit, .label')) setPinned(null);
          }}
        >
          <defs>
            <linearGradient
              id="flow"
              gradientUnits="userSpaceOnUse"
              x1={RIBBON_X1}
              y1="0"
              x2={RIBBON_X2}
              y2="0"
            >
              <stop offset="0%" stopColor="#8d8bf0" />
              <stop offset="52%" stopColor="#a2b2d3" />
              <stop offset="100%" stopColor="#86c39c" />
            </linearGradient>
            <linearGradient
              id="flow-active"
              gradientUnits="userSpaceOnUse"
              x1={RIBBON_X1}
              y1="0"
              x2={RIBBON_X2}
              y2="0"
            >
              <stop offset="0%" stopColor="#4f49e8" />
              <stop offset="55%" stopColor="#5f76b8" />
              <stop offset="100%" stopColor="#2f8f58" />
            </linearGradient>
          </defs>

          {NODES.map((node) => {
            const isActive = active === node.index;
            return (
              <g key={`node-${node.name}`}>
                <rect
                  x={BAR_X}
                  y={node.y}
                  width={BAR_W}
                  height={node.height}
                  rx="2"
                  fill={isActive ? '#4038d8' : '#5b57e0'}
                  style={{ transition: 'fill 0.2s ease' }}
                />
                <text
                  className={
                    isActive ? 'label is-active' : 'label'
                  }
                  x={LABEL_X}
                  y={node.center + 5}
                  textAnchor="end"
                  fill="#6b68e0"
                  onPointerEnter={() => setHovered(node.index)}
                  onPointerLeave={() => setHovered(null)}
                  onClick={() =>
                    setPinned((current) =>
                      current === node.index ? null : node.index,
                    )
                  }
                >
                  {node.name}
                </text>
              </g>
            );
          })}

          <rect
            x={BAR_RIGHT_X}
            y={TARGET_TOP}
            width={BAR_RIGHT_W}
            height={rightHeight}
            rx="3"
            fill="#3d9b4f"
          />
          <text className="target-label" x={TARGET_LABEL_X} y={H / 2 + 5}>
            ShopChief
          </text>

          <g>
            {ordered.map((node) => {
              const isActive = active === node.index;
              const isDim = active !== null && !isActive;
              const width = isActive ? node.height * 1.7 + 4 : node.height;

              return (
                <g key={`flow-${node.name}`}>
                  <path
                    className="hit"
                    d={node.path}
                    strokeWidth={Math.max(node.height + 16, 26)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${node.name}, ${Math.round(node.value)} citations`}
                    aria-pressed={pinned === node.index}
                    onPointerEnter={() => setHovered(node.index)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered(node.index)}
                    onBlur={() => setHovered(null)}
                    onClick={() =>
                      setPinned((current) =>
                        current === node.index ? null : node.index,
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setPinned((current) =>
                          current === node.index ? null : node.index,
                        );
                      }
                    }}
                  />
                  <path
                    className={isDim ? 'ribbon is-dim' : 'ribbon'}
                    d={node.path}
                    stroke={isActive ? 'url(#flow-active)' : 'url(#flow)'}
                    strokeWidth={width}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {currentNode && (
          <div className="flow-tip" ref={tipRef}>
            <h3>{currentNode.name}</h3>
            <div className="tip-metrics">
              <span>{Math.round(currentNode.value)} citations</span>
              <span className="pct">{share(currentNode.value)}%</span>
            </div>

            {pinned === currentNode.index && (
              <>
                <ul className="tip-list">
                  <li>
                    <span className="num">1</span>
                    <span>
                      LLM cited <b>{currentNode.name}</b> as a source
                    </span>
                  </li>
                  <li>
                    <span className="num">2</span>
                    <span>
                      <b>{currentNode.name}</b> & the LLM mention{' '}
                      <b className="shop">ShopChief</b>
                    </span>
                  </li>
                </ul>
                <p className="tip-foot">
                  Click again to unpin · Esc to clear
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
