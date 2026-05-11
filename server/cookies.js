
const fs = require('fs');
const path = require('path');

const COOKIE_FILE = path.join(__dirname, '..', '.cookies.json');

/**
 * 从 Cookie 文件中加载 Cookie 数据列表
 *
 * @returns {Array} Cookie 数据列表；如果文件不存在、内容为空或解析失败，返回空数组
 */
function loadCookies() {
  if (!fs.existsSync(COOKIE_FILE)) {
    saveCookies([]);
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
    if (Array.isArray(data)) return data;
    return data ? [data] : [];
  } catch {
    return [];
  }
}

/**
 * 将 Cookie 数据保存到文件中
 * @param {Array|Object} cookies - 需要保存的 Cookie 数据，将被序列化为 JSON 格式
 */
function saveCookies(cookies) {
  fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
}

/**
 * 从已加载的 Cookie 列表中随机获取一个 Cookie。
 *
 * @returns {string|null} 随机选中的 Cookie 字符串；如果列表为空，则返回 null。
 */
function getRandomCookie() {
  const cookies = loadCookies();
  // 如果没有可用的 Cookie，直接返回 null
  if (cookies.length === 0) return null;
  const picked = cookies[Math.floor(Math.random() * cookies.length)];
  return typeof picked === 'string' ? picked : picked.value;
}

module.exports = {
  loadCookies,
  saveCookies,
  getRandomCookie
};