import { useState } from 'react';
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
const UNIT =
  (H - PAD_Y * 2 - GAP_LEFT * (SOURCES.length - 1)) / TOTAL;

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

  return { index, name: source.name, value: source.value, height, y, center, rightCenter, path };
});

const TARGET_TOP = (H - rightHeight) / 2;

export default function SourcesSankeyDemo() {
  const [active, setActive] = useState<number | null>(null);

  const ordered = [...NODES].sort(
    (a, b) => Number(a.index === active) - Number(b.index === active),
  );

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

      <div className="chart-body" onPointerLeave={() => setActive(null)}>
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
              x1={RIBBON_X1}
              y1="0"
              x2={RIBBON_X2}
              y2="0"
            >
              <stop offset="0%" stopColor="#8d8bf0" />
              <stop offset="52%" stopColor="#a2b2d3" />
              <stop offset="100%" stopColor="#86c39c" />
            </linearGradient>
          </defs>

          {NODES.map((node) => (
            <g key={`node-${node.name}`}>
              <rect
                x={BAR_X}
                y={node.y}
                width={BAR_W}
                height={node.height}
                rx="2"
                fill="#5b57e0"
              />
              <text
                className={
                  active === node.index ? 'label is-active' : 'label'
                }
                x={LABEL_X}
                y={node.center + 5}
                textAnchor="end"
                fill="#6b68e0"
                onPointerEnter={() => setActive(node.index)}
                onPointerLeave={() => setActive(null)}
              >
                {node.name}
              </text>
            </g>
          ))}

          <rect
            x={BAR_RIGHT_X}
            y={TARGET_TOP}
            width={BAR_RIGHT_W}
            height={rightHeight}
            rx="3"
            fill="#3d9b4f"
          />
          <text
            className="target-label"
            x={TARGET_LABEL_X}
            y={H / 2 + 5}
          >
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
                    aria-label={`${node.name}, ${node.value} mentions`}
                    onPointerEnter={() => setActive(node.index)}
                    onFocus={() => setActive(node.index)}
                    onBlur={() => setActive(null)}
                  />
                  <path
                    className={isDim ? 'ribbon is-dim' : 'ribbon'}
                    d={node.path}
                    stroke="url(#flow)"
                    strokeWidth={width}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
