import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import '../../styles/demos/pi-agent.css';
import PiToolLens from './PiToolLens';
import type { ToolTrace } from './PiToolLens';

type Stage = { title: string; body: string };

const STAGES: Stage[] = [
  {
    title: '一条循环',
    body: '输入、模型、工具、判断。没有结束，就沿左边回到模型前。',
  },
  {
    title: '进入运行',
    body: '先过项目信任、会话恢复、资源发现和 input；before_agent_start 还能改提示和工具。',
  },
  {
    title: '组装上下文',
    body: 'transformContext、convertToLlm，再经过 context 与 context_with_system。旧消息被裁剪、改写。',
  },
  {
    title: '提供方请求',
    body: 'before_provider_headers → before_provider_request，请求才真正离开 harness。',
  },
  {
    title: '模型调用',
    body: '整条线上，真正交给模型的只有这一段。',
  },
  {
    title: '流回来',
    body: 'after_provider_response → message_start / update / end。响应先回到 harness。',
  },
  {
    title: '工具',
    body: 'tool_execution_start → tool_call → update → tool_result → tool_execution_end。默认并行。',
  },
  {
    title: '子代理',
    body: '工具里可以再开一条同样的循环。Pi 默认没有子代理，扩展可以给。',
  },
  {
    title: '回合结束',
    body: 'turn_end 可追加 entries，也可要求继续。没有工具和队列，就结束这次 run。',
  },
  {
    title: '排队输入',
    body: 'steering 在下一轮前插进来；follow-up 等这次 run 想停时再开一轮。',
  },
  {
    title: 'run 的下一圈',
    body: 'agent_end 之后还有 auto-retry、overflow compaction 和 queued follow-up。它们会再开一次 run。',
  },
  {
    title: '压缩',
    body: '阈值或 overflow 触发 session_before_compact。摘要自己也是一次模型调用，然后重建上下文。',
  },
  {
    title: 'settle / 会话',
    body: 'agent_before_settle 还能追加一次延续；agent_settled 才是真的停。entries 都写进 session。',
  },
  {
    title: '一条线',
    body: '内层是 turn，外层是 run，旁边是 session。压缩、记忆、子代理和排队输入都长在同一根线上。',
  },
];

const STAGE_COUNT = STAGES.length;

const VIEW_W = 1280;
const VIEW_H = 800;
const FULL_VIEW_BOX = '30 70 1220 730';
const MOBILE_OVERVIEW_BOX = '40 110 1200 690';
const CX = 620;
const CY = 380;
const RX = 400;
const RY = 210;

function pointAt(degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: CX + RX * Math.cos(radians),
    y: CY + RY * Math.sin(radians),
  };
}

const P = {
  tool: pointAt(0),
  toolCall: pointAt(-15),
  toolResult: pointAt(15),
  turnEnd: pointAt(45),
  decide: pointAt(90),
  memory: pointAt(120),
  turnStart: pointAt(150),
  input: pointAt(180),
  agentStart: pointAt(200),
  context: pointAt(225),
  provider: pointAt(250),
  model: pointAt(270),
  stream: pointAt(300),
};

const AGENT_END_GATE = { x: 760, y: 645 };
const MORE_WORK = { x: 900, y: 700 };
const SETTLE_GATE = { x: 1000, y: 728 };
const SETTLED = { x: 1074, y: 740 };
const COMPACT_CENTER = { x: 360.44, y: 275.75 };
const COMPACT_OPPOSITE = { x: 383.73, y: 319.99 };
const MEMORY_NODE = { x: 445, y: 495 };
const SUBAGENT_CENTER = { x: 830, y: 455 };
const STEER_QUEUE = { x: 100, y: 520 };
const FOLLOW_QUEUE = { x: 775, y: 760 };

function ellipsePath(cx: number, cy: number, rx: number, ry: number) {
  const k = 0.5522847498;
  const x1 = cx + rx;
  const y1 = cy + ry;
  const x2 = cx - rx;
  const y2 = cy - ry;
  const kx = rx * k;
  const ky = ry * k;
  return [
    `M ${x1} ${cy}`,
    `C ${x1} ${cy + ky} ${cx + kx} ${y1} ${cx} ${y1}`,
    `C ${cx - kx} ${y1} ${x2} ${cy + ky} ${x2} ${cy}`,
    `C ${x2} ${cy - ky} ${cx - kx} ${y2} ${cx} ${y2}`,
    `C ${cx + kx} ${y2} ${x1} ${cy - ky} ${x1} ${cy}`,
    'Z',
  ].join(' ');
}

