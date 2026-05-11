# 信息批量获取工具

批量获取图文信息（标题、作者、点赞、收藏、评论、分享、发布时间等），支持 SSE 实时进度推送和 CSV 导出。

## 快速开始

```bash
# 克隆项目
git clone <repo-url> && cd info_collect

# 安装依赖
npm install

# 启动（前端 + 后端同时启动）
npm run dev
```

前端访问 http://localhost:5188，后端端口默认 6789（在 `ecosystem.config.js` 中配置）。

启动后需要先导入请求头和 Cookie 才能使用，详见 [使用流程](#使用流程)。

## 功能特性

- **批量解析** — 支持同时提交多个链接，逐条处理并实时返回结果
- **SSE 实时推送** — 通过 Server-Sent Events 逐条推送进度和结果，无需轮询
- **多格式链接** — 支持短链接、完整链接、纯图文 ID
- **智能反爬** — 随机延迟、动态 referer、多请求头轮换、多 Cookie 轮换
- **curl 一键导入** — 从浏览器 DevTools 复制 curl，自动提取请求头和 Cookie
- **CSV 导出** — 筛选后一键导出 CSV 文件
- **站点可配** — 支持切换不同站点域名，适配多种平台
- **PM2 部署** — 内置 PM2 配置，一键构建部署

## 项目架构

```
info_collect/
├── client/                     # 前端 (Vue 3 + Element Plus)
│   ├── index.html
│   ├── vite.config.js          # Vite 配置（代理、构建输出、端口读取）
│   └── src/
│       ├── main.js             # 入口，Element Plus 中文配置
│       ├── App.vue             # 主布局，SSE 进度管理
│       ├── api/
│       │   └── index.js        # API 请求封装（fetch + SSE）
│       ├── components/
│       │   ├── UrlInput.vue    # 链接输入、进度条展示
│       │   ├── ResultTable.vue # 结果表格、筛选、分页、CSV 导出
│       │   ├── CookieManager.vue # Cookie 导入/删除/清空
│       │   └── HeadersManager.vue # 请求头配置、站点标识、curl 导入
│       └── styles/
│           └── main.scss       # 全局样式
│
├── server/                     # 后端 (Express.js)
│   ├── index.js                # 服务入口，静态文件托管
│   ├── routes.js               # API 路由（Cookie、Headers、解析）
│   ├── config.js               # 请求头配置、站点配置管理
│   ├── cookies.js              # Cookie 文件读写、随机获取
│   └── parser.js               # 图文信息解析（URL 提取、HTML 解析）
│
├── dist/                       # 前端构建产物（npm run build 生成）
├── ecosystem.config.js         # PM2 配置（含端口 PORT、进程管理）
├── build.sh                    # 构建脚本（前端构建 + 代码混淆 + 打包）
├── package.json
├── .headers.json               # 请求头配置（自动生成）
├── .cookies.json               # Cookie 存储（自动生成）
└── .site.json                  # 站点标识配置（自动生成）
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API) |
| UI 组件库 | Element Plus |
| 构建工具 | Vite 4 |
| 样式 | SCSS |
| 后端框架 | Express.js 4 |
| HTTP 请求 | node-fetch（兼容 Node 16） |
| 实时通信 | SSE (Server-Sent Events) |
| 进程管理 | PM2 |

### 数据流

```
用户输入 URL → 前端发送 /api/parse-stream
    → 服务端逐条处理（3-8 秒随机延迟）
    → SSE 实时推送每条结果
    → 前端逐条显示 + 进度更新
```

### 核心模块说明

**server/config.js** — 配置中心
- `getDefaultHeaders()` — 生成模拟浏览器的默认请求头
- `getRandomHeaders()` — 从多套配置中随机选取一套
- `getRequestHeaders(cookie)` — 合并请求头与 Cookie
- `loadHeaders()` / `addHeaders()` — 请求头持久化（`.headers.json`）
- `importCurl()` — 解析 curl 命令提取请求头和 Cookie
- `loadSiteConfig()` / `saveSiteConfig()` — 站点标识管理（`.site.json`）

**server/parser.js** — 图文信息解析器
- `extractNoteId()` — 从 URL 提取图文信息 ID（支持短链接、完整链接、纯 ID）
- `parseInitialState()` — 从 HTML 提取 `window.__INITIAL_STATE__` 数据
- `extractNoteData()` — 从状态对象提取图文信息详情
- `fetchNoteInfo()` — 完整获取流程（短链跳转 → 请求页面 → 解析数据）

**server/cookies.js** — Cookie 管理
- `loadCookies()` / `saveCookies()` — Cookie 文件读写
- `getRandomCookie()` — 随机获取一个 Cookie 字符串

**server/routes.js** — API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/cookies` | 获取所有 Cookie |
| POST | `/api/import-cookies` | 导入 Cookie 字符串 |
| DELETE | `/api/cookies/:index` | 删除指定 Cookie |
| POST | `/api/clear-cookies` | 清空所有 Cookie |
| GET | `/api/login-status` | 检查登录状态 |
| GET | `/api/headers` | 获取请求头配置列表 |
| PUT | `/api/headers` | 更新请求头 |
| DELETE | `/api/headers/:index` | 删除指定请求头 |
| POST | `/api/headers/reset` | 重置为默认请求头 |
| POST | `/api/headers/import-curl` | 从 curl 导入请求头和 Cookie |
| GET | `/api/site-config` | 获取站点配置 |
| PUT | `/api/site-config` | 更新站点标识 |
| POST | `/api/parse` | 批量解析（非流式） |
| POST | `/api/parse-stream` | 批量解析（SSE 流式） |

## 操作手册

### 环境要求

- Node.js: 16.x（推荐 16.20.2）
- npm: 8.x

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务（Express + Vite 热更新）
npm run dev
```

前端访问 http://localhost:5188，后端端口由 `ecosystem.config.js` 的 `PORT` 配置（默认 6789）。

### 生产部署

```bash
# 一键构建 + PM2 启动
npm run deploy
```

访问 http://localhost:6789

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式（热更新） |
| `npm run build` | 构建前端 + 代码混淆 + 打包 |
| `npm start` | 直接启动服务（不用 PM2） |
| `npm run deploy` | 构建 + PM2 启动 |
| `npm run restart` | PM2 重启 |
| `pm2 logs info-collect` | 查看日志 |
| `pm2 stop info-collect` | 停止服务 |
| `pm2 delete info-collect` | 删除进程 |

## 使用流程

### 1. 导入请求头和 Cookie（推荐 curl 一键导入）

这是最关键的一步，决定了请求能否成功。

1. 在目标网站登录账号
2. 打开浏览器 DevTools → Network → 随便点一个页面请求
3. 右键请求 → Copy as cURL
4. 点击「请求配置」→ 粘贴 curl → 导入

导入后会自动：
- 提取请求头（User-Agent、Accept、sec-fetch-* 等）保存到 `.headers.json`
- 提取 Cookie 保存到 `.cookies.json`

> **提示**：可多次导入不同浏览器或不同账号的 curl，实现多指纹轮换，降低被封风险。

### 2. 单独导入 Cookie（可选）

如果只想更新 Cookie，不修改请求头：
- 浏览器登录 → DevTools → Application → Cookies → 复制完整 Cookie 字符串
- 点击「Cookie 管理」→ 粘贴 → 导入

### 3. 设置站点标识（可选）

- 「请求配置」→「手动编辑」→ 站点标识
- 默认站点标识，修改后所有请求自动适配新站点域名

### 4. 获取图文信息

- 在输入框粘贴图文信息链接（每行一个，支持批量）
- 支持格式：短链接、完整链接、纯图文信息 ID
- 点击「获取信息」，实时显示进度和结果

### 5. 筛选与导出

- 按作者模糊搜索
- 按发布时间范围筛选
- 超过 10 条自动分页
- 点击「导出 CSV」下载数据

## 配置文件说明

| 文件 | 用途 | 生成方式 |
|------|------|---------|
| `ecosystem.config.js` | PM2 配置、端口号（`PORT`） | 手动维护 |
| `.headers.json` | 请求头配置列表 | 导入 curl 或手动编辑 |
| `.cookies.json` | Cookie 列表 | 导入 curl 或手动导入 |
| `.site.json` | 站点标识 | 前端「请求配置」中修改 |

### 端口配置

所有端口统一在 `ecosystem.config.js` 的 `PORT` 字段管理：

```javascript
// ecosystem.config.js
env: {
  PORT: 6789,  // 修改此值即可切换端口
}
```

修改后重启服务生效。前端开发端口（5188）在 `client/vite.config.js` 中配置。

### 请求头与 Cookie 机制

**请求头（Headers）**：存储在 `.headers.json`，支持导入多套配置，每次请求随机选取一套，与默认请求头合并后使用。

**Cookie**：存储在 `.cookies.json`，支持导入多个，每次请求随机选取一个，与请求头组合后发送。

```
请求时: getRandomHeaders() + getRandomCookie() + referer(目标URL) → 最终请求头
```

导入 curl 命令时会自动提取请求头和 Cookie，分别保存。可多次导入不同浏览器/账号的 curl 实现多指纹轮换。

## 支持的链接格式

| 格式 | 示例 |
|------|------|
| 短链接 | `https://短链域名/xxxx` |
| 完整链接 | `https://www.站点.com/explore/69f60fb4000000003501dfe5` |
| discovery 链接 | `https://www.站点.com/discovery/item/69f60fb4000000003501dfe5` |
| note 链接 | `https://www.站点.com/note/69f60fb4000000003501dfe5` |
| 纯 ID | `69f60fb4000000003501dfe5`（24 位十六进制） |

链接中可包含查询参数（如 `xsec_token`、`xsec_source`），会自动处理。

## CSV 导出字段

| 字段 | 说明 |
|------|------|
| noteId | 图文信息 ID |
| title | 标题 |
| desc | 描述（截取前 200 字） |
| author | 作者昵称 |
| userId | 作者 ID |
| likedCount | 点赞数 |
| collectedCount | 收藏数 |
| commentCount | 评论数 |
| shareCount | 分享数 |
| type | 类型（图文/视频） |
| time | 发布时间 |
| currentTime | 抓取时间 |
| lastUpdateTime | 最后更新时间 |
| url | 原始链接 |

## 反爬策略

- **随机延迟**：每次请求间隔 3-8 秒
- **动态 referer**：自动指向目标图文信息 URL，不使用固定值
- **多请求头轮换**：导入多套 curl 配置后，每次请求随机选取
- **多 Cookie 轮换**：导入多个 Cookie 后，每次请求随机选取
- **完整浏览器指纹**：sec-fetch-*、accept、accept-language 等完整请求头
- **请求头合并**：自定义配置与默认浏览器指纹合并，确保不缺关键字段

## 常见问题

### Cookie 已失效 / Cookie 已过期

- Cookie 有有效期，过期后需要重新从浏览器获取
- 推荐通过 curl 导入，同时更新请求头和 Cookie
- 确保 Cookie 来源的浏览器与请求头中的 User-Agent 一致

### 请求被拦截 / 返回内容为空

- 检查 Cookie 是否有效
- 检查请求头是否完整（建议从浏览器重新导出 curl）
- 适当增加请求间隔

### 端口被占用

```bash
# 查看占用端口的进程
lsof -i:6789

# 杀掉进程后重启
kill -9 <PID> && npm run dev
```

### npm install 报错（权限问题）

```bash
# 使用临时 cache 目录绕过权限问题
npm install --cache /tmp/npm-cache
```

### 短链接解析失败

- 短链接可能已过期
- 确保网络可以访问目标网站
- 检查 User-Agent 是否正确（短链接跳转需要浏览器 UA）

## 打包部署

端口统一在 `ecosystem.config.js` 的 `PORT` 字段配置，修改后重启即可生效。

```bash
# 生成部署包
npm run build

# 打包（含构建产物 + 服务端代码 + 配置文件）
zip -r dist.zip dist/ server/ package.json ecosystem.config.js
```

上传到服务器后：
```bash
unzip dist.zip -d info-collect
cd info-collect
npm install --production
pm2 start ecosystem.config.js
```
