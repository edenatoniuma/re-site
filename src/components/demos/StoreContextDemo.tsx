import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, DragEvent, FormEvent } from 'react';
import '../../styles/demos/store-context.css';

type Role = 'user' | 'assistant';
type Message = { role: Role; text: string };
type Thread = {
  id: string;
  title: string;
  updated: string;
  messages: Message[];
};
type Store = {
  id: string;
  name: string;
  initial: string;
  context: { category: string; products: number; files: number };
  threads: Thread[];
};

const STORES: Store[] = [
  {
    id: 'form',
    name: 'FORM & FIELD',
    initial: 'F',
    context: { category: '家居', products: 128, files: 12 },
    threads: [
      {
        id: 'form-1',
        title: '新品落地页文案',
        updated: '刚刚',
        messages: [
          { role: 'user', text: '给下个月的新品做一组落地页文案。' },
          {
            role: 'assistant',
            text: '基于 128 个商品和近 7 天 3.2% 的转化率，建议先做主推系列的精简版。',
          },
        ],
      },
      {
        id: 'form-2',
        title: '夏季主推复盘',
        updated: '昨天',
        messages: [
          { role: 'user', text: '夏季主推的转化比去年好吗？' },
          {
            role: 'assistant',
            text: '整体高 1.4 个点，藤编系列贡献最多，但客单价略降。',
          },
        ],
      },
      {
        id: 'form-3',
        title: '会员复购提醒',
        updated: '周一',
        messages: [
          { role: 'user', text: '给 90 天没回购的老客写一版提醒。' },
          {
            role: 'assistant',
            text: '建议用“上次看的系列补货了”做开头，比直接发券的打开率高。',
          },
        ],
      },
      {
        id: 'form-4',
        title: '社媒素材清单',
        updated: '上周',
        messages: [
          { role: 'user', text: '下周要发几条素材？' },
          {
            role: 'assistant',
            text: '按上新节奏建议 5 条：2 条场景、2 条细节、1 条用户反馈。',
          },
        ],
      },
    ],
  },
  {
    id: 'test',
    name: '测试',
    initial: '测',
    context: { category: '测试店', products: 24, files: 3 },
    threads: [
      {
        id: 'test-1',
        title: '点击上升的商品',
        updated: '刚刚',
        messages: [
          { role: 'user', text: '这周有哪些商品点击在涨？' },
          {
            role: 'assistant',
            text: '有 3 个商品的点击连续三天上升，主要来自移动端搜索。',
          },
        ],
      },
      {
        id: 'test-2',
        title: '搜索词异常排查',
        updated: '昨天',
        messages: [
          { role: 'user', text: '品牌词点击昨天掉了一半，为什么？' },
          {
            role: 'assistant',
            text: '有一个新出现的竞品词占走了首屏，建议先查投放和自然排名。',
          },
        ],
      },
      {
        id: 'test-3',
        title: '移动端首屏实验',
        updated: '周一',
        messages: [
          { role: 'user', text: '移动端首屏换成三列会更好吗？' },
          {
            role: 'assistant',
            text: '测试组加购率提升了，但停留时长下降，建议再跑一周。',
          },
        ],
      },
      {
        id: 'test-4',
        title: '广告账户复盘',
        updated: '上周',
        messages: [
          { role: 'user', text: '这个月广告花得值吗？' },
          {
            role: 'assistant',
            text: 'ROI 比上月高，但品牌词吃掉太多预算，建议拆开看。',
          },
        ],
      },
    ],
  },
  {
    id: 'cove',
    name: 'Cove and Clasp',
    initial: 'C',
    context: { category: '饰品', products: 86, files: 8 },
    threads: [
      {
        id: 'cove-1',
        title: '情人节邮件开头',
        updated: '刚刚',
        messages: [
          { role: 'user', text: '给情人节系列写一版邮件开头。' },
          {
            role: 'assistant',
            text: '近 30 天复购数据里，老客更在意“限定刻字”，可以从这里切入。',
          },
        ],
      },
      {
        id: 'cove-2',
        title: '限定刻字复购',
        updated: '昨天',
        messages: [
          { role: 'user', text: '限定刻字的老客复购周期是多久？' },
          {
            role: 'assistant',
            text: '平均 42 天，第二次购买集中在纪念日前两周。',
          },
        ],
      },
      {
        id: 'cove-3',
        title: '新品上架节奏',
        updated: '周一',
        messages: [
          { role: 'user', text: '下个系列分两批上还是同时上？' },
          {
            role: 'assistant',
            text: '分两批更稳，先上耳饰测反应，再上项链。',
          },
        ],
      },
      {
        id: 'cove-4',
        title: '礼盒包装反馈',
        updated: '上周',
        messages: [
          { role: 'user', text: '礼盒包装的差评主要是什么？' },
          {
            role: 'assistant',
            text: '集中在盒角压损，换加厚内衬能解决大部分。',
          },
        ],
      },
    ],
  },
  {
    id: 'coffee',
    name: 'coffee',
    initial: 'c',
    context: { category: '咖啡', products: 41, files: 4 },
    threads: [
      {
        id: 'coffee-1',
        title: '新豆子首发',
        updated: '刚刚',
        messages: [
          { role: 'user', text: '新豆子上市，先推哪一支？' },
          {
            role: 'assistant',
            text: '浅烘果香那支的加购率最高，适合做首发；深烘留给订阅用户。',
          },
        ],
      },
      {
        id: 'coffee-2',
        title: '订阅用户分层',
        updated: '昨天',
        messages: [
          { role: 'user', text: '订阅用户怎么分层发新品？' },
          {
            role: 'assistant',
            text: '按烘焙偏好分两组，浅烘推果香，深烘推巧克力调。',
          },
        ],
      },
      {
        id: 'coffee-3',
        title: '冷萃季节文案',
        updated: '周一',
        messages: [
          { role: 'user', text: '冷萃上架文案想轻一点。' },
          {
            role: 'assistant',
            text: '可以从“下午三点的慢下来”切入，弱化功能参数。',
          },
        ],
      },
      {
        id: 'coffee-4',
        title: '门店自提转化',
        updated: '上周',
        messages: [
          { role: 'user', text: '门店自提怎么推？' },
          {
            role: 'assistant',
            text: '在下单页强调当天取货，再给一个小杯试饮券。',
          },
        ],
      },
    ],
  },
  {
    id: 'paw',
    name: 'Paw Pour',
    initial: 'P',
    context: { category: '宠物', products: 63, files: 6 },
    threads: [
      {
        id: 'paw-1',
        title: '饮水机短视频脚本',
        updated: '刚刚',
        messages: [
          { role: 'user', text: '想做一个宠物饮水机的短视频脚本。' },
          {
            role: 'assistant',
            text: '可以先拍猫对流动水的反应，再落到静音和滤芯这两个卖点。',
          },
        ],
      },
      {
        id: 'paw-2',
        title: '滤芯复购提醒',
        updated: '昨天',
        messages: [
          { role: 'user', text: '滤芯多久提醒一次比较合适？' },
          {
            role: 'assistant',
            text: '按用水量估 45 天，提前一周提醒，复购率最高。',
          },
        ],
      },
      {
        id: 'paw-3',
        title: '宠物饮水场景',
        updated: '周一',
        messages: [
          { role: 'user', text: '除了猫，还适合拍什么场景？' },
          {
            role: 'assistant',
            text: '小户型办公桌和旅行车载都能讲，重点还是静音。',
          },
        ],
      },
      {
        id: 'paw-4',
        title: '售后问题汇总',
        updated: '上周',
        messages: [
          { role: 'user', text: '最近售后最多的问题是什么？' },
          {
            role: 'assistant',
            text: '滤芯安装方向占了一半，可以在盒内加一张图示卡。',
          },
        ],
      },
    ],
  },
  {
    id: 'lumen',
    name: 'Lumen Ask',
    initial: 'L',
    context: { category: '香氛', products: 37, files: 5 },
    threads: [
      {
        id: 'lumen-1',
        title: '秋季香氛搜索词',
        updated: '刚刚',
        messages: [
          { role: 'user', text: '秋季香氛的搜索词怎么选？' },
          {
            role: 'assistant',
            text: '“木质调”和“无火香薰”增长最快，建议围绕通勤和卧室场景组合。',
          },
        ],
      },
      {
        id: 'lumen-2',
        title: '卧室场景组合',
        updated: '昨天',
        messages: [
          { role: 'user', text: '卧室场景怎么搭套装？' },
          {
            role: 'assistant',
            text: '无火香薰加助眠喷雾，做一套“睡前 20 分钟”更顺。',
          },
        ],
      },
      {
        id: 'lumen-3',
        title: '无火香薰上新',
        updated: '周一',
        messages: [
          { role: 'user', text: '无火香薰首发先做哪个香型？' },
          {
            role: 'assistant',
            text: '木质调搜索量最高，先用它拉新，再用花香做第二波。',
          },
        ],
      },
      {
        id: 'lumen-4',
        title: '香型命名测试',
        updated: '上周',
        messages: [
          { role: 'user', text: '两个香型名字哪个更好？' },
          {
            role: 'assistant',
            text: '“雨后木头”比“沉木”更容易被记住，搜索联想也更好。',
          },
        ],
      },
    ],
  },
];

