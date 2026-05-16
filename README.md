# ByteOryx 邮箱管理器

ByteOryx Mail Manager 是一个用于批量管理 Outlook 邮箱账号的本地/内网管理平台，基于 Next.js App Router、Prisma、SQLite 和 Microsoft Graph API 构建。

当前版本适合单用户、本机或可信内网部署。开启 `Access Key` 后，管理界面和内部管理 API 都需要先登录；外部业务 API 使用独立的 `API Key` 调用。

## 功能概览

- 批量导入 Outlook 邮箱账号。
- 支持账号分组，默认分组为 `default`。
- 支持邮箱标签添加、移除、筛选和排除。
- 支持查看已同步邮件列表和邮件详情。
- 支持导出选中邮箱，格式与导入格式一致。
- 支持定时刷新 Access Token。
- 支持 Access Key 管理后台登录保护。
- 支持 API Key 调用外部接口获取邮箱和最新邮件。
- 邮箱密码、Access Token、Refresh Token 均使用 `APP_SECRET_KEY` 加密后写入 SQLite。

## 本地启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
copy .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

`.env` 示例：

```env
DATABASE_URL="file:./dev.db"
APP_SECRET_KEY="replace-with-at-least-32-random-bytes"
GRAPH_TENANT_ID="common"
GRAPH_SCOPES="https://graph.microsoft.com/Mail.Read offline_access"
```

`APP_SECRET_KEY` 必须稳定保存。它用于本地加密邮箱密码和 OAuth Token，一旦更换，旧数据将无法解密。

### 3. 初始化数据库

```bash
npx prisma generate
npx prisma db push
node scripts/ensure-default-group.js
```

Windows 如果执行 `npx prisma generate` 出现 `EPERM rename query_engine-windows.dll.node`，通常是 Next.js/Node 进程占用了 Prisma 引擎文件。请先停止开发服务，再重新执行。

### 4. 启动开发服务

```bash
npm run dev:local
```

访问：

```text
http://localhost:3000
```

## 平台使用

### 登录与安全设置

首次进入后点击顶部“设置”按钮：

- `Access Key`：用于登录管理后台。为空时不启用后台登录门禁。
- `API Key`：用于外部 API 调用。
- `开启定时刷新 Access Token`：开启后服务端会后台刷新 Access Token，并在微软返回新 Refresh Token 时自动保存。

`Access Key` 和 `API Key` 默认以密码方式显示，可点击眼睛按钮查看明文。`API Key` 可点击“随机生成 API Key”生成。

开启 `Access Key` 后：

- 访问首页需要输入 Access Key。
- 内部管理 API 未登录访问会返回 `401`。
- 修改 Access Key 后，旧登录会话失效，需要重新登录。

### 导入邮箱

点击顶部“导入”，可以上传 `.txt` 文件或直接粘贴邮箱信息。

默认格式为一行一个账号：

```text
email----password----clientId----refreshToken
```

默认分隔符为：

```text
----
```

导入时可以选择已有分组，也可以创建新分组。未指定时使用 `default`。

### 邮箱列表

邮箱列表支持：

- 按分组查看。
- 搜索邮箱地址。
- 查看同步状态。
- 查看 Access Token 过期时间。
- 批量添加/移除标签。
- 删除账号。
- 同步指定账号。
- 查看邮件列表和邮件详情。

### 导出邮箱

勾选邮箱账号后点击“导出”，可选择分隔符。

导出格式与导入一致：

```text
email----password----clientId----refreshToken
```

## API 调用

当前有两类 API：

- 内部管理 API：供前端管理后台使用，开启 Access Key 后需要登录 cookie。
- 外部业务 API：供程序调用，需要传递 `apiKey`。

以下示例中的 `API_KEY` 请替换为系统设置中配置的 API Key。

### 1. 获取一个邮箱

可按分组、标签筛选，也可排除某个标签。

```bash
curl "http://localhost:3000/api/external/mailbox?apiKey=API_KEY"
```

带分组：

```bash
curl "http://localhost:3000/api/external/mailbox?apiKey=API_KEY&group=default"
```

带标签：

```bash
curl "http://localhost:3000/api/external/mailbox?apiKey=API_KEY&tag=ready"
```

排除标签：

```bash
curl "http://localhost:3000/api/external/mailbox?apiKey=API_KEY&excludeTag=used"
```

组合筛选：