const LOOP_D = ellipsePath(CX, CY, RX, RY);
const MINI_D = ellipsePath(SUBAGENT_CENTER.x, SUBAGENT_CENTER.y, 58, 34);
const COMPACT_D = [
  `M ${P.context.x} ${P.context.y}`,
  `A 50 50 0 0 1 ${COMPACT_OPPOSITE.x} ${COMPACT_OPPOSITE.y}`,
  `A 50 50 0 0 1 ${P.context.x} ${P.context.y}`,
].join(' ');
const MEMORY_SPUR_D = 'M 420 562 C 424 540 430 518 437 503';
const STEER_D = 'M 105 520 C 150 512 210 500 268 488';
const FOLLOW_UP_D = 'M 780 760 C 810 742 850 720 890 703';
const SUBAGENT_STEM_D = 'M 1020 380 C 985 392 938 420 890 452';
const INPUT_D = 'M 60 380 H 216';
const EXIT_D = 'M 620 590 C 690 612 780 652 900 700';
const SETTLE_D = 'M 900 700 C 960 714 1015 726 1074 740';
const RETURN_LINE_D = 'M 1074 740 H 1132';
const OUTER_D = [
  'M 900 700',
  'C 1040 690 1140 600 1160 500',
  'C 1180 400 1170 260 1080 170',
  'C 1000 90 820 84 650 86',
  'C 470 88 280 120 205 185',
  'C 165 220 135 260 132 300',
  'C 130 316 170 308 240 308',
].join(' ');

type Anchors = {
  tool: number;
  toolCall: number;
  toolResult: number;
  turnEnd: number;
  decide: number;
  memory: number;
  turnStart: number;
  input: number;
  agentStart: number;
  context: number;
  provider: number;
  model: number;
  stream: number;
};

const DEFAULT_ANCHORS: Anchors = {
  tool: 0,
  toolCall: 0.96,
  toolResult: 0.04,
  turnEnd: 0.12,
  decide: 0.25,
  memory: 0.33,
  turnStart: 0.42,
  input: 0.5,
  agentStart: 0.55,
  context: 0.625,
  provider: 0.69,
  model: 0.75,
  stream: 0.84,
};

const SEGMENTS = [
  { stage: 1, from: 'input', to: 'agentStart' },
  { stage: 2, from: 'agentStart', to: 'context' },
  { stage: 3, from: 'context', to: 'provider' },
  { stage: 4, from: 'provider', to: 'model' },
  { stage: 5, from: 'model', to: 'stream' },
  { stage: 6, from: 'stream', to: 'tool' },
  { stage: 8, from: 'tool', to: 'decide' },
  { stage: 9, from: 'decide', to: 'turnStart' },
  { stage: 11, from: 'turnStart', to: 'context' },
] as const;

type Focus = { x: number; y: number; w?: number; h?: number };

const FOCUS: Record<number, Focus> = {
  1: { x: 350, y: 231 },
  2: { x: 360, y: 231 },
  3: P.provider,
  4: P.model,
  5: P.stream,
  6: P.tool,
  7: SUBAGENT_CENTER,
  8: { x: 760, y: 530 },
  9: { x: 350, y: 500 },
  10: MORE_WORK,
  11: COMPACT_CENTER,
  12: { x: 760, y: 620, w: 780, h: 520 },
};

function stageAnchors(anchors: Anchors) {
  return [
    anchors.input,
    anchors.input + 1,
    anchors.agentStart + 1,
    anchors.context + 1,
    anchors.provider + 1,
    anchors.model + 1,
    anchors.stream + 1,
    anchors.tool + 2,
    anchors.tool + 2,
    anchors.decide + 2,
    anchors.turnStart + 2,
    anchors.input + 2,
    anchors.input + 2,
    anchors.input + 2,
    anchors.input + 3,
  ];
}

function offPathPoint(stage: number) {
  if (stage === 10) return AGENT_END_GATE;
  if (stage === 11) return P.context;
  if (stage === 12) return SETTLE_GATE;
  return null;
}

