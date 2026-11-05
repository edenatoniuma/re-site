import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import '../../styles/demos/vary-region.css';

type RectShape = { kind: 'rect'; x: number; y: number; w: number; h: number };
type LassoShape = { kind: 'lasso'; points: Array<[number, number]> };
type Shape = RectShape | LassoShape;
type Tool = 'rect' | 'lasso';
type View = 'message' | 'editor' | 'sent';
type Phase = 'queued' | 'done';

type Submission = {
  prompt: string;
  shapes: Shape[];
  coverage: number;
};

const ORIGINAL_PROMPT = 'meadow trail lithograph';

const PRESET_SHAPES: Shape[] = [
  {
    kind: 'lasso',
    points: [
      [0.3, 0.995],
      [0.282, 0.9],
      [0.302, 0.828],
      [0.36, 0.778],
      [0.438, 0.744],
      [0.474, 0.684],
      [0.45, 0.62],
      [0.462, 0.566],
      [0.492, 0.544],
      [0.534, 0.574],
      [0.524, 0.642],
      [0.566, 0.702],
      [0.586, 0.782],
      [0.566, 0.872],
      [0.53, 0.995],
    ],
  },
];

const VARIANTS = [
  'hue-rotate(-7deg) saturate(1.06)',
  'hue-rotate(6deg) saturate(0.92) brightness(1.04)',
  'sepia(0.14) saturate(1.12)',
  'hue-rotate(15deg) saturate(0.88) brightness(0.97)',
];

const FLOWER_COLORS = ['#d7a6b2', '#efe4cd', '#d9bd71', '#c78f7e'];

function frac(value: number) {
  return value - Math.floor(value);
}

function noise(index: number, salt: number) {
  return frac(Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453);
}

const FLOWERS = Array.from({ length: 52 }, (_, index) => {
  const left = index % 2 === 0;
  const x = left ? 26 + noise(index, 1) * 336 : 618 + noise(index, 2) * 356;
  const y = 742 + noise(index, 3) * 246;
  const r = 4.5 + noise(index, 4) * 9;
  const fill = FLOWER_COLORS[index % FLOWER_COLORS.length] ?? '#efe4cd';
  return { x, y, r, fill };
});

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function polygonArea(points: Array<[number, number]>) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!current || !next) continue;
    area += current[0] * next[1] - next[0] * current[1];
  }
  return Math.abs(area) / 2;
}

function shapeArea(shape: Shape) {
  return shape.kind === 'rect' ? shape.w * shape.h : polygonArea(shape.points);
}

function coverageOf(shapes: Shape[]) {
  return Math.min(
    1,
    shapes.reduce((total, shape) => total + shapeArea(shape), 0),
  );
}

function Artwork() {
  return (
    <svg
      className="artwork"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Meadow trail lithograph"
    >
      <rect width="1000" height="1000" fill="#c4bcc8" />
      <path d="M0 262H1000v190H0z" fill="#d6cabb" />
      <circle cx="684" cy="196" r="62" fill="#e9dec6" opacity="0.9" />
      <path
        d="M0 430 90 408 200 432 320 402 430 434 540 410 660 438 780 408 890 436 1000 414v106H0z"
        fill="#a3a590"
      />
      <path
        d="M0 500 120 470 240 500 370 468 500 502 630 474 760 506 890 478 1000 502v98H0z"
        fill="#899272"
      />
      <path
        d="M0 570c180-28 340 26 520-4s340 24 480-4v438H0z"
        fill="#75835c"
      />
      <path
        d="M0 720c200-44 360 28 560-6s340 22 440-8v294H0z"
        fill="#9c9a68"
      />
      <path
        d="M0 850c220-38 420 22 640-8 180-24 280 10 360-10v168H0z"
        fill="#87855a"
      />
      <path
        d="M368 1000c10-94 144-148 152-240 6-68-36-114-32-160h28c10 50 54 90 54 162 0 104-104 148-84 238z"
        fill="#dccfb0"
      />
      <g fill="#42503c">
        <circle cx="40" cy="520" r="120" />
        <circle cx="140" cy="470" r="90" />
        <circle cx="120" cy="600" r="110" />
        <circle cx="930" cy="500" r="110" />
        <circle cx="850" cy="460" r="80" />
        <circle cx="970" cy="590" r="100" />
      </g>
      <g fill="#313a2c">
        <rect x="118" y="592" width="16" height="132" />
        <rect x="878" y="574" width="16" height="142" />
      </g>
      <g>
        {FLOWERS.map((flower, index) => (
          <circle
            key={index}
            cx={flower.x}
            cy={flower.y}
            r={flower.r}
            fill={flower.fill}
            opacity="0.92"
          />
        ))}
      </g>
    </svg>
  );
}