```bash
curl "http://localhost:3000/api/external/mailbox?apiKey=API_KEY&group=default&tag=ready&excludeTag=used"
```

响应示例：

```json
{
  "mailbox": {
    "email": "user@example.com",
    "group": "default",
    "tags": ["ready"]
  }
}
```

### 2. 获取指定邮箱最新一封邮件

```bash
curl "http://localhost:3000/api/external/latest-mail?apiKey=API_KEY&account=user@example.com"
```

该接口会返回最新一封邮件的元数据和正文内容。正文已缓存时直接返回缓存；未缓存时会通过 Microsoft Graph 拉取正文并写入缓存。

响应示例：

```json
{
  "email": {
    "message": {
      "graphId": "AQMk...",
      "subject": "Your Login Code",
      "fromAddress": "no-reply@example.com",
      "receivedAt": "2026-05-15T02:56:49.000Z",
      "hasAttachments": false,
      "isRead": true
    },
    "body": {
      "contentType": "html",
      "content": "<p>邮件正文内容</p>"
    }
  }
}
```

### 3. 给邮箱添加标签

```bash
curl -X POST "http://localhost:3000/api/external/tag" \
  -H "content-type: application/json" \
  -d "{\"apiKey\":\"API_KEY\",\"account\":\"user@example.com\",\"tag\":\"used\"}"
```

响应示例：

```json
{
  "ok": true
}
```

### API 错误码

- `401`：缺少 API Key、API Key 错误，或内部管理接口未登录。
- `400`：缺少必要参数。
- `404`：没有找到符合条件的邮箱或邮件。
- `500`：服务端异常。

## 生产部署：Node.js / VPS / 内网服务器

推荐优先使用 Node.js 方式部署，因为当前项目使用本地 SQLite 文件和常规 Prisma Client。

### 1. 准备环境

- Node.js 20+。
- 可持久化磁盘目录。
- 稳定保存 `.env`。
- 仅暴露到可信网络，或放到反向代理/VPN/内网网关后面。

### 2. 安装和构建

```bash
npm ci
npx prisma generate
npx prisma db push
node scripts/ensure-default-group.js
npm run build
```

### 3. 启动

```bash
npm run start
```

默认监听：

```text
http://localhost:3000
```

也可以使用 PM2：

```bash
npm install -g pm2
pm2 start npm --name byteoryx-mail-manager -- start
pm2 save
```

### 4. 反向代理建议

建议使用 Nginx、Caddy 或内网网关代理到 `localhost:3000`。

生产环境建议：

- 必须配置 `Access Key`。
- 必须配置强随机 `API Key`。
- 使用 HTTPS。
- 限制来源 IP 或放入 VPN。
- 定期备份 `prisma/dev.db`。
- 不要提交 `.env`、数据库文件或导出文件。

## Docker 部署

项目提供 `Dockerfile` 和 `docker-compose.yml`，适合在 VPS、NAS、内网服务器上部署。

### 1. 准备 `.env`

Docker Compose 会读取项目根目录的 `.env` 文件。至少需要配置：

```env
APP_SECRET_KEY="replace-with-at-least-32-random-bytes"
GRAPH_TENANT_ID="common"
GRAPH_SCOPES="https://graph.microsoft.com/Mail.Read offline_access"
```

注意：

- `APP_SECRET_KEY` 必须长期保持不变，否则已导入账号的加密密码和 Token 无法解密。
- `DATABASE_URL` 在 compose 中已设置为 `file:./dev.db`，通常不需要额外配置。
- SQLite 数据库存放在 Docker volume `byteoryx_prisma` 中，对应容器内 `/app/prisma/dev.db`。

### 2. 构建并启动

```bash
docker compose up -d --build
```

访问：

```text
http://localhost:3000
```

首次启动时，容器入口脚本会自动执行：

```bash
npx prisma generate
npx prisma db push
node scripts/ensure-default-group.js
```

### 3. 查看日志

```bash
docker compose logs -f
```

### 4. 停止服务

```bash
docker compose down
```

如果需要连同数据库卷一起删除：

```bash
docker compose down -v
```

删除卷会清空所有已导入邮箱、标签、邮件缓存和系统设置，请谨慎执行。

### 5. 备份 SQLite 数据库

数据库位于命名卷 `byteoryx_prisma`。可以用临时容器导出：

