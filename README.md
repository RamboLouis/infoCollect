# 信息批量获取工具

批量获取信息（标题、作者、点赞、收藏、评论、分享、发布时间等），支持导出 CSV。

## 项目架构

```
info_collect/
├── client/                     # 前端 (Vue 3 + Element Plus)
│   ├── index.html
│   ├── vite.config.js          # Vite 配置（代理、构建输出）
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
├── ecosystem.config.js         # PM2 生产部署配置
├── package.json
├── .headers.json               # 请求头配置（自动生成）
├── .cookies.json               # Cookie 存储（自动生成）
└── .site.json                  # 站点标识配置（自动生成）
```

### 技术栈

|  层级  | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API) |
| UI 组件库 | Element Plus |
| 构建工具 | Vite 5 |
| 样式 | SCSS |
| 后端框架 | Express.js 4 |
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

**server/config.js** - 配置中心
- `getDefaultHeaders()` - 生成模拟浏览器的默认请求头
- `loadHeaders()` / `saveHeaders()` - 请求头持久化（`.headers.json`）
- `loadSiteConfig()` / `saveSiteConfig()` - 站点标识管理（`.site.json`）
- `importCurl()` - 解析 curl 命令提取请求头和 Cookie

**server/parser.js** - 图文信息解析器
- `extractNoteId()` - 从 URL 提取图文信息 ID（支持短链接、完整链接、纯 ID）
- `parseInitialState()` - 从 HTML 提取 `window.__INITIAL_STATE__` 数据
- `extractNoteData()` - 从状态对象提取图文信息详情
- `fetchNoteInfo()` - 完整获取流程（短链跳转 → 请求页面 → 解析数据）

**server/routes.js** - API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/cookies` | 获取所有 Cookie |
| POST | `/api/import-cookies` | 导入 Cookie |
| DELETE | `/api/cookies/:index` | 删除指定 Cookie |
| POST | `/api/clear-cookies` | 清空所有 Cookie |
| GET | `/api/login-status` | 检查登录状态 |
| GET | `/api/headers` | 获取请求头配置 |
| PUT | `/api/headers` | 更新请求头 |
| POST | `/api/headers/reset` | 重置请求头 |
| POST | `/api/headers/import-curl` | 从 curl 导入配置 |
| GET | `/api/site-config` | 获取站点配置 |
| PUT | `/api/site-config` | 更新站点标识 |
| POST | `/api/parse` | 批量解析（非流式） |
| POST | `/api/parse-stream` | 批量解析（SSE 流式） |

## 操作手册

### 环境要求

- Node.js >= 18
- npm >= 8

### 开发模式

```bash
# 安装依赖
npm install
cd client && npm install && cd ..

# 启动开发服务（Express + Vite 热更新）
npm run dev
```

访问 http://localhost:5173

### 生产部署

```bash
# 一键构建 + PM2 启动
npm run deploy
```

访问 http://localhost:3000

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式（热更新） |
| `npm run build` | 构建前端 |
| `npm start` | 直接启动服务（不用 PM2） |
| `npm run deploy` | 构建 + PM2 启动 |
| `npm run restart` | PM2 重启 |
| `pm2 logs info-collect` | 查看日志 |
| `pm2 stop info-collect` | 停止服务 |
| `pm2 delete info-collect` | 删除进程 |

### 使用流程

1. **导入 Cookie**
   - 浏览器登录 → DevTools → Application → Cookies → 复制完整 Cookie 字符串
   - 点击「Cookie 管理」→ 粘贴 → 导入
   - 或通过「请求配置」→ 导入 curl（自动提取 Cookie）

2. **配置请求头**（可选）
   - 点击「请求配置」
   - 方式一：从浏览器 DevTools 复制 curl → 粘贴导入
   - 方式二：在「手动编辑」标签页逐项修改

3. **设置站点标识**（可选）
   - 「请求配置」→「手动编辑」→ 站点标识
   - 默认 `xiaohongshu`，修改后所有请求自动适配新站点域名

4. **获取图文信息信息**
   - 在输入框粘贴图文信息链接（每行一个，支持批量）
   - 支持格式：短链接、完整链接、纯图文信息 ID
   - 点击「获取信息」，实时显示进度和结果

5. **筛选与导出**
   - 按作者模糊搜索
   - 按发布时间范围筛选
   - 超过 10 条自动分页
   - 点击「导出 CSV」下载数据

### 反爬策略

- 每次请求间隔 3-8 秒随机延迟
- 动态 referer（指向目标图文信息 URL）
- 完整浏览器指纹请求头（sec-ch-ua、sec-fetch-*）
- Cookie 随机轮换（多账号时）

### 打包部署文件

```bash
# 生成部署包
npm run build
zip -r dist.zip dist/ server/ package.json ecosystem.config.js
```

上传到服务器后：
```bash
unzip dist.zip -d info-collect
cd info-collect
npm install --production
pm2 start ecosystem.config.js
```