const GAP = 8;
const MIN_TILE_W = 120;
const MIN_TILE_H = 84;
const MAX_TILE_W = 224;
const MAX_TILE_H = 150;

function nextStore(id: string) {
  const index = STORES.findIndex((store) => store.id === id);
  return STORES[(index + 1) % STORES.length];
}

function promoteWindow(
  ids: string[],
  promoteId: string,
  previousMainId: string,
) {
  const withoutPrevious = ids.filter((item) => item !== previousMainId);
  const index = withoutPrevious.indexOf(promoteId);
  if (index === -1) return [...withoutPrevious, previousMainId];
  const next = [...withoutPrevious];
  next[index] = previousMainId;
  return next;
}

export default function StoreContextDemo() {
  const [activeId, setActiveId] = useState(STORES[0].id);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [sessions, setSessions] = useState<Record<string, Thread[]>>(() =>
    Object.fromEntries(STORES.map((store) => [store.id, store.threads])),
  );
  const [activeThreadIds, setActiveThreadIds] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      STORES.map((store) => [store.id, store.threads[0].id]),
    ),
  );
  const [modalId, setModalId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [modalDraft, setModalDraft] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [overChat, setOverChat] = useState(false);
  const [notice, setNotice] = useState('');
  const [dockSize, setDockSize] = useState({ w: 0, h: 0 });

  const gridRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const modalMessagesRef = useRef<HTMLDivElement>(null);
  const timers = useRef<Record<string, number>>({});
  const replyTimers = useRef<number[]>([]);
  const noticeTimer = useRef<number | undefined>(undefined);

  const active = STORES.find((store) => store.id === activeId) ?? STORES[0];
  const modalStore = STORES.find((store) => store.id === modalId) ?? null;

  function threadFor(storeId: string) {
    const list = sessions[storeId] ?? [];
    const id = activeThreadIds[storeId];
    return list.find((thread) => thread.id === id) ?? list[0];
  }

  const activeThread = threadFor(activeId);
  const activeMessages = activeThread?.messages ?? [];
  const historyThreads = sessions[activeId] ?? [];
  const modalThread = modalStore ? threadFor(modalStore.id) : undefined;
  const modalMessages = modalThread?.messages ?? [];

  const { capacity, cols, rows, tileW, tileH } = useMemo(() => {
    const w = dockSize.w || 560;
    const h = dockSize.h || 140;
    const colsMax = Math.max(
      1,
      Math.floor((w + GAP) / (MIN_TILE_W + GAP)),
    );
    const rowsMax = Math.max(
      1,
      Math.floor((h + GAP) / (MIN_TILE_H + GAP)),
    );
    const max = Math.max(1, Math.min(STORES.length, colsMax * rowsMax));
    const count = Math.max(1, openIds.length);
    const columns = Math.min(colsMax, count);
    const rowCount = Math.min(rowsMax, Math.ceil(count / columns));
    const width = Math.max(
      0,
      Math.min(MAX_TILE_W, Math.floor((w - GAP * (columns - 1)) / columns)),
    );
    const height = Math.max(
      0,
      Math.min(MAX_TILE_H, Math.floor((h - GAP * (rowCount - 1)) / rowCount)),
    );
    return {
      capacity: max,
      cols: columns,
      rows: rowCount,
      tileW: width,
      tileH: height,
    };
  }, [dockSize.h, dockSize.w, openIds.length]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      setDockSize({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.self === window.top) return;
    setOpenIds(['cove', 'coffee']);
    setLoaded({ cove: true, coffee: true });
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeId, activeThread?.id, activeMessages.length]);

  useEffect(() => {
    const el = modalMessagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [modalId, modalThread?.id, modalMessages.length]);

  useEffect(() => {
    if (!modalId) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalId(null);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [modalId]);

  useEffect(
    () => () => {
      Object.values(timers.current).forEach((timer) =>
        window.clearTimeout(timer),
      );
      replyTimers.current.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  function flash(text: string) {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2600);
  }

  function appendMessage(storeId: string, threadId: string, message: Message) {
    setSessions((prev) => {
      const threads = prev[storeId] ?? [];
      return {
        ...prev,
        [storeId]: threads.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                updated: '刚刚',
                messages: [...thread.messages, message],
              }
            : thread,
        ),
      };
    });
  }

  function loadWindow(id: string) {
    if (id in loaded) return;
    setLoaded((prev) => ({ ...prev, [id]: false }));
    window.clearTimeout(timers.current[id]);
    timers.current[id] = window.setTimeout(
      () => {
        setLoaded((prev) => ({ ...prev, [id]: true }));
      },
      380 + Math.floor(Math.random() * 420),
    );
  }

  function openWindow(id: string) {
    const store = STORES.find((item) => item.id === id);
    if (!store) return;

    let nextOpen = openIds.filter((item) => item !== id);
    let nextActive = activeId;
    let message = `已打开 ${store.name} 的店铺窗口`;

    if (id === activeId) {
      const following = nextStore(id);
      nextActive = following.id;
      nextOpen = promoteWindow(openIds, following.id, id);
      message = `${store.name} 转为窗口，主会话切到 ${following.name}`;
    } else {
      if (openIds.includes(id)) {
        flash(`${store.name} 的窗口已经开着`);
        return;
      }
      nextOpen = [...nextOpen, id];
    }

    if (nextOpen.length > capacity) {
      flash('聊天区空间不足，先关闭一个店铺窗口');
      return;
    }

    setOpenIds(nextOpen);
    if (nextActive !== activeId) {
      setActiveId(nextActive);
      setLoaded((prev) => ({ ...prev, [id]: true }));
    } else {
      loadWindow(id);
    }
    flash(message);
  }

  function focusStore(id: string) {
    if (id === activeId) return;
    const previous = activeId;
    setActiveId(id);
    setOpenIds((prev) => promoteWindow(prev, id, previous));
    setLoaded((prev) => ({ ...prev, [previous]: true }));
    if (modalId === id) setModalId(null);
    setDraft('');
  }

  function selectThread(threadId: string) {
    setActiveThreadIds((prev) => ({ ...prev, [activeId]: threadId }));
    setDraft('');
  }

  function closeWindow(id: string) {
    const store = STORES.find((item) => item.id === id);
    setOpenIds((prev) => prev.filter((item) => item !== id));
    window.clearTimeout(timers.current[id]);
    setLoaded((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (modalId === id) setModalId(null);
    flash(`已关闭 ${store?.name ?? ''} 的窗口`);
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeThread) return;
    const storeId = activeId;
    const threadId = activeThread.id;
    setDraft('');
    appendMessage(storeId, threadId, { role: 'user', text });
    const timer = window.setTimeout(() => {
      appendMessage(storeId, threadId, {
        role: 'assistant',
        text: `已基于 ${active.name} 的商品、文件和历史对话继续分析。`,
      });
    }, 520);
    replyTimers.current.push(timer);
  }

  function sendFromModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = modalDraft.trim();
    if (!text || !modalStore || !modalThread) return;
    const storeId = modalStore.id;
    const threadId = modalThread.id;
    setModalDraft('');
    appendMessage(storeId, threadId, { role: 'user', text });
    const timer = window.setTimeout(() => {
      appendMessage(storeId, threadId, {
        role: 'assistant',
        text: `已基于 ${modalStore.name} 的商品和文件继续分析。`,
      });
    }, 480);
    replyTimers.current.push(timer);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (!overChat) setOverChat(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setOverChat(false);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    setOverChat(false);
    setDragging(null);
    if (id) openWindow(id);
  }

  return (
    <div className={dragging ? 'workspace is-dragging' : 'workspace'}>
      <aside className="rail">
        <div className="rail-head">
          <span>店铺</span>
          <span className="rail-count">
            {String(STORES.length).padStart(2, '0')}
          </span>
        </div>

        <div className="stores">
          {STORES.map((store) => (
            <div
              key={store.id}
              className={[
                'store',
                store.id === activeId ? 'is-active' : '',
                openIds.includes(store.id) ? 'is-open' : '',
                dragging === store.id ? 'is-dragging' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', store.id);
                event.dataTransfer.effectAllowed = 'copy';
                setDragging(store.id);
              }}
              onDragEnd={() => {
                setDragging(null);
                setOverChat(false);
              }}
            >
              <div
                className="store-main"
                role="button"
                tabIndex={0}
                title="拖到右侧开一扇店铺窗口"
                onClick={() => focusStore(store.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    focusStore(store.id);
                  }
                }}
              >
                <span className="store-initial" aria-hidden="true">
                  {store.initial}
                </span>
                <span className="store-label">{store.name}</span>
              </div>
              {!openIds.includes(store.id) && (
                <button
                  className="store-add"
                  type="button"
                  aria-label={`打开 ${store.name} 的店铺窗口`}
                  onClick={() => openWindow(store.id)}
                >
                  +
                </button>
              )}
            </div>
          ))}
        </div>

        <section className="history" aria-label="会话记录">
          <div className="history-head">
            <span>会话记录</span>
            <span>{String(historyThreads.length).padStart(2, '0')}</span>
          </div>
          <div className="history-list">
            {historyThreads.map((thread) => (
              <button
                key={thread.id}
                className={
                  thread.id === activeThread?.id
                    ? 'history-item is-active'
                    : 'history-item'
                }
                type="button"
                onClick={() => selectThread(thread.id)}
              >
                <span className="history-title">{thread.title}</span>
                <span className="history-meta">
                  {thread.updated} · {thread.messages.length} 条
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="rail-foot">
          <a className="back" href="/">
            ← 返回
          </a>
        </div>
      </aside>

      <section
        className={overChat ? 'chat is-over' : 'chat'}
        aria-label="当前店铺会话"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <header className="chat-head">
          <div className="chat-title">
            <h1 key={active.id}>{active.name}</h1>
            <p className="chat-thread">{activeThread?.title}</p>
          </div>
          <span className="chat-meta">
            {active.context.category} · {active.context.products} 商品
          </span>
        </header>

        <div className="messages" ref={messagesRef}>
          {activeMessages.map((message, index) => (
            <p
              key={`${activeId}-${activeThread?.id}-${index}`}
              className={`bubble ${message.role}`}
            >
              {message.text}
            </p>
          ))}
        </div>

        <section className="dock" aria-label="店铺窗口">
          <div className="dock-head">
            <span>店铺窗口</span>
            <span className="dock-count">
              {openIds.length} / {capacity}
            </span>
          </div>
          <div
            className="dock-grid"
            ref={gridRef}
            style={
              openIds.length
                ? ({
                    gridTemplateColumns: `repeat(${cols}, ${tileW}px)`,
                    gridTemplateRows: `repeat(${rows}, ${tileH}px)`,
                    gap: `${GAP}px`,
                  } satisfies CSSProperties)
                : undefined
            }
          >
            {openIds.length === 0 ? (
              <div className="dock-empty">
                把左侧店铺拖进来开一扇会话窗
              </div>
            ) : (
              openIds.map((id) => {
                const store = STORES.find((item) => item.id === id);
                if (!store) return null;
                const isLoaded = loaded[id] === true;
                const preview = (threadFor(id)?.messages ?? []).slice(-2);
                return (
                  <article
                    className={
                      modalId === id
                        ? 'mini-window is-open'
                        : 'mini-window'
                    }
                    key={id}
                    role="button"
                    tabIndex={0}
                    aria-label={`打开 ${store.name} 的店铺会话`}
                    onClick={() => {
                      setModalId(id);
                      setModalDraft('');
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.target !== event.currentTarget ||
                        (event.key !== 'Enter' && event.key !== ' ')
                      ) {
                        return;
                      }
                      event.preventDefault();
                      setModalId(id);
                      setModalDraft('');
                    }}
                  >
                    <div className="mini-head">
                      <span
                        className="mini-dot"
                        data-ready={String(isLoaded)}
                        aria-hidden="true"
                      />
                      <span className="mini-name">{store.name}</span>
                      <button
                        className="mini-close"
                        type="button"
                        aria-label={`关闭 ${store.name} 的窗口`}
                        onClick={(event) => {
                          event.stopPropagation();
                          closeWindow(id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div className="mini-body">
                      {isLoaded ? (
                        preview.map((message, index) => (
                          <p
                            key={`${id}-${index}`}
                            className={`mini-bubble ${message.role}`}
                          >
                            {message.text}
                          </p>
                        ))
                      ) : (
                        <>
                          <span className="mini-skeleton" />
                          <span className="mini-skeleton is-short" />
                        </>
                      )}
                    </div>
                    <div className="mini-foot">
                      {store.context.products} 商品 ·{' '}
                      {store.context.files} 文件
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <form className="composer" onSubmit={send}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="描述你要完成的营销任务"
            aria-label="输入消息"
          />
          <button type="submit">发送</button>
        </form>

        {notice ? (
          <div className="toast" role="status">
            {notice}
          </div>
        ) : null}

        {dragging ? (
          <div className={overChat ? 'drop-hint is-over' : 'drop-hint'}>
            {overChat ? '松开以打开店铺窗口' : '拖到会话区打开店铺窗口'}
          </div>
        ) : null}
      </section>

      {modalStore ? (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setModalId(null);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-modal-title"
          >
            <header className="modal-head">
              <div className="modal-identity">
                <span className="modal-initial" aria-hidden="true">
                  {modalStore.initial}
                </span>
                <div>
                  <h2 id="store-modal-title">{modalStore.name}</h2>
                  <p>
                    {modalStore.context.category} ·{' '}
                    {modalStore.context.products} 商品 ·{' '}
                    {modalStore.context.files} 文件
                  </p>
                </div>
              </div>
              <button
                className="modal-close"
                type="button"
                aria-label="关闭店铺会话"
                onClick={() => setModalId(null)}
                autoFocus
              >
                ×
              </button>
            </header>

            <div className="modal-resources">
              <span>{modalStore.context.products} 商品</span>
              <span>{modalStore.context.files} 文件</span>
              <span>{modalStore.context.category}</span>
            </div>

            <div className="modal-messages" ref={modalMessagesRef}>
              {modalMessages.map((message, index) => (
                <p
                  key={`${modalStore.id}-${modalThread?.id}-${index}`}
                  className={`bubble ${message.role}`}
                >
                  {message.text}
                </p>
              ))}
            </div>

            <form className="modal-composer" onSubmit={sendFromModal}>
              <input
                value={modalDraft}
                onChange={(event) => setModalDraft(event.target.value)}
                placeholder={`在 ${modalStore.name} 的会话里继续问…`}
                aria-label={`输入发往 ${modalStore.name} 的消息`}
              />
              <button type="submit">发送</button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