```bash
docker run --rm \
  -v byteoryx-mail-manager_byteoryx_prisma:/data \
  -v "$PWD:/backup" \
  busybox \
  cp /data/dev.db /backup/dev.db.backup
```

Windows PowerShell 可将 `$PWD` 改为当前目录变量：

```powershell
docker run --rm -v byteoryx-mail-manager_byteoryx_prisma:/data -v ${PWD}:/backup busybox cp /data/dev.db /backup/dev.db.backup
```

## Cloudflare Workers 部署说明

Cloudflare 官方当前推荐使用 OpenNext adapter 将 Next.js 部署到 Workers。相关文档：

- Cloudflare Next.js Workers 指南：https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs/
- OpenNext Cloudflare 文档：https://opennext.js.org/cloudflare
- Prisma + Cloudflare D1 文档：https://docs.prisma.io/docs/v6/orm/overview/databases/cloudflare-d1

重要限制：本项目当前不能原样直接部署到 Cloudflare Workers。

原因：

- 当前数据库是本地 SQLite 文件：`DATABASE_URL="file:./dev.db"`。
- Workers 运行环境没有传统长期可写本地文件系统。
- 当前 Prisma Client 使用 Node/本地数据库模式，更适合 Node.js 服务器。
- 当前进程内定时刷新依赖服务进程常驻；Workers 更适合用 Cron Triggers 或 Queues。

如果要部署到 Cloudflare Workers，需要先做以下改造：

1. 将数据库从本地 SQLite 文件迁移到 Cloudflare D1，或改为外部数据库。
2. 将 Prisma 接入 D1 adapter，例如 `@prisma/adapter-d1`。Prisma 对 D1 的支持仍有 Preview 特性和事务限制，请按官方文档评估。
3. 将 `prisma` 初始化改为使用 Workers binding。
4. 将 `.env` 中的本地数据库配置改为 Cloudflare bindings/secrets。
5. 将定时刷新 Access Token 从进程内 timer 改为 Cloudflare Cron Triggers。
6. 使用 OpenNext adapter 构建和部署 Next.js。

### Workers 迁移后的参考步骤

以下步骤仅适用于完成 D1/数据层改造后的版本。

安装 Cloudflare/OpenNext 相关依赖：

```bash
npm install -D wrangler @opennextjs/cloudflare
```

创建或更新 `wrangler.jsonc`：

```jsonc
{
  "name": "byteoryx-mail-manager",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-05-16",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "byteoryx-mail-manager",
      "database_id": "YOUR_D1_DATABASE_ID"
    }
  ]
}
```

设置 Cloudflare secret：

```bash
npx wrangler secret put APP_SECRET_KEY
npx wrangler secret put GRAPH_TENANT_ID
npx wrangler secret put GRAPH_SCOPES
```

构建 OpenNext 输出：

```bash
npx @opennextjs/cloudflare
```

本地预览 Workers 运行时：

```bash
npx wrangler dev
```

部署：

```bash
npx wrangler deploy
```

也可以按 Cloudflare 文档使用 `wrangler deploy` 的自动配置能力，但本项目涉及数据库和定时任务，建议显式维护 `wrangler.jsonc`。

## 定时刷新 Access Token

在系统设置中开启“定时刷新 Access Token”后：

- 保存设置会立即返回，不会等待所有账号刷新完成。
- 刷新任务在后台运行。
- 后续按最早的 Access Token 过期时间提前 10 分钟刷新。
- 如果微软返回新的 Refresh Token，系统会自动保存。

Node.js 部署下使用进程内定时器。服务重启后请进入设置确认刷新开关，或在后续版本中迁移为独立 Worker/Queue。

Cloudflare Workers 部署时应改用 Cron Triggers，不应依赖进程内 timer。

## 安全说明

已开启 Access Key 时：

- 管理页面需要 Access Key。
- 内部管理 API 未登录返回 `401`。
- 外部业务 API 必须提供 API Key。

仍建议：

- 仅部署在本机、可信内网或 VPN 后。
- 使用 HTTPS。
- 使用强随机 Access Key 和 API Key。
- 不要把 API Key 放到公开前端页面。
- 不要把 `.env`、SQLite 数据库、导出文件提交到代码仓库。
- 定期备份数据库。

## 常用命令

```bash
npm run dev:local
npm test
npm run build
npm run start
npx prisma generate
npx prisma db push
node scripts/ensure-default-group.js
```
