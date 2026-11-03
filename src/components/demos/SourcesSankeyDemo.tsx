import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
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

function citations(value: number) {
  return Math.round(value);
}

function responses(value: number) {
  return Math.max(1, Math.round(value / 4));
}

type Hover = {
  index: number;
  kind: 'ribbon' | 'bar';
  x: number;
  y: number;
};

export default function SourcesSankeyDemo() {
  const [hover, setHover] = useState<Hover | null>(null);
  const [labelHover, setLabelHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [pinAnchor, setPinAnchor] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [nearLabels, setNearLabels] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const active = hover?.index ?? pinned;
  const tipIndex = active;
  const expanded = hover ? hover.kind === 'ribbon' : pinned !== null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPinned(null);
        setHover(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (tipIndex === null) return;
    const tip = tipRef.current;
    if (!tip) return;
    const anchor = hover ?? pinAnchor;
    if (!anchor) return;

    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    const margin = 8;
    const x = Math.min(
      Math.max(anchor.x, width / 2 + margin),
      window.innerWidth - width / 2 - margin,
    );
    const y = Math.max(anchor.y - 12, height + margin);

    tip.style.left = `${Math.round(x)}px`;
    tip.style.top = `${Math.round(y)}px`;
    tip.style.visibility = 'visible';
  }, [tipIndex, hover, pinAnchor, expanded]);

  const ordered = [...NODES].sort(
    (a, b) => Number(a.index === active) - Number(b.index === active),
  );

  const currentNode = active === null ? null : NODES[active];

  function hoverBar(index: number, event: ReactPointerEvent<Element>) {
    setHover({ index, kind: 'bar', x: event.clientX, y: event.clientY });
  }

  function hoverRibbon(index: number, event: ReactPointerEvent<Element>) {
    setHover({ index, kind: 'ribbon', x: event.clientX, y: event.clientY });
  }

  function rowAnchor(index: number) {
    const svg = chartRef.current?.querySelector('svg');
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const point = svg.createSVGPoint();
    point.x = RIBBON_X1;
    point.y = NODES[index].center;
    const screen = point.matrixTransform(ctm);
    return { x: screen.x, y: screen.y };
  }

  function togglePin(index: number, anchor?: { x: number; y: number }) {
    if (pinned === index) {
      setPinned(null);
      return;
    }
    setPinned(index);
    const next = anchor ?? rowAnchor(index);
    if (next) setPinAnchor(next);
  }

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
        onPointerMove={(event) => {
          const svg = event.currentTarget.querySelector('svg');
          if (!svg) return;
          const ctm = svg.getScreenCTM();
          if (!ctm) return;
          const point = svg.createSVGPoint();
          point.x = event.clientX;
          point.y = event.clientY;
          const local = point.matrixTransform(ctm.inverse());
          const next = local.x <= BAR_X + 6;
          setNearLabels((current) => (current === next ? current : next));
        }}
        onPointerLeave={() => {
          setHover(null);
          setLabelHover(null);
          setNearLabels(false);
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Sankey diagram of sources driving ShopChief brand mentions"
          onClick={(event) => {
            const target = event.target as Element;
            if (!target.closest('.hit, .label, .source-bar')) {
              setPinned(null);
              setHover(null);
            }
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
              <stop offset="0%" stopColor="#5b54ef" />
              <stop offset="55%" stopColor="#7184bd" />
              <stop offset="100%" stopColor="#3e9b62" />
            </linearGradient>
          </defs>

          {NODES.map((node, nodeIndex) => {
            const isActive = active === node.index;
            return (
              <g key={`node-${node.name}`}>
                {nodeIndex < NODES.length - 1 && (
                  <rect
                    className="bar-connector"
                    x={BAR_X}
                    y={node.y + node.height}
                    width={BAR_W}
                    height={GAP_LEFT}
                    fill={isActive ? '#4038d8' : '#5b57e0'}
                    style={{
                      transformOrigin: `${BAR_X + BAR_W / 2}px ${
                        node.y + node.height
                      }px`,
                      transform: nearLabels ? 'scaleY(1)' : 'scaleY(0)',
                    }}
                  />
                )}
                <rect
                  className="source-bar"
                  x={BAR_X}
                  y={node.y}
                  width={BAR_W}
                  height={node.height}
                  rx="2"
                  fill={isActive ? '#4038d8' : '#5b57e0'}
                  onPointerEnter={(event) => hoverBar(node.index, event)}
                  onPointerMove={(event) => hoverBar(node.index, event)}
                  onPointerLeave={() => setHover(null)}
                  style={{ transition: 'fill 0.2s ease' }}
                />
                <text
                  className={
                    labelHover === node.index || isActive
                      ? 'label is-active'
                      : 'label'
                  }
                  x={LABEL_X}
                  y={node.center + 5}
                  textAnchor="end"
                  fill="#6b68e0"
                  onPointerEnter={() => setLabelHover(node.index)}
                  onPointerLeave={() => setLabelHover(null)}
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
                    aria-label={`${node.name}, ${responses(
                      node.value,
                    )} responses`}
                    aria-pressed={pinned === node.index}
                    onPointerEnter={(event) => hoverRibbon(node.index, event)}
                    onPointerMove={(event) => hoverRibbon(node.index, event)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => {
                      const anchor = rowAnchor(node.index);
                      if (anchor) {
                        setHover({
                          index: node.index,
                          kind: 'ribbon',
                          x: anchor.x,
                          y: anchor.y,
                        });
                      }
                    }}
                    onBlur={() => setHover(null)}
                    onClick={(event) =>
                      togglePin(node.index, {
                        x: event.clientX,
                        y: event.clientY,
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        togglePin(node.index);
                      }
                    }}
                  />
                  <path
                    className={isDim ? 'ribbon is-dim' : 'ribbon'}
                    d={node.path}
                    stroke={isActive ? 'url(#flow-active)' : 'url(#flow)'}
                    strokeWidth={width}
                    style={{
                      opacity: isDim ? 0.12 : isActive ? 1 : 0.72,
                    }}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {currentNode && (
          <div
            className={expanded ? 'flow-tip is-expanded' : 'flow-tip'}
            ref={tipRef}
          >
            <h3>{currentNode.name}</h3>
            <div className="tip-metrics">
              <span>
                {expanded
                  ? `${responses(currentNode.value)} responses`
                  : `${citations(currentNode.value)} citations`}
              </span>
              <span className="pct">{share(currentNode.value)}%</span>
            </div>

            {expanded && (
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
            )}

            {expanded && (
              <p className="tip-foot">
                {pinned === currentNode.index
                  ? 'Click again to unpin · Esc to clear'
                  : 'Click to keep this source highlighted'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
