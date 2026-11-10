# Green Network

基于 Vercel Serverless Function 的轻量服务，提供 Green Network 首页、健康检查接口，并可通过 UptimeRobot 自动创建服务监控。

## 功能

- `/`：展示 Green Network 首页；如果启用了自动监控，会在返回页面后尝试初始化 UptimeRobot 监控。
- `/<SUB_PATH>`：服务状态接口，默认路径为 `/vercel`。返回健康状态以及 UptimeRobot 监控初始化结果。
- `/health`：简单健康检查接口。
- 仅支持 `GET` 请求；其他请求返回 `405`。

## 部署到 Vercel

1. 将仓库导入 Vercel 并部署。项目使用 `api/index.js` 作为 Serverless Function，`vercel.json` 会将请求转发给该函数。
2. 如需使用 UptimeRobot 自动监控，在 Vercel 项目的 **Settings → Environment Variables** 中设置 `UPTIMEROBOT_API_KEY`，然后重新部署。
3. 如使用自定义域名或路径，按需设置 `PUBLIC_URL` 和 `SUB_PATH`，并确认 `PUBLIC_URL` 是 UptimeRobot 应探测的完整 HTTPS 地址。

API key 应保存在 Vercel 环境变量中，不要提交到仓库。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SUB_PATH` | `vercel` | 服务状态接口路径；例如默认路径为 `/vercel`。 |
| `NAME` | `Green Network` | UptimeRobot 监控的名称前缀。 |
| `AUTO_ACCESS` | `true` | 是否自动检查并创建 UptimeRobot 监控。设置为 `false` 可关闭。 |
| `UPTIMEROBOT_API_KEY` | 未设置 | UptimeRobot API key。未设置时不会创建监控。 |
| `UPTIMEROBOT_INTERVAL` | `300` | 新建监控的检查间隔（秒）。 |
| `UPTIMEROBOT_TIMEOUT` | `30` | 新建监控的超时设置（秒）。 |
| `PUBLIC_URL` | `https://magicshow.de5.net/<SUB_PATH>` | UptimeRobot 探测的完整 URL。自定义域名时建议显式设置。 |

自动监控会先查询现有监控；若没有 URL 匹配的监控，则创建一个。初始化结果会在 `/<SUB_PATH>` 的 JSON 响应中返回。`/health` 不会触发监控初始化。

## 本地开发

安装项目依赖：

```sh
npm install
```

项目没有配置本地启动脚本；本地运行时可使用 Vercel CLI 提供的开发服务器。
