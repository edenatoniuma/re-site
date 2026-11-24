import FlowCanvas from './FlowCanvas';
import '../../styles/demos/harness-canvas.css';

function Step({ title, text }: { title: string; text: string }) {
  return <div className="hc-step"><strong>{title}</strong><span>{text}</span></div>;
}
const down = <div className="hc-arrow" aria-hidden="true">↓</div>;
const frames = [
  { title: '上下文压缩', color: '#526c59', x: 0, y: 0, w: 570, h: 840, content: <>
    <p>前台远程压缩 · 默认在模型窗口用到 90% 时触发</p>
    <Step title="工具结果按输出预算限长" text="每次调用可指定预算或沿用默认值，超限内容截断后写入历史。" />{down}
    <Step title="890k ≥ 800k，触发压缩" text="示例窗口 1M，阈值设为 800k。890k 是工具结果写入后的上下文估算用量。" />{down}
    <div className="hc-pair"><Step title="整段活跃历史生成摘要" text="摘要长度随内容变化。" /><Step title="选取合格原文" text="优先保留较新的用户消息，常规预算 64k。" /></div>{down}
    <Step title="下一次模型调用" text="摘要与保留下来的原文一起进入新窗口。" />
    <h3>五个结果怎样计入预算？</h3><p>五次独立调用各设 500 tokens，若都超限，返回正文合计约 2,500 tokens，调用记录和格式另计。在一次 functions.exec 中汇总五个结果，若外层预算为 500 tokens，返回的正文共用这 500 tokens。</p>
    <a href="/demos/codex-compaction/explanation.png" aria-label="查看压缩说明原图"><img draggable={false} src="/demos/codex-compaction/explanation.png" alt="上下文压缩说明原图" width="1902" height="298" /></a>
  </> },
  { title: '工具加载', color: '#4472a0', x: 600, y: 0, w: 690, h: 345, content: <>
    <Step title="按暴露策略提供工具定义" text="工具名称、说明和参数决定模型看到的调用方式。" />{down}
    <div className="hc-pair"><Step title="直接暴露" text="第一次请求即可调用，例如用 exec_command 执行 rg。" /><Step title="延迟暴露" text="需要时通过 tool_search 发现。直接调用路径将定义写进搜索结果，后续轮次可复用。" /></div>
  </> },
  { title: '跨压缩保留工具', color: '#9165a0', x: 600, y: 375, w: 690, h: 465, content: <><table>
        <caption>压缩后，模型还记得怎么调用工具吗？</caption>
        <thead>
          <tr><th scope="col">场景</th><th scope="col">Codex 直接调用 tool_search</th><th scope="col">保存并恢复工具激活状态</th></tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">发现工具时</th>
            <td>把名称、说明和参数随搜索结果追加到会话历史。</td>
            <td>追加工具声明，同时记录当前会话分支激活了哪些工具。</td>
          </tr>
          <tr>
            <th scope="row">压缩后继续调试</th>
            <td>如果搜索结果被压掉，再搜一次就能拿到调试工具的用法。</td>
            <td>根据激活记录重建声明。即使搜索过程只剩摘要，模型也能直接调用调试工具。</td>
          </tr>
          <tr>
            <th scope="row">从调试转去聊日常</th>
            <td>压缩移除旧搜索结果后，日常对话无需再携带这份工具定义。</td>
            <td>如果恢复全部已激活工具，旧调试工具的声明仍占用新窗口。任务切换越多，无关声明越可能积累。</td>
          </tr>
        </tbody>
      </table></> },
  { title: '侧栏会话之间的沟通', color: '#bd7143', x: 1320, y: 0, w: 690, h: 520, content: <>
    <Step title="会话 A 找到已有会话 B" text="用 list_threads 找到目标线程；需要了解前情时，用 read_thread 读取 B 的消息。" />{down}
    <Step title="A 向 B 发起一轮分析" text="send_message_to_thread 按线程 ID 把任务发给 B，同时附上 A 的线程 ID。" />{down}
    <Step title="B 在自己的会话里处理" text="客户端恢复 B 并在后台发起 turn。B 沿用自己的历史，用户可以留在 A。" />{down}
    <Step title="A 取回结果，继续讨论" text="A 可用 wait_threads 等待，再用 read_thread 查看 B 的答复。还有反例或新条件时，可以继续发给同一个 B。" />
  </> },
  { title: '执行循环', color: '#517b73', x: 1320, y: 550, w: 690, h: 290, content: <>
    <Step title="一条新任务启动一次 run" text="模型读取当前输入，决定下一步。" />{down}
    <div className="hc-pair"><Step title="请求工具 → 继续循环" text="Harness 执行工具，把结果写入历史，再调用模型。" /><Step title="给出最终答复 → 结束本轮" text="会话历史保留；下一条任务可以再启动一次 run。" /></div>
  </> },
];
export default function HarnessCanvas() {
  return <FlowCanvas title="Codex Harness 工作机制" frames={frames.map(frame => ({
    ...frame, content: <div className="hc-content">{frame.content}</div>,
  }))} />;
}
