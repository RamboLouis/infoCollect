const { loadCookies, saveCookies, getRandomCookie } = require('./cookies');
const { fetchNoteInfo } = require('./parser');
const { loadHeaders, getRandomHeaders, addHeaders, deleteHeaders, clearHeaders, resetHeaders, importCurl, loadSiteConfig, saveSiteConfig } = require('./config');

function registerRoutes(app) {
  // Cookie management
  app.get('/api/cookies', (req, res) => {
    const cookies = loadCookies();
    res.json({ cookies });
  });

  app.post('/api/import-cookies', (req, res) => {
    try {
      const { cookieString } = req.body;
      if (!cookieString) return res.status(400).json({ error: '请提供 Cookie 字符串' });

      const cookie = cookieString.trim();
      const existing = loadCookies();
      if (existing.some(c => (typeof c === 'string' ? c : c.value) === cookie)) {
        return res.json({ message: '该 Cookie 已存在', count: existing.length });
      }
      existing.push({ value: cookie, createdAt: new Date().toISOString() });
      saveCookies(existing);

      res.json({ message: '导入成功', count: existing.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/cookies/:index', (req, res) => {
    try {
      const index = parseInt(req.params.index);
      const cookies = loadCookies();
      if (index < 0 || index >= cookies.length) {
        return res.status(400).json({ error: '无效的索引' });
      }
      cookies.splice(index, 1);
      saveCookies(cookies);
      res.json({ message: '已删除', count: cookies.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/clear-cookies', (req, res) => {
    saveCookies([]);
    res.json({ message: '已清空所有 Cookie' });
  });

  app.get('/api/login-status', (req, res) => {
    const cookies = loadCookies();
    const hasSession = cookies.some(c => {
      const val = typeof c === 'string' ? c : c.value;
      return val.includes('web_session') || val.includes('a1');
    });
    res.json({ isLoggedIn: hasSession, cookieCount: cookies.length });
  });

  // Headers config
  app.get('/api/headers', (req, res) => {
    const headers = loadHeaders();
    res.json({ headers });
  });

  app.post('/api/headers/reset', (req, res) => {
    const headers = resetHeaders();
    res.json({ message: '已重置为默认值', headers });
  });

  app.delete('/api/headers/:index', (req, res) => {
    try {
      const index = parseInt(req.params.index);
      const result = deleteHeaders(index);
      if (result.error) return res.status(400).json({ error: result.error });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/headers/clear', (req, res) => {
    clearHeaders();
    res.json({ message: '已清空所有 Headers' });
  });

  app.post('/api/headers/import-curl', (req, res) => {
    try {
      const { curlString } = req.body;
      if (!curlString) return res.status(400).json({ error: '请提供 curl 命令' });

      const result = importCurl(curlString);

      // If curl contains cookies, also save them
      if (result.cookie) {
        const existing = loadCookies();
        if (!existing.some(c => (typeof c === 'string' ? c : c.value) === result.cookie)) {
          existing.push({ value: result.cookie, createdAt: new Date().toISOString() });
          saveCookies(existing);
        }
      }

      res.json({
        success: result.count > 0,
        message: result.message,
        cookieImported: !!result.cookie,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Site config
  app.get('/api/site-config', (req, res) => {
    const config = loadSiteConfig();
    res.json({ ...config, default: 'xiaohongshu' });
  });

  app.put('/api/site-config', (req, res) => {
    try {
      const { site } = req.body;
      if (!site) return res.status(400).json({ error: '请提供站点标识' });
      saveSiteConfig({ site: site.trim() });
      res.json({ message: '已更新', site: site.trim() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Parse
  app.post('/api/parse', async (req, res) => {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: '请提供链接列表' });
    }

    const cookies = loadCookies();
    if (cookies.length === 0) {
      return res.status(400).json({ error: '请先导入 Cookie' });
    }

    const results = [];
    for (const url of urls) {
      try {
        if (results.length > 0) {
          const delay = 3000 + Math.random() * 5000;
          await new Promise(r => setTimeout(r, delay));
        }
        const cookie = getRandomCookie();
        const data = await fetchNoteInfo(url, cookie);
        results.push({ success: true, data });
      } catch (err) {
        results.push({ success: false, url, error: err.message });
      }
    }

    res.json({ results });
  });

  // Parse with SSE progress
  app.post('/api/parse-stream', async (req, res) => {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: '请提供链接列表' });
    }

    const cookies = loadCookies();
    if (cookies.length === 0) {
      return res.status(400).json({ error: '请先导入 Cookie' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    const total = urls.length;
    const results = [];

    for (let i = 0; i < total; i++) {
      try {
        if (i > 0) {
          const delay = 3000 + Math.random() * 5000;
          await new Promise(r => setTimeout(r, delay));
        }
        const cookie = getRandomCookie();
        const data = await fetchNoteInfo(urls[i], cookie);
        results.push({ success: true, data });
      } catch (err) {
        results.push({ success: false, url: urls[i], error: err.message });
      }

      const completed = results.length;
      const lastResult = results[results.length - 1];
      res.write(`data: ${JSON.stringify({
        total,
        completed,
        pending: total - completed,
        result: lastResult,
      })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true, results })}\n\n`);
    res.end();
  });
}

module.exports = { registerRoutes };
