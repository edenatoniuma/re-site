# RAISE EXCEPTION

把遇到的好前端设计拆开、重写成可交互的 demo，集中展示。
Astro 静态站点，部署在 Cloudflare Workers（静态资源托管）。

线上地址：https://raise-exception-site.fch1635027539.workers.dev

## 结构

```text
public/demos/<slug>/index.html   每个 demo 的完整页面（HTML/CSS/JS 自包含）
src/content/demos/<slug>.md      画廊条目：标题、年份、标签、备注
src/pages/index.astro            画廊首页（网格 + 标签筛选）
src/styles/global.css            设计变量与画廊样式
wrangler.jsonc                   Cloudflare 部署配置，指向 dist/
```

画廊卡片里的缩略图是 `/demos/<slug>/` 的实时 iframe，不是截图 —— demo 改了，缩略图自动跟着变。

## 新增一个收藏

1. 在 `public/demos/` 下建目录，放入自包含的 `index.html`（可带 CSS/JS/图片资源，互不干扰）：
   ```text
   public/demos/my-demo/index.html
   ```
2. 在 `src/content/demos/` 下加同名条目：
   ```md
   ---
   title: 我的收藏
   year: 2026
   tags: [Canvas, 交互]
   order: 4
   ---
   ```
3. 上线：
   ```sh
   npm run deploy
   ```

标签会自动出现在首页筛选栏，不用改代码。

## 命令

| 命令              | 作用                              |
| :---------------- | :-------------------------------- |
| `npm run dev`     | 本地开发 `localhost:4321`         |
| `npm run build`   | 构建到 `dist/`                    |
| `npm run deploy`  | 本地构建并手动发布到 Cloudflare   |

推送到 `main` 会由 Cloudflare Workers Builds 自动构建部署；`npm run deploy` 仍然可以手动发布。
