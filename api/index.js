'use strict';

const axios = require('axios');

// ============================================================
// 固定配置
// ============================================================

const UUID = '357e3bfa-3678-4dea-b19a-080128a0301e';
const DOMAIN = 'magicshow.de5.net';

const SUB_PATH = process.env.SUB_PATH || 'vercel';
const NAME = process.env.NAME || 'Green Network';

const AUTO_ACCESS =
  String(process.env.AUTO_ACCESS || 'true').toLowerCase() === 'true';

const UPTIMEROBOT_API_KEY =
  process.env.UPTIMEROBOT_API_KEY || '';

const UPTIMEROBOT_API_BASE =
  'https://api.uptimerobot.com/v3';

const UPTIMEROBOT_INTERVAL =
  Number(process.env.UPTIMEROBOT_INTERVAL || 300);

const UPTIMEROBOT_TIMEOUT =
  Number(process.env.UPTIMEROBOT_TIMEOUT || 30);

// 当前 Vercel 项目的公网健康检查地址
const PUBLIC_URL =
  process.env.PUBLIC_URL ||
  `https://${DOMAIN}/${SUB_PATH}`;

// 防止同一个 Serverless 实例重复创建监控
let monitorSetupPromise = null;

// ============================================================
// 基础响应工具
// ============================================================

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-store');
  res.end(text);
}

function getPath(req) {
  try {
    const host = req.headers.host || 'localhost';
    return new URL(req.url || '/', `https://${host}`).pathname;
  } catch {
    return '/';
  }
}

// ============================================================
// UptimeRobot API
// ============================================================

function uptimeRobotHeaders() {
  return {
    Authorization: `Bearer ${UPTIMEROBOT_API_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Green-Network-Vercel/1.0'
  };
}

function extractMonitors(payload) {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.monitors)) {
    return payload.monitors;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

function normalizeUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .toLowerCase();
}

function getMonitorUrl(monitor) {
  return monitor?.url ||
    monitor?.target ||
    monitor?.monitorUrl ||
    '';
}

function getMonitorId(monitor) {
  return (
    monitor?.id ||
    monitor?.monitorId ||
    monitor?.monitor?.id ||
    monitor?.data?.id ||
    'unknown'
  );
}

async function listMonitors() {
  const response = await axios.get(
    `${UPTIMEROBOT_API_BASE}/monitors`,
    {
      headers: uptimeRobotHeaders(),
      params: {
        limit: 200
      },
      timeout: 10000,
      validateStatus: () => true
    }
  );

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `UptimeRobot authentication failed: HTTP ${response.status}`
    );
  }

  if (response.status === 429) {
    throw new Error('UptimeRobot rate limit reached');
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Failed to list monitors: HTTP ${response.status}`
    );
  }

  return extractMonitors(response.data);
}

async function createMonitor(url) {
  const payload = {
    type: 'HTTP',
    friendlyName: `${NAME} Keepalive`,
    url,
    interval: UPTIMEROBOT_INTERVAL,
    timeout: UPTIMEROBOT_TIMEOUT
  };

  const response = await axios.post(
    `${UPTIMEROBOT_API_BASE}/monitors`,
    payload,
    {
      headers: uptimeRobotHeaders(),
      timeout: 10000,
      validateStatus: () => true
    }
  );

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `UptimeRobot authentication failed: HTTP ${response.status}`
    );
  }

  if (response.status === 429) {
    throw new Error('UptimeRobot rate limit reached');
  }

  if (response.status < 200 || response.status >= 300) {
    const detail =
      typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

    throw new Error(
      `Failed to create monitor: HTTP ${response.status} ${detail}`
    );
  }

  return response.data;
}

