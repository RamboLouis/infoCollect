const path = require('path')

module.exports = {
  apps: [{
    name: 'info-collect',
    script: 'server/index.js',
    cwd: path.resolve(__dirname),
    env: {
      PORT: 6789,
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '256M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
}