function easeInOut(value: number) {
  return value * value * (3 - 2 * value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type LabelProps = {
  x: number;
  y: number;
  anchor?: 'start' | 'middle' | 'end';
  strong?: boolean;
  small?: boolean;
  on?: boolean;
  live?: boolean;
  children: ReactNode;
};

function Label({
  x,
  y,
  anchor = 'middle',
  strong = false,
  small = false,
  on = false,
  live = false,
  children,
}: LabelProps) {
  return (
    <text
      className={[
        'pi-label',
        strong ? 'pi-label--strong' : '',
        small ? 'pi-label--small' : '',
        on ? 'is-on' : '',
        live ? 'is-live' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
    >
      {children}
    </text>
  );
}

function Gate({
  x,
  y,
  angle,
  on,
  live,
}: {
  x: number;
  y: number;
  angle: number;
  on: boolean;
  live: boolean;
}) {
  return (
    <g
      className={['pi-gate', on ? 'is-on' : '', live ? 'is-live' : '']
        .filter(Boolean)
        .join(' ')}
      transform={`translate(${x} ${y}) rotate(${angle})`}
    >
      <line x1={-5} y1={-11} x2={-5} y2={11} />
      <line x1={5} y1={-11} x2={5} y2={11} />
    </g>
  );
}

function Station({
  x,
  y,
  live,
  ring = false,
  ringOn = false,
}: {
  x: number;
  y: number;
  live: boolean;
  ring?: boolean;
  ringOn?: boolean;
}) {
  return (
    <g
      className={['pi-station', live ? 'is-live' : ''].filter(Boolean).join(' ')}
      transform={`translate(${x} ${y})`}
    >
      {live ? <circle className="pi-pulse" r={9} /> : null}
      {ring ? (
        <circle
          className={['pi-station-ring', ringOn ? 'is-on' : '']
            .filter(Boolean)
            .join(' ')}
          r={12}
        />
      ) : null}
      <circle className="pi-station-dot" r={4.8} />
    </g>
  );
}

export default function PiAgentDemo() {
  const [stage, setStage] = useState(0);
  const [embedded, setEmbedded] = useState(false);
  const [compact, setCompact] = useState(false);
  const [anchors, setAnchors] = useState<Anchors>(DEFAULT_ANCHORS);

  const traceRef = useRef<ToolTrace>({ x: 220, y: 380, progress: 0 });
  const pRef = useRef(0);
  const stageRef = useRef(0);
  const embeddedRef = useRef(false);
  const reducedRef = useRef(false);
  const anchorsRef = useRef<Anchors>(DEFAULT_ANCHORS);

  const loopRef = useRef<SVGPathElement>(null);
  const miniRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sparkRef = useRef<SVGGElement>(null);
  const miniSparkRef = useRef<SVGGElement>(null);
  const trailRefs = useRef<Array<SVGCircleElement | null>>([]);

  useEffect(() => {
    const isEmbedded = window.self !== window.top;
    setEmbedded(isEmbedded);
    embeddedRef.current = isEmbedded;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = motion.matches;
    const onChange = () => {
      reducedRef.current = motion.matches;
    };
    motion.addEventListener('change', onChange);
    return () => motion.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (embedded) {
      stageRef.current = STAGE_COUNT - 1;
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      pRef.current = p;
      const next = clamp(Math.floor(p * STAGE_COUNT), 0, STAGE_COUNT - 1);
      stageRef.current = next;
      setStage((current) => (current === next ? current : next));
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [embedded]);

  useEffect(() => {
    const path = loopRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    if (!total) return;

    const steps = 1200;
    const samples: Array<{ len: number; x: number; y: number }> = [];
    for (let index = 0; index <= steps; index += 1) {
      const len = (index / steps) * total;
      const point = path.getPointAtLength(len);
      samples.push({ len, x: point.x, y: point.y });
    }

    const find = (target: { x: number; y: number }) => {
      let best = samples[0];
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const sample of samples) {
        const dx = sample.x - target.x;
        const dy = sample.y - target.y;
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) {
          best = sample;
          bestDistance = distance;
        }
      }
      return best.len / total;
    };

    const next: Anchors = {
      tool: find(P.tool),
      toolCall: find(P.toolCall),
      toolResult: find(P.toolResult),
      turnEnd: find(P.turnEnd),
      decide: find(P.decide),
      memory: find(P.memory),
      turnStart: find(P.turnStart),
      input: find(P.input),
      agentStart: find(P.agentStart),
      context: find(P.context),
      provider: find(P.provider),
      model: find(P.model),
      stream: find(P.stream),
    };
    anchorsRef.current = next;
    setAnchors(next);
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let idlePhase = 0;
    let ride = 0;
    let miniPhase = 0;
    let seeded = false;

    const trailOpacity = (index: number) => 0.3 - index * 0.05;

    const placeSpark = (fraction: number) => {
      const path = loopRef.current;
      if (!path) return;
      const total = path.getTotalLength();
      const wrapped = ((fraction % 1) + 1) % 1;
      const point = path.getPointAtLength(wrapped * total);
      traceRef.current.x = point.x;
      traceRef.current.y = point.y;
      traceRef.current.progress = wrapped > .5 ? clamp((wrapped - .94) / .12, 0, 1) : clamp((wrapped + .06) / .12, 0, 1);
      sparkRef.current?.setAttribute(
        'transform',
        `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`,
      );

      trailRefs.current.forEach((element, index) => {
        if (!element) return;
        element.setAttribute('opacity', String(trailOpacity(index)));
        const trail = (((wrapped - (index + 1) * 0.007) % 1) + 1) % 1;
        const trailPoint = path.getPointAtLength(trail * total);
        element.setAttribute('cx', trailPoint.x.toFixed(2));
        element.setAttribute('cy', trailPoint.y.toFixed(2));
      });
    };

    const placeSparkAt = (point: { x: number; y: number }) => {
      traceRef.current = { ...point, progress: 0 };
      sparkRef.current?.setAttribute(
        'transform',
        `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`,
      );
      trailRefs.current.forEach((element) => {
        element?.setAttribute('opacity', '0');
      });
    };

    const tick = (now: number) => {
      const dt = Math.min(0.06, (now - last) / 1000);
      last = now;

      const isEmbedded = embeddedRef.current;
      const currentStage = isEmbedded ? STAGE_COUNT - 1 : stageRef.current;
      const reduced = reducedRef.current;
      const rides = stageAnchors(anchorsRef.current);
      const offPath = offPathPoint(currentStage);

      if (reduced) {
        if (isEmbedded) {
          placeSpark(anchorsRef.current.tool);
        } else if (offPath) {
          placeSparkAt(offPath);
        } else {
          const resting = Math.min(currentStage + 1, STAGE_COUNT);
          placeSpark(rides[resting]);
        }
      } else if (isEmbedded) {
        idlePhase += dt * 0.12;
        placeSpark(idlePhase);
      } else if (pRef.current < 0.012) {
        idlePhase += dt;
        const cycle = idlePhase % 12;
        const travel = cycle < 5 ? cycle / 10 : cycle < 7 ? .5 : .5 + (cycle - 7) / 10;
        placeSpark(anchorsRef.current.input + travel);
        traceRef.current.progress = cycle < 5 ? 0 : cycle < 7 ? (cycle - 5) / 2 : 1;
      } else if (offPath) {
        placeSparkAt(offPath);
      } else {
        const local = clamp(
          pRef.current * STAGE_COUNT - currentStage,
          0,
          1,
        );
        const target =
          rides[currentStage] +
          (rides[currentStage + 1] - rides[currentStage]) * easeInOut(local);
        if (!seeded) {
          ride = target;
          seeded = true;
        }
        ride += (target - ride) * Math.min(1, dt * 8);
        placeSpark(ride);
      }

      const mini = miniRef.current;
      if (mini && miniSparkRef.current && (isEmbedded || currentStage >= 7)) {
        if (!reduced) {
          miniPhase += dt * 0.34;
          const total = mini.getTotalLength();
          const point = mini.getPointAtLength((((miniPhase % 1) + 1) % 1) * total);
          miniSparkRef.current.setAttribute(
            'transform',
            `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`,
          );
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const active = embedded ? STAGE_COUNT - 1 : stage;
  const isOn = (threshold: number) => embedded || active >= threshold;
  const isLive = (threshold: number) => !embedded && active === threshold;
  const overview = compact && (active === 0 || active === STAGE_COUNT - 1);

  let viewBox = FULL_VIEW_BOX;
  if (compact) {
    if (active === 0) {
      viewBox = MOBILE_OVERVIEW_BOX;
    } else if (active < STAGE_COUNT - 1) {
      const focus = FOCUS[active] ?? P.model;
      const width = focus.w ?? 600;
      const height = focus.h ?? 480;
      const x = clamp(focus.x - width / 2, 0, VIEW_W - width);
      const y = clamp(focus.y - height / 2, 0, VIEW_H - height);
      viewBox = `${x} ${y} ${width} ${height}`;
    }
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const labels = Array.from(
      svg.querySelectorAll<SVGTextElement>('.pi-label'),
    );
    if (!compact || active === 0 || active === STAGE_COUNT - 1) {
      labels.forEach((label) => label.classList.remove('is-offcrop'));
      return;
    }
    const [x, y, width, height] = viewBox.split(/\s+/).map(Number);
    const margin = 4;
    labels.forEach((label) => {
      const box = label.getBBox();
      const inside =
        box.x >= x + margin &&
        box.y >= y + margin &&
        box.x + box.width <= x + width - margin &&
        box.y + box.height <= y + height - margin;
      label.classList.toggle('is-offcrop', !inside);
    });
  });

  const goTo = (index: number) => {
    if (embedded) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const top = index === 0 ? 0 : ((index + 0.2) / STAGE_COUNT) * max;
    window.scrollTo({
      top,
      behavior: reducedRef.current ? 'auto' : 'smooth',
    });
  };

  const contextLive = isLive(2) || isLive(11);
  const toolLive = isLive(6) || isLive(7);
  const startLive = isLive(1) || isLive(10);
  const turnStartLive = isLive(9);

  return (
    <main
      className={[
        'pi',
        embedded ? 'is-embedded' : '',
        compact ? 'is-compact' : '',
        overview ? 'is-overview' : '',
        active === STAGE_COUNT - 1 ? 'is-final' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--stage-count': STAGE_COUNT } as CSSProperties}
    >
      <h1 className="pi-sr">Pi Agent</h1>

      <div className="pi-stage">
        <header className="pi-top">
          <a className="pi-back" href="/">
            ← 返回
          </a>
          <p className="pi-name">Pi Agent</p>
          <p className="pi-count">
            <b>{String(active + 1).padStart(2, '0')}</b>
            <span> / {String(STAGE_COUNT).padStart(2, '0')}</span>
          </p>
        </header>

        <div className="pi-visual">
          <svg
            ref={svgRef}
            className="pi-svg"
            viewBox={viewBox}
            role="img"
            aria-labelledby="pi-svg-title pi-svg-desc"
            preserveAspectRatio="xMidYMid meet"
          >
            <title id="pi-svg-title">Pi Agent harness 循环图</title>
            <desc id="pi-svg-desc">
              内层是 turn 循环，外层是 run 循环；上下文、provider、流、工具、turn_end、retry、compaction、settle 与排队输入都附着在同一根线上。
            </desc>

            <defs>
              <radialGradient id="pi-spark-halo">
                <stop className="pi-halo-a" offset="0%" />
                <stop className="pi-halo-b" offset="100%" />
              </radialGradient>
            </defs>

            <path className="pi-line-bleed" d={LOOP_D} />
            <path className="pi-ticks" d={LOOP_D} pathLength={1000} />
            <path
              ref={loopRef}
              className="pi-line"
              d={LOOP_D}
              pathLength={1}
            />

            <g className="pi-segments">
              {SEGMENTS.map((segment) => {
                const from = anchors[segment.from];
                let to = anchors[segment.to];
                if (to <= from) to += 1;
                return (
                  <path
                    key={segment.stage}
                    className={[
                      'pi-segment',
                      isLive(segment.stage) ? 'is-live' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    d={LOOP_D}
                    pathLength={1}
                    strokeDasharray={`${(to - from).toFixed(4)} 1`}
                    strokeDashoffset={-from}
                  />
                );
              })}
            </g>

            <g
              className={[
                'pi-stub-group',
                'pi-input',
                isLive(1) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <path className="pi-stub" d={INPUT_D} pathLength={1} />
              <path
                className="pi-stub-arrow"
                d="M -8 -6 L 0 0 L -8 6"
                transform="translate(218 380)"
              />
              <g
                className={['pi-session-ticks', isOn(1) ? 'is-on' : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                <line x1={96} y1={371} x2={96} y2={389} />
                <line x1={126} y1={371} x2={126} y2={389} />
                <line x1={156} y1={371} x2={156} y2={389} />
              </g>
            </g>
            <Gate x={190} y={380} angle={0} on={isOn(1)} live={isLive(1)} />

            <path
              className={['pi-stub', 'pi-exit', isLive(10) ? 'is-live' : '']
                .filter(Boolean)
                .join(' ')}
              d={EXIT_D}
              pathLength={1}
            />
            <path
              className={['pi-stub', 'pi-settle-path', isLive(12) ? 'is-live' : '']
                .filter(Boolean)
                .join(' ')}
              d={SETTLE_D}
              pathLength={1}
            />
            <path
              className={['pi-stub', 'pi-return-line', isLive(12) ? 'is-live' : '']
                .filter(Boolean)
                .join(' ')}
              d={RETURN_LINE_D}
              pathLength={1}
            />
            <path
              className={[
                'pi-stub-arrow',
                'pi-return-arrow',
                isLive(12) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              d="M -9 -6 L 0 0 L -9 6"
              transform="translate(1138 740)"
            />

            <g
              className={['pi-outer', isOn(10) ? 'is-on' : '', isLive(10) ? 'is-live' : '']
                .filter(Boolean)
                .join(' ')}
            >
              <path
                className={[
                  'pi-detour',
                  'pi-outer-loop',
                  isOn(10) ? 'is-on' : '',
                  isLive(10) ? 'is-live' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                d={OUTER_D}
                pathLength={1}
              />
              <path
                className="pi-stub-arrow pi-outer-arrow"
                d="M -9 -6 L 0 0 L -9 6"
                transform="translate(240 308)"
              />
            </g>

            <path
              className={[
                'pi-detour',
                isOn(11) ? 'is-on' : '',
                isLive(11) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              d={COMPACT_D}
              pathLength={1}
            />
            <g
              className={[
                'pi-summary',
                isOn(11) ? 'is-on' : '',
                isLive(11) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              transform={`translate(${COMPACT_CENTER.x} ${COMPACT_CENTER.y})`}
            >
              <circle className="pi-summary-ring" r={10} />
              <circle className="pi-summary-dot" r={3.4} />
            </g>

            <path
              className={[
                'pi-detour',
                isOn(12) ? 'is-on' : '',
                isLive(12) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              d={MEMORY_SPUR_D}
              pathLength={1}
            />
            <g
              className={[
                'pi-memory',
                isOn(12) ? 'is-on' : '',
                isLive(12) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <rect
                x={MEMORY_NODE.x - 8}
                y={MEMORY_NODE.y - 8}
                width={16}
                height={16}
                rx={2}
              />
              <circle
                cx={MEMORY_NODE.x}
                cy={MEMORY_NODE.y}
                r={2.4}
                className="pi-memory-dot"
              />
            </g>
            <circle
              className={[
                'pi-junction',
                isOn(12) ? 'is-on' : '',
                isLive(12) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              cx={P.memory.x}
              cy={P.memory.y}
              r={3.2}
            />

            <path
              className={[
                'pi-detour',
                isOn(9) ? 'is-on' : '',
                isLive(9) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              d={STEER_D}
              pathLength={1}
            />
            <g
              className={[
                'pi-queue',
                isOn(9) ? 'is-on' : '',
                isLive(9) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <rect
                x={STEER_QUEUE.x - 7}
                y={STEER_QUEUE.y - 7}
                width={14}
                height={14}
                rx={2}
              />
              <circle cx={STEER_QUEUE.x} cy={STEER_QUEUE.y} r={2} />
            </g>

            <path
              className={[
                'pi-detour',
                isOn(10) ? 'is-on' : '',
                isLive(10) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              d={FOLLOW_UP_D}
              pathLength={1}
            />
            <g
              className={[
                'pi-queue',
                isOn(10) ? 'is-on' : '',
                isLive(10) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <rect
                x={FOLLOW_QUEUE.x - 7}
                y={FOLLOW_QUEUE.y - 7}
                width={14}
                height={14}
                rx={2}
              />
              <circle cx={FOLLOW_QUEUE.x} cy={FOLLOW_QUEUE.y} r={2} />
            </g>

            <path
              className={[
                'pi-detour',
                isOn(7) ? 'is-on' : '',
                isLive(7) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              d={SUBAGENT_STEM_D}
              pathLength={1}
            />
            <path
              ref={miniRef}
              className={[
                'pi-detour',
                'pi-mini-loop',
                isOn(7) ? 'is-on' : '',
                isLive(7) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              d={MINI_D}
              pathLength={1}
            />

            <Gate
              x={P.agentStart.x}
              y={P.agentStart.y}
              angle={-55.3}
              on={isOn(1)}
              live={startLive}
            />
            <Gate
              x={P.context.x}
              y={P.context.y}
              angle={-27.7}
              on={isOn(2)}
              live={contextLive}
            />
            <Gate
              x={P.provider.x}
              y={P.provider.y}
              angle={-10.8}
              on={isOn(3)}
              live={isLive(3)}
            />
            <Gate
              x={P.stream.x}
              y={P.stream.y}
              angle={16.9}
              on={isOn(5)}
              live={isLive(5)}
            />
            <Gate
              x={P.toolCall.x}
              y={P.toolCall.y}
              angle={71.4}
              on={isOn(6)}
              live={isLive(6)}
            />
            <Gate
              x={P.toolResult.x}
              y={P.toolResult.y}
              angle={108.6}
              on={isOn(6)}
              live={isLive(6)}
            />
            <Gate
              x={P.turnEnd.x}
              y={P.turnEnd.y}
              angle={152.3}
              on={isOn(8)}
              live={isLive(8)}
            />
            <Gate
              x={P.turnStart.x}
              y={P.turnStart.y}
              angle={-137.7}
              on={isOn(8)}
              live={turnStartLive}
            />
            <Gate
              x={AGENT_END_GATE.x}
              y={AGENT_END_GATE.y}
              angle={22}
              on={isOn(10)}
              live={isLive(10)}
            />
            <Gate
              x={SETTLE_GATE.x}
              y={SETTLE_GATE.y}
              angle={12.3}
              on={isOn(12)}
              live={isLive(12)}
            />

            <g
              className={['pi-more', isOn(10) ? 'is-on' : '', isLive(10) ? 'is-live' : '']
                .filter(Boolean)
                .join(' ')}
              transform={`translate(${MORE_WORK.x} ${MORE_WORK.y})`}
            >
              {isLive(10) ? <circle className="pi-pulse" r={10} /> : null}
              <path d="M 0 -7 L 7 0 L 0 7 L -7 0 Z" />
            </g>

            <g
              className={[
                'pi-settled',
                isOn(12) ? 'is-on' : '',
                isLive(12) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              transform={`translate(${SETTLED.x} ${SETTLED.y})`}
            >
              {isLive(12) ? <circle className="pi-pulse" r={9} /> : null}
              <circle className="pi-settled-dot" r={4.6} />
            </g>

            <g
              className={['pi-decision', isLive(8) ? 'is-live' : '']
                .filter(Boolean)
                .join(' ')}
              transform={`translate(${P.decide.x} ${P.decide.y})`}
            >
              {isLive(8) ? <circle className="pi-pulse" r={10} /> : null}
              <path d="M 0 -7 L 7 0 L 0 7 L -7 0 Z" />
            </g>

            <Station x={P.input.x} y={P.input.y} live={isLive(1)} />
            <Station
              x={P.model.x}
              y={P.model.y}
              live={isLive(4)}
              ring
              ringOn={isOn(4)}
            />
            <Station x={P.tool.x} y={P.tool.y} live={toolLive} />

            <Label x={196} y={356} anchor="end" strong on>
              INPUT
            </Label>
            <Label x={620} y={136} strong on>
              MODEL
            </Label>
            <Label x={1032} y={416} anchor="start" strong on>
              TOOL
            </Label>
            <Label x={590} y={632} anchor="end" strong on>
              ENOUGH?
            </Label>
            <Label x={1075} y={772} strong on>
              RETURN
            </Label>

            <Label x={105} y={330} small on={isOn(1)} live={isLive(1)}>
              SESSION
            </Label>
            <Label x={190} y={412} small on={isOn(1)} live={isLive(1)}>
              BEFORE
            </Label>
            <Label x={214} y={285} anchor="end" small on={isOn(1)} live={startLive}>
              START
            </Label>

            <Label x={296} y={203} anchor="end" on={isOn(2)} live={contextLive}>
              CONTEXT
            </Label>
            <Label x={455} y={155} anchor="end" on={isOn(3)} live={isLive(3)}>
              PROVIDER
            </Label>
            <Label x={852} y={172} anchor="start" on={isOn(5)} live={isLive(5)}>
              STREAM
            </Label>
            <Label x={1018} y={300} anchor="start" small on={isOn(6)} live={isLive(6)}>
              CALL
            </Label>
            <Label x={1018} y={462} anchor="start" small on={isOn(6)} live={isLive(6)}>
              RESULT
            </Label>
            <Label x={940} y={544} anchor="start" small on={isOn(8)} live={isLive(8)}>
              TURN END
            </Label>
            <Label x={240} y={465} anchor="end" small on={isOn(8)} live={turnStartLive}>
              TURN START
            </Label>
            <Label x={530} y={610} small on={isOn(8)} live={isLive(8)}>
              NO
            </Label>
            <Label x={100} y={548} anchor="start" small on={isOn(9)} live={isLive(9)}>
              STEER
            </Label>
            <Label x={760} y={612} small on={isOn(10)} live={isLive(10)}>
              AGENT END
            </Label>
            <Label x={980} y={640} anchor="start" small on={isOn(10)} live={isLive(10)}>
              MORE WORK
            </Label>
            <Label x={775} y={780} small on={isOn(10)} live={isLive(10)}>
              FOLLOW-UP
            </Label>
            <Label x={424} y={282} anchor="start" on={isOn(11)} live={isLive(11)}>
              COMPACT
            </Label>
            <Label x={1000} y={704} small on={isOn(12)} live={isLive(12)}>
              SETTLE
            </Label>
            <Label x={470} y={488} anchor="start" on={isOn(12)} live={isLive(12)}>
              MEMORY
            </Label>
            <Label x={830} y={408} on={isOn(7)} live={isLive(7)}>
              SUBAGENT
            </Label>

            {Array.from({ length: 5 }, (_, index) => (
              <circle
                key={index}
                ref={(element) => {
                  trailRefs.current[index] = element;
                }}
                className="pi-spark-trail"
                cx={220}
                cy={380}
                r={3.6 - index * 0.5}
                opacity={0.3 - index * 0.05}
              />
            ))}

            <g
              ref={sparkRef}
              className="pi-spark"
              transform="translate(220 380)"
            >
              <circle className="pi-spark-halo" r={30} />
              <path
                className="pi-spark-core"
                d="M 0 -11 L 3 -3 L 11 0 L 3 3 L 0 11 L -3 3 L -11 0 L -3 -3 Z"
              />
            </g>

            <g
              ref={miniSparkRef}
              className={[
                'pi-mini-spark',
                isOn(7) ? 'is-on' : '',
                isLive(7) ? 'is-live' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              transform="translate(772 455)"
            >
              <circle className="pi-mini-glow" r={9} />
              <path
                className="pi-mini-core"
                d="M 0 -4.5 L 1.3 -1.3 L 4.5 0 L 1.3 1.3 L 0 4.5 L -1.3 1.3 L -4.5 0 L -1.3 -1.3 Z"
              />
            </g>
          </svg>
          {!embedded && (!compact || [0, 6, 7, 13].includes(active)) && <PiToolLens svg={svgRef} path={loopRef} trace={traceRef} stage={active} />}
        </div>

        <div className="pi-caption" aria-live="polite" aria-atomic="true">
          <div className="pi-caption-body" key={active}>
            <h2>{STAGES[active].title}</h2>
            <p>{STAGES[active].body}</p>
          </div>
        </div>

        <nav className="pi-rail" aria-label="演示阶段">
          {STAGES.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={['pi-rail-item', index === active ? 'is-active' : '']
                .filter(Boolean)
                .join(' ')}
              aria-label={`${index + 1}. ${item.title}`}
              aria-current={index === active ? 'step' : undefined}
              onClick={() => goTo(index)}
            >
              <span className="pi-rail-tick" />
            </button>
          ))}
        </nav>
      </div>

      <div className="pi-track" aria-hidden="true" />
    </main>
  );
}
