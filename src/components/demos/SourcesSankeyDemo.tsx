import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import '../../styles/demos/sources-sankey.css';

const W = 854;
const H = 562;
const STACK = 482;
const GROUP_X = 220;
const GROUP_Y = 40;
const GAP_LEFT = 10;
const GAP_RIGHT = 6;
const INSET = 3;
const BAR_W = 8;
const RIBBON_X1 = 10;
const RIBBON_X2 = 404;
const BAR_RIGHT_X = 404;
const BAR_RIGHT_W = 8;
const TARGET_LABEL_X = 420;
const LABEL_X = -16;
const NAV_THRESHOLD = GROUP_X + BAR_W + 12;

const SOURCES = [
  { name: 'shopchief.ai', value: 7 },
  { name: 'fazier.com', value: 3 },
  { name: 'thereisanaiforyou.com', value: 3 },
  { name: 'topai.tools', value: 2 },
  { name: 'uraitools.com', value: 2 },
  { name: 'herramientas.ai', value: 2 },
  { name: 'agentlyfy.ai', value: 1 },
  { name: 'aiagentsdirectory.com', value: 1 },
  { name: 'aisotools.com', value: 1 },
  { name: 'github.com', value: 1 },
  { name: 'kuponaut.com', value: 1 },
  { name: 'peerlist.io', value: 1 },
  { name: 'theresanaiforthat.com', value: 1 },
  { name: 'topbusinesssoftware.com', value: 1 },
  { name: 'agentry.com', value: 1 },
  { name: 'aiwizard.ai', value: 1 },
  { name: 'instagram.com', value: 1 },
  { name: 'toolify.ai', value: 1 },
];

const TOTAL = SOURCES.reduce((sum, item) => sum + item.value, 0);
const UNIT = (STACK - GAP_LEFT * (SOURCES.length - 1)) / TOTAL;

type Node = {
  index: number;
  name: string;
  value: number;
  restY: number;
  restH: number;
  connY: number;
  connH: number;
  rightTop: number;
  rightBottom: number;
  center: number;
};

const rightStack =
  TOTAL * UNIT -
  2 * INSET * SOURCES.length +
  GAP_RIGHT * (SOURCES.length - 1);
const rightTopBase = (STACK - rightStack) / 2;

let leftCursor = 0;
let connCursor = 0;
let rightCursor = rightTopBase;

const NODES: Node[] = SOURCES.map((source, index) => {
  const restH = source.value * UNIT;
  const restY = leftCursor;
  leftCursor += restH + GAP_LEFT;

  const connH = (source.value / TOTAL) * STACK;
  const connY = connCursor;
  connCursor += connH;

  const thickness = restH - INSET * 2;
  const rightTop = rightCursor;
  rightCursor += thickness + GAP_RIGHT;

  return {
    index,
    name: source.name,
    value: source.value,
    restY,
    restH,
    connY,
    connH,
    rightTop,
    rightBottom: rightTop + thickness,
    center: restY + restH / 2,
  };
});

function percent(value: number) {
  return ((value / TOTAL) * 100).toFixed(1);
}

function ribbonPath(
  leftTop: number,
  leftBottom: number,
  rightTop: number,
  rightBottom: number,
) {
  const control = (RIBBON_X1 + RIBBON_X2) / 2;
  return `M ${RIBBON_X1} ${leftTop.toFixed(
    2,
  )} C ${control} ${leftTop.toFixed(2)} ${control} ${rightTop.toFixed(
    2,
  )} ${RIBBON_X2} ${rightTop.toFixed(
    2,
  )} L ${RIBBON_X2} ${rightBottom.toFixed(
    2,
  )} C ${control} ${rightBottom.toFixed(2)} ${control} ${leftBottom.toFixed(
    2,
  )} ${RIBBON_X1} ${leftBottom.toFixed(2)} Z`;
}

function centerPath(leftCenter: number, rightCenter: number) {
  const control = (RIBBON_X1 + RIBBON_X2) / 2;
  return `M ${RIBBON_X1} ${leftCenter.toFixed(
    2,
  )} C ${control} ${leftCenter.toFixed(2)} ${control} ${rightCenter.toFixed(
    2,
  )} ${RIBBON_X2} ${rightCenter.toFixed(2)}`;
}

type Hover = {
  index: number;
  kind: 'ribbon' | 'bar';
  x: number;
  y: number;
};

