# NewAPI Auto Checkin

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sulinwork/newapi-checkin-task)

一个部署在 Cloudflare Workers 上的自动化签到脚本，支持多站点 New API 平台每日自动签到，支持多种消息推送通知。

## 功能特性

- ✅ **自动签到**：每天定时自动执行签到任务
- 🌐 **多站点支持**：可同时配置多个 New API 站点
- 📱 **消息推送**：支持飞书机器人Hook
- 🔒 **安全可靠**：敏感信息使用 Cloudflare Secrets 加密存储
- 🚀 **零成本部署**：完全基于 Cloudflare 免费套餐
- 🛠️ **TypeScript**：使用 TypeScript 编写，类型安全

## 快速开始

### 1. 准备工作

- [Node.js](https://nodejs.org/) 20+ 环境
- [Cloudflare](https://dash.cloudflare.com) 账号
- New API 站点的 Session Cookie 和 UserId

### 2. 安装依赖

```bash
# 克隆项目
git clone https://github.com/sulinwork/newapi-checkin-task.git
cd newapi-checkin-task

# 安装依赖
npm install

# 安装 Wrangler CLI 并登录
npm install -g wrangler
wrangler login
```

### 3. 配置环境变量

#### 获取 New API 凭证

1. 登录你的 New API 站点（如 https://api.example.com）
2. 按 F12 打开浏览器开发者工具
3. **获取 Session**：
	- Application > Cookies > 站点域名
	- 复制 `session` 字段的 Value
4. **获取 UserId**：
	- Application > Local Storage > 站点域名
	- 找到 `user` 键，复制 `id` 字段的值

#### 配置 Secrets
你去Cloudflare后台配置也是一样的效果
```bash
# 站点配置（JSON 格式）
echo '[{"name":"站点名称","url":"https://api.example.com","session":"your_session","userId":"12345"}]' | wrangler secret put NEW_API_CONFIG

# 可选：飞书通知
echo 'bot_key' | wrangler secret put  FEI_SHU_BOT_KEY

#可选 是否开启HTTP触发任务的能力
echo 'true' | wrangler secret put ENABLE_HTTP_TRIGGER

```

### 4. 部署

```bash
# 开发模式（本地测试）
npm run dev
# 或
wrangler dev

# 部署到生产环境
npm run deploy
# 或
wrangler deploy
```

部署成功后会显示 Worker URL，例如：
```
https://newapi-checkin-task.your-account.workers.dev
```

## 配置说明

### wrangler.jsonc

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "newapi-checkin-task",
  "main": "src/index.ts",
  "compatibility_date": "2025-04-17",

  // 定时触发：每天北京时间 09:00 (UTC 01:00)
  "triggers": {
    "crons": ["0 1 * * *"]
  }
}
```

### NEW_API_CONFIG 格式

支持多站点配置：

```json
[
  {
    "name": "站点A",
    "url": "https://api1.example.com",
    "session": "eyJhbGciOiJIUzI1NiIs...",
    "userId": "12345"
  },
  {
    "name": "站点B",
    "url": "https://api2.example.com",
    "session": "eyJhbGciOiJIUzI1NiIs...",
    "userId": "67890"
  }
]
```

## 使用指南

### 手动触发签到

访问 Worker URL 即可手动触发：

```bash
curl https://newapi-checkin-task.your-account.workers.dev/
```

或在浏览器中直接打开该链接。

### 查看日志

```bash
# 实时查看日志（需要代理）
wrangler tail
```

或登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → 你的 Worker → Logs

### 自定义域名（可选）

在 `wrangler.jsonc` 中添加：

```jsonc
{
  "routes": [
    {
      "pattern": "checkin.yourdomain.com/*",
      "zone_name": "yourdomain.com"
    }
  ]
}
```

或在 Dashboard 中设置：Workers → 你的 Worker → Settings → Triggers → Custom Domains

## 项目结构

```
newapi-checkin/
├── src/
│   └── index.ts          # 主入口文件
├── test/
│   └── index.spec.ts     # 测试文件（可选）
├── wrangler.jsonc        # Wrangler 配置文件
├── package.json          # 项目依赖
├── tsconfig.json         # TypeScript 配置
└── README.md             # 本文件
```

## 常见问题

### Q: Session 过期怎么办？

A: Session 通常有效期为 7-30 天，过期后需要重新从浏览器获取并更新：

```bash
echo '[{"name":"站点名称","url":"https://api.example.com","session":"新session","userId":"12345"}]' | wrangler secret put NEW_API_CONFIG
```

### Q: 如何修改定时时间？

A: 修改 `wrangler.jsonc` 中的 `crons` 表达式：

| 时间 | Cron 表达式 |
|------|-------------|
| 每天 09:00 (北京时间) | `0 1 * * *` |
| 每天 06:00 (北京时间) | `0 22 * * *` |
| 每小时执行 | `0 * * * *` |

### Q: 支持哪些推送方式？

A: 目前支持：
- 飞书群机器人

可自行扩展其他推送渠道。

### Q: 本地开发时如何配置环境变量？

A: 创建 `.dev.vars` 文件：

```bash
NEW_API_CONFIG=[{"name":"测试","url":"https://api.example.com","session":"test","userId":"123"}]
FEI_SHU_BOT_KEY=your_token
```

## 技术栈

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [TypeScript](https://www.typescriptlang.org/)

## 许可证

[MIT](LICENSE)

## 免责声明

本项目仅供学习交流使用，请遵守相关平台的服务条款。使用本项目产生的任何后果由使用者自行承担。

---

如果这个项目对你有帮助，欢迎点个 ⭐ Star！