function tracePath(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  width: number,
  height: number,
) {
  ctx.beginPath();
  if (shape.kind === 'rect') {
    ctx.rect(shape.x * width, shape.y * height, shape.w * width, shape.h * height);
    return;
  }
  shape.points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x * width, y * height);
    else ctx.lineTo(x * width, y * height);
  });
  ctx.closePath();
}

function hasArea(shape: Shape) {
  return shapeArea(shape) > 0.0004;
}

type SelectionLayerProps = {
  shapes: Shape[];
  draft: Shape | null;
  interactive?: boolean;
  onPointerDown?: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerCancel?: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
};

function SelectionLayer({
  shapes,
  draft,
  interactive = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: SelectionLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (!width || !height) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(17, 17, 19, 0.4)';
      ctx.fillRect(0, 0, width, height);

      const tile = document.createElement('canvas');
      tile.width = 16 * dpr;
      tile.height = 16 * dpr;
      const tileCtx = tile.getContext('2d');
      if (tileCtx) {
        tileCtx.fillStyle = '#dad9d2';
        tileCtx.fillRect(0, 0, tile.width, tile.height);
        tileCtx.fillStyle = '#b3b2ab';
        tileCtx.fillRect(0, 0, 8 * dpr, 8 * dpr);
        tileCtx.fillRect(8 * dpr, 8 * dpr, 8 * dpr, 8 * dpr);
      }
      const pattern = ctx.createPattern(tile, 'repeat');
      pattern?.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));

      const all = draft ? [...shapes, draft] : shapes;
      for (const shape of all) {
        if (!hasArea(shape)) {
          if (shape === draft && shape.kind === 'lasso' && shape.points.length > 1) {
            ctx.beginPath();
            shape.points.forEach(([x, y], index) => {
              if (index === 0) ctx.moveTo(x * width, y * height);
              else ctx.lineTo(x * width, y * height);
            });
            ctx.strokeStyle = '#5865f2';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();
          }
          continue;
        }
        tracePath(ctx, shape, width, height);
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fill();
        }
        ctx.strokeStyle = '#5865f2';
        ctx.lineWidth = width < 220 ? 2 : 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [shapes, draft]);

  return (
    <canvas
      ref={canvasRef}
      className={`selection-layer${interactive ? ' is-interactive' : ''}`}
      role={interactive ? 'img' : undefined}
      aria-label={interactive ? 'Selection canvas, drag to mark a region' : undefined}
      aria-hidden={interactive ? undefined : true}
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerCancel : undefined}
    />
  );
}

function BoatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v13" />
      <path d="M12 4.4 17 13h-5z" fill="currentColor" stroke="none" opacity="0.85" />
      <path d="M11 6.6 7.4 13H11z" fill="currentColor" stroke="none" opacity="0.55" />
      <path d="M4.6 15.4h14.8L17.3 19H7.2z" />
      <path d="M4 22c1.3-.8 2.7-.8 4 0s2.7.8 4 0 2.7-.8 4 0 2.7.8 4 0" />
    </svg>
  );
}

function BrushIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16.4 3.9a2 2 0 0 1 2.9 0l.8.8a2 2 0 0 1 0 2.9l-8.4 8.3-4.3 1.4 1.4-4.3z" />
      <path d="m13.2 5.6 5.2 5.2" />
    </svg>
  );
}

function RectIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeDasharray="2.6 2.8"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="1.6" />
    </svg>
  );
}

function LassoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="9" rx="8" ry="6" />
      <path d="M6.6 14.1c.2 2-.7 2.6-.7 3.6 0 .9.7 1.7 1.6 1.7" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6 4 11l5 5" />
      <path d="M4 11h9.5a5.5 5.5 0 0 1 0 11H9" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 6 5 5-5 5" />
      <path d="M20 11h-9.5a5.5 5.5 0 0 0 0 11H15" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function VaryRegionDemo() {
  const [view, setView] = useState<View>('message');
  const [tool, setTool] = useState<Tool>('lasso');
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [redoStack, setRedoStack] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [prompt, setPrompt] = useState(ORIGINAL_PROMPT);
  const [submitted, setSubmitted] = useState<Submission | null>(null);
  const [phase, setPhase] = useState<Phase>('queued');
  const startRef = useRef<[number, number] | null>(null);
  const sentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.self === window.top) return;
    setShapes(PRESET_SHAPES);
    setView('editor');
  }, []);

  useEffect(() => {
    if (view !== 'sent' || !submitted) return;
    setPhase('queued');
    const timer = window.setTimeout(() => setPhase('done'), 2000);
    return () => window.clearTimeout(timer);
  }, [view, submitted]);

  useEffect(() => {
    if (view !== 'sent') return;
    sentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [view]);

  useEffect(() => {
    if (phase !== 'done') return;
    sentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [phase]);

  const closeEditor = useCallback(() => {
    setView('message');
    setDraft(null);
    startRef.current = null;
  }, []);

  useEffect(() => {
    if (view !== 'editor') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeEditor();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [view, closeEditor]);

  function openEditor() {
    setShapes([]);
    setRedoStack([]);
    setDraft(null);
    setPrompt(ORIGINAL_PROMPT);
    setTool('lasso');
    setView('editor');
  }

  function editAgain() {
    if (!submitted) return;
    setShapes(submitted.shapes);
    setRedoStack([]);
    setPrompt(submitted.prompt);
    setDraft(null);
    setView('editor');
  }

  function toPoint(event: ReactPointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      clamp((event.clientX - rect.left) / rect.width),
      clamp((event.clientY - rect.top) / rect.height),
    ];
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toPoint(event);
    startRef.current = point;
    setDraft(
      tool === 'rect'
        ? { kind: 'rect', x: point[0], y: point[1], w: 0, h: 0 }
        : { kind: 'lasso', points: [point] },
    );
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!draft) return;
    const point = toPoint(event);
    if (draft.kind === 'rect') {
      const start = startRef.current ?? point;
      setDraft({
        kind: 'rect',
        x: Math.min(start[0], point[0]),
        y: Math.min(start[1], point[1]),
        w: Math.abs(point[0] - start[0]),
        h: Math.abs(point[1] - start[1]),
      });
      return;
    }
    const last = draft.points[draft.points.length - 1];
    if (!last) return;
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 0.005) return;
    setDraft({ kind: 'lasso', points: [...draft.points, point] });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (draft) {
      const valid =
        draft.kind === 'rect'
          ? draft.w > 0.012 && draft.h > 0.012
          : draft.points.length > 2 && polygonArea(draft.points) > 0.0012;
      if (valid) {
        setShapes((previous) => [...previous, draft]);
        setRedoStack([]);
      }
    }
    setDraft(null);
    startRef.current = null;
  }

  function handlePointerCancel() {
    setDraft(null);
    startRef.current = null;
  }

  function undo() {
    if (!shapes.length) return;
    const last = shapes[shapes.length - 1];
    if (!last) return;
    setShapes(shapes.slice(0, -1));
    setRedoStack((previous) => [...previous, last]);
  }

  function redo() {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    setRedoStack(redoStack.slice(0, -1));
    setShapes((previous) => [...previous, next]);
  }

  function submit() {
    if (!shapes.length) return;
    setSubmitted({
      prompt: prompt.trim() || ORIGINAL_PROMPT,
      shapes,
      coverage: coverageOf(shapes),
    });
    setView('sent');
  }

  const regionCount = submitted?.shapes.length ?? 0;
  const coverageLabel = submitted ? `${Math.round(submitted.coverage * 100)}% mask` : '';

  return (
    <div className="demo">
      <header className="topbar">
        <a className="back" href="/">
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </a>
      </header>

      <main className="chat">
        <article className="msg">
          <div className="avatar" aria-hidden="true">
            <BoatIcon />
          </div>
          <div className="msg-body">
            <div className="msg-head">
              <span className="bot">Midjourney Bot</span>
              <span className="app">APP</span>
            </div>
            <p className="msg-text">
              <strong>{ORIGINAL_PROMPT}</strong>{' '}
              <span className="msg-dim">Image #4</span>
            </p>
            <div className="attach">
              <Artwork />
            </div>
            <div className="actions">
              <button className="chip is-primary" type="button" onClick={openEditor}>
                <BrushIcon />
                Vary (Region)
              </button>
            </div>
          </div>
        </article>

        {submitted && (
          <article className="msg" aria-live="polite" ref={sentRef}>
            <div className="avatar" aria-hidden="true">
              <BoatIcon />
            </div>
            <div className="msg-body">
              <div className="msg-head">
                <span className="bot">Midjourney Bot</span>
                <span className="app">APP</span>
              </div>
              <p className="msg-text">
                <strong>{submitted.prompt}</strong>{' '}
                <span className="msg-dim">Vary (Region)</span>
              </p>

              <div className="request">
                <div className="request-mask">
                  <Artwork />
                  <SelectionLayer shapes={submitted.shapes} draft={null} />
                </div>
                <div className="request-meta">
                  <p className={`status is-${phase}`}>
                    <span className="status-dot" />
                    {phase === 'done' ? 'Done · 4 images' : 'Queued'}
                  </p>
                  <p className="stats">
                    {regionCount} {regionCount === 1 ? 'region' : 'regions'} ·{' '}
                    {coverageLabel}
                  </p>
                  <button className="link" type="button" onClick={editAgain}>
                    Edit region again
                  </button>
                </div>
              </div>

              {phase === 'done' && (
                <div className="plates" aria-label="Four variations">
                  {VARIANTS.map((variant, index) => (
                    <div
                      key={index}
                      className="plate"
                      style={
                        {
                          '--tint': variant,
                          animationDelay: `${index * 70}ms`,
                        } as CSSProperties
                      }
                    >
                      <div className="plate-art" aria-hidden="true">
                        <Artwork />
                      </div>
                      <span>V{index + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        )}
      </main>

      {view === 'editor' && (
        <div className="editor" role="dialog" aria-modal="true" aria-label="Vary Region editor">
          <header className="editor-head">
            <span className="editor-brand">
              <BoatIcon />
              Editor
            </span>
            <button className="close-btn" type="button" onClick={closeEditor}>
              <CloseIcon />
              Close
            </button>
          </header>

          <div className="editor-stage">
            <div className="history">
              <button
                className="history-btn"
                type="button"
                onClick={undo}
                disabled={!shapes.length}
                aria-label="Undo last selection"
                title="Undo"
              >
                <UndoIcon />
              </button>
              <button
                className="history-btn"
                type="button"
                onClick={redo}
                disabled={!redoStack.length}
                aria-label="Redo selection"
                title="Redo"
              >
                <RedoIcon />
              </button>
            </div>

            <div className="artboard">
              <Artwork />
              <SelectionLayer
                shapes={shapes}
                draft={draft}
                interactive
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
              />
            </div>
          </div>

          <div className="editor-bar">
            <div className="tools" role="group" aria-label="Selection tool">
              <button
                className="tool-btn"
                type="button"
                aria-pressed={tool === 'rect'}
                aria-label="Rectangle select"
                title="Rectangle"
                onClick={() => {
                  setTool('rect');
                  setDraft(null);
                }}
              >
                <RectIcon />
              </button>
              <button
                className="tool-btn"
                type="button"
                aria-pressed={tool === 'lasso'}
                aria-label="Lasso select"
                title="Lasso"
                onClick={() => {
                  setTool('lasso');
                  setDraft(null);
                }}
              >
                <LassoIcon />
              </button>
            </div>

            <div className="prompt-row">
              <input
                className="prompt-input"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit();
                }}
                placeholder="Describe the change"
                aria-label="Prompt for the selected region"
                spellCheck={false}
              />
              <button
                className="send-btn"
                type="button"
                onClick={submit}
                disabled={!shapes.length}
                aria-label="Submit vary region"
                title="Submit"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