async function ensureUptimeRobotMonitor() {
  if (!AUTO_ACCESS) {
    return {
      enabled: false,
      message: 'Automatic monitor setup is disabled'
    };
  }

  if (!UPTIMEROBOT_API_KEY) {
    return {
      enabled: false,
      message: 'UPTIMEROBOT_API_KEY is not configured'
    };
  }

  const monitors = await listMonitors();

  const existing = monitors.find((monitor) => {
    return normalizeUrl(getMonitorUrl(monitor)) ===
      normalizeUrl(PUBLIC_URL);
  });

  if (existing) {
    return {
      enabled: true,
      created: false,
      monitorId: getMonitorId(existing),
      url: PUBLIC_URL
    };
  }

  const created = await createMonitor(PUBLIC_URL);

  return {
    enabled: true,
    created: true,
    monitorId: getMonitorId(created),
    url: PUBLIC_URL
  };
}

function setupMonitorOnce() {
  if (!monitorSetupPromise) {
    monitorSetupPromise = ensureUptimeRobotMonitor()
      .catch((error) => {
        console.error(
          '[UptimeRobot] Setup failed:',
          error.response?.data || error.message
        );

        return {
          enabled: false,
          error: error.message
        };
      });
  }

  return monitorSetupPromise;
}

// ============================================================
// 页面内容
// ============================================================

function renderHomePage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Green Network 公益环保网络">
  <title>Green Network</title>
  <style>
    :root {
      --green-dark: #174d35;
      --green-main: #2f7d4a;
      --green-light: #dff2c5;
      --cream: #fffaf0;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      color: #20372a;
      font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
      background:
        linear-gradient(
          135deg,
          rgba(23, 77, 53, .9),
          rgba(47, 125, 74, .72)
        ),
        url("https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=2000&q=80")
        center / cover no-repeat;
    }

    .card {
      width: min(720px, 100%);
      padding: 48px 36px;
      text-align: center;
      border-radius: 24px;
      background: rgba(255, 250, 240, .94);
      box-shadow: 0 24px 70px rgba(0, 0, 0, .22);
    }

    .icon {
      color: var(--green-main);
      font-size: 4rem;
    }

    h1 {
      margin: 18px 0 12px;
      color: var(--green-dark);
      font-size: clamp(2rem, 6vw, 4rem);
    }

    p {
      margin: 0 auto 24px;
      max-width: 560px;
      color: #567060;
      line-height: 1.8;
    }

    .button {
      display: inline-block;
      padding: 13px 24px;
      color: white;
      border-radius: 999px;
      background: var(--green-main);
      text-decoration: none;
      font-weight: 700;
    }

    .button:hover {
      background: var(--green-dark);
    }

    .status {
      margin-top: 24px;
      color: #6b8372;
      font-size: .9rem;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="icon">🌱</div>
    <h1>Green Network</h1>
    <p>
      让每一次连接都通向更绿色、更可持续的未来。
      保护自然，从今天的一个小行动开始。
    </p>
    <a class="button" href="/${SUB_PATH}">查看服务状态</a>
    <div class="status">服务运行正常 · ${DOMAIN}</div>
  </main>
</body>
</html>`;
}

// ============================================================
// Vercel Serverless Function
// ============================================================

module.exports = async function handler(req, res) {
  const pathname = getPath(req);

  // 首页
  if (req.method === 'GET' && pathname === '/') {
    sendText(
      res,
      200,
      renderHomePage(),
      'text/html; charset=utf-8'
    );

    // 不阻塞首页响应
    setupMonitorOnce().catch(() => {});
    return;
  }

  // UptimeRobot 探测地址
  if (
    req.method === 'GET' &&
    pathname === `/${SUB_PATH}`
  ) {
    const monitor = await setupMonitorOnce();

    sendJson(res, 200, {
      ok: true,
      service: 'green-network',
      status: 'healthy',
      domain: DOMAIN,
      subscriptionPath: `/${SUB_PATH}`,
      uuidConfigured: Boolean(UUID),
      uptimeRobot: {
        enabled: monitor.enabled,
        created: monitor.created || false,
        monitorId: monitor.monitorId || null
      },
      timestamp: new Date().toISOString()
    });

    return;
  }

  // 健康检查接口
  if (
    req.method === 'GET' &&
    pathname === '/health'
  ) {
    sendJson(res, 200, {
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString()
    });

    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, {
      ok: false,
      error: 'Method Not Allowed'
    });

    return;
  }

  sendJson(res, 404, {
    ok: false,
    error: 'Not Found'
  });
};
