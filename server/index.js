const express = require('express');
const path = require('path');
const fs = require('fs');
const { registerRoutes } = require('./routes');
const pm2Config = require('../ecosystem.config.js');

const app = express();
const PORT = pm2Config.apps[0].env.PORT;

app.use(express.json());

// Serve Vue build in production
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Register API routes
registerRoutes(app);

// SPA fallback for production
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`信息获取工具: http://localhost:${PORT}`);
});
