# RAISE EXCEPTION

把遇到的好前端设计拆开、重写成可交互的 demo，集中展示。
Astro 静态站点，部署在 Cloudflare Workers（静态资源托管）。

线上地址：https://raise-exception-site.fch1635027539.workers.dev

## 结构

```text
src/pages/demos/<slug>.astro     React demo 页面（新 demo 走这里）
src/components/demos/*.tsx       React demo 组件
src/styles/demos/*.css           demo 样式
src/data/                        demo 用到的数据（地图边界等）
public/demos/<slug>/index.html   早期静态 demo（纯 HTML/CSS/JS）
src/content/demos/<slug>.md      画廊条目：标题、年份、标签、备注
src/pages/index.astro            画廊首页（网格 + 标签筛选）
src/styles/global.css            设计变量与画廊样式
wrangler.jsonc                   Cloudflare 部署配置，指向 dist/
```

新建 demo 一律用 React：组件写 `src/components/demos/`，页面用 `src/pages/demos/<slug>.astro` 包一层 `DemoLayout` + `client:load`。URL 仍是 `/demos/<slug>/`，画廊 iframe 不用改。

画廊卡片里的缩略图是 `/demos/<slug>/` 的实时 iframe，不是截图 —— demo 改了，缩略图自动跟着变。

## 新增一个收藏

1. 写组件 `src/components/demos/MyDemo.tsx`，样式放 `src/styles/demos/my-demo.css` 并在组件里 import。
2. 建页面 `src/pages/demos/my-demo.astro`：
   ```astro
   ---
   import DemoLayout from '../../layouts/DemoLayout.astro';
   import MyDemo from '../../components/demos/MyDemo.tsx';
   ---
   <DemoLayout title="我的收藏">
     <MyDemo client:load />
   </DemoLayout>
   ```
3. 在 `src/content/demos/` 下加条目：
   ```md
   ---
   title: 我的收藏
   year: 2026
   tags: [React, 交互]
   order: 6
   ---
   ```
4. 上线：`git push`（或 `npm run deploy`）。

URL 和条目 slug 必须一致：`/demos/my-demo/`。

标签会自动出现在首页筛选栏，不用改代码。

## 命令

| 命令              | 作用                              |
| :---------------- | :-------------------------------- |
| `npm run dev`     | 本地开发 `localhost:4321`         |
| `npm run build`   | 构建到 `dist/`                    |
| `npm run deploy`  | 本地构建并手动发布到 Cloudflare   |

推送到 `main` 会由 Cloudflare Workers Builds 自动构建部署；`npm run deploy` 仍然可以手动发布。