export default function SourcesSankeyDemo() {
  const [hover, setHover] = useState<Hover | null>(null);
  const [connectT, setConnectT] = useState(0);
  const [nearLabels, setNearLabels] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const connectRef = useRef(0);

  const active = hover?.index ?? null;

  useEffect(() => {
    const target = nearLabels ? 1 : 0;
    if (connectRef.current === target) return;

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      connectRef.current = target;
      setConnectT(target);
      return;
    }

    const from = connectRef.current;
    const start = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / 420);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = from + (target - from) * eased;
      connectRef.current = value;
      setConnectT(value);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [nearLabels]);

  useEffect(() => {
    if (!hover) return;
    const tip = tipRef.current;
    if (!tip) return;

    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    const margin = 8;
    const x = Math.min(
      Math.max(hover.x, width / 2 + margin),
      window.innerWidth - width / 2 - margin,
    );
    const y = Math.max(hover.y - 14, height + margin);

    tip.style.left = `${Math.round(x)}px`;
    tip.style.top = `${Math.round(y)}px`;
    tip.style.visibility = 'visible';
  }, [hover]);

  function hoverBar(index: number, event: ReactPointerEvent<Element>) {
    setHover({ index, kind: 'bar', x: event.clientX, y: event.clientY });
  }

  function hoverRibbon(index: number, event: ReactPointerEvent<Element>) {
    setHover({ index, kind: 'ribbon', x: event.clientX, y: event.clientY });
  }

  function openSource(name: string) {
    window.open(`https://${name}`, '_blank', 'noopener,noreferrer');
  }

  const currentNode = active === null ? null : NODES[active];
  const expanded = hover?.kind === 'ribbon';

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
          const next = local.x <= NAV_THRESHOLD;
          setNearLabels((current) => (current === next ? current : next));
        }}
        onPointerLeave={() => {
          setHover(null);
          setNearLabels(false);
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Sankey diagram of sources driving ShopChief brand mentions"
        >
          <defs>
            <linearGradient
              id="flow"
              gradientUnits="userSpaceOnUse"
              x1={GROUP_X + RIBBON_X1}
              y1="0"
              x2={GROUP_X + RIBBON_X2}
              y2="0"
            >
              <stop offset="0%" stopColor="#4f39f6" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>

          <g transform={`translate(${GROUP_X},${GROUP_Y})`}>
            {NODES.map((node) => {
              const t = connectT;
              const height = node.restH + (node.connH - node.restH) * t;
              const y = node.restY + (node.connY - node.restY) * t;
              const inset = INSET;
              const leftTop = y + inset;
              const leftBottom = y + height - inset;
              const leftCenter = (leftTop + leftBottom) / 2;
              const rightCenter = (node.rightTop + node.rightBottom) / 2;

              const isActive = active === node.index;
              const isDim = active !== null && !isActive;

              return (
                <g key={node.name}>
                  <rect
                    className="source-bar"
                    x="0"
                    y={y}
                    width={BAR_W}
                    height={height}
                    fill="#4f39f6"
                    onPointerEnter={(event) => hoverBar(node.index, event)}
                    onPointerMove={(event) => hoverBar(node.index, event)}
                    onPointerLeave={() => setHover(null)}
                    onClick={() => openSource(node.name)}
                  />
                  <text
                    className="label"
                    x={LABEL_X}
                    y={leftCenter + 4}
                    textAnchor="end"
                    fill="#4f39f6"
                    onClick={() => openSource(node.name)}
                  >
                    {node.name}
                  </text>
                  <path
                    className="hit"
                    d={centerPath(leftCenter, rightCenter)}
                    strokeWidth={Math.max(height + 16, 26)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${node.name}, ${node.value} responses`}
                    onPointerEnter={(event) =>
                      hoverRibbon(node.index, event)
                    }
                    onPointerMove={(event) => hoverRibbon(node.index, event)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => {
                      const svg = chartRef.current?.querySelector('svg');
                      const ctm = svg?.getScreenCTM();
                      if (!svg || !ctm) return;
                      const point = svg.createSVGPoint();
                      point.x = GROUP_X + RIBBON_X1;
                      point.y = GROUP_Y + leftCenter;
                      const screen = point.matrixTransform(ctm);
                      setHover({
                        index: node.index,
                        kind: 'ribbon',
                        x: screen.x,
                        y: screen.y,
                      });
                    }}
                    onBlur={() => setHover(null)}
                    onClick={() => openSource(node.name)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openSource(node.name);
                      }
                    }}
                  />
                  <path
                    className={isDim ? 'ribbon is-dim' : 'ribbon'}
                    d={ribbonPath(
                      leftTop,
                      leftBottom,
                      node.rightTop,
                      node.rightBottom,
                    )}
                    fill="url(#flow)"
                    style={{
                      opacity: isDim ? 0.1 : isActive ? 0.9 : 0.5,
                    }}
                  />
                </g>
              );
            })}

            <rect
              x={BAR_RIGHT_X}
              y={rightTopBase}
              width={BAR_RIGHT_W}
              height={rightStack}
              fill="#16a34a"
            />
            <text
              className="target-label"
              x={TARGET_LABEL_X}
              y={STACK / 2}
              dominantBaseline="middle"
              fill="#16a34a"
            >
              ShopChief
            </text>
          </g>
        </svg>

        {currentNode && (
          <div
            className={expanded ? 'flow-tip is-expanded' : 'flow-tip'}
            ref={tipRef}
          >
            {expanded ? (
              <>
                <div className="tip-header">
                  <span className="tip-title">
                    {currentNode.value}{' '}
                    {currentNode.value === 1 ? 'response' : 'responses'}
                  </span>
                  <span className="tip-pct">{percent(currentNode.value)}%</span>
                </div>
                <div className="tip-list">
                  <div>
                    <span className="num">1</span>
                    <span>
                      LLM cited <b>{currentNode.name}</b> as a source
                    </span>
                  </div>
                  <div>
                    <span className="num">2</span>
                    <span>
                      <b>{currentNode.name}</b> & the LLM mention{' '}
                      <b className="shop">ShopChief</b>
                    </span>
                  </div>
                </div>
                <p className="tip-foot">Click to view these source pages</p>
              </>
            ) : (
              <>
                <p className="tip-name">{currentNode.name}</p>
                <div className="tip-metrics">
                  <span>
                    {currentNode.value}{' '}
                    {currentNode.value === 1 ? 'citation' : 'citations'}
                  </span>
                  <span className="tip-pct">{percent(currentNode.value)}%</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
