const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', '.headers.json');
const SITE_CONFIG_FILE = path.join(__dirname, '..', '.site.json');

const DEFAULT_SITE = 'xiaohongshu';

/**
 * 获取默认的 HTTP 请求头信息
 */
function getDefaultHeaders() {
  const site = getSiteDomain();
  return {
    'referer': `https://www.${site}.com/`,
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'accept-encoding': 'gzip, deflate, br',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'upgrade-insecure-requests': '1',
    'sec-ch-ua': '"Chromium";v="147", "Not)A;Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1'
  };
}

/**
 * 加载所有 headers 配置列表
 * @returns {Array} headers 配置数组
 */
function loadHeadersList() {
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultHeaders = getDefaultHeaders();
    const list = [{ value: defaultHeaders, createdAt: new Date().toISOString() }];
    saveHeadersList(list);
    return list;
  }
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    // 兼容旧格式（单个对象）
    if (!Array.isArray(data)) {
      const list = [{ value: data, createdAt: new Date().toISOString() }];
      saveHeadersList(list);
      return list;
    }
    return data;
  } catch {
    const defaultHeaders = getDefaultHeaders();
    return [{ value: defaultHeaders, createdAt: new Date().toISOString() }];
  }
}

/**
 * 保存 headers 配置列表
 * @param {Array} list - headers 配置数组
 */
function saveHeadersList(list) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(list, null, 2));
}

/**
 * 随机获取一套 headers
 * @returns {Object} 随机选中的 headers 对象
 */
function getRandomHeaders() {
  const list = loadHeadersList();
  if (list.length === 0) return getDefaultHeaders();
  const picked = list[Math.floor(Math.random() * list.length)];
  return { ...getDefaultHeaders(), ...picked.value };
}

/**
 * 获取所有 headers 配置（用于前端展示）
 * @returns {Array} headers 配置数组
 */
function loadHeaders() {
  return loadHeadersList();
}

/**
 * 添加新的 headers 配置
 * @param {Object} headers - 新的 headers 对象
 * @returns {Object} 包含 message 和 count 的结果
 */
function addHeaders(headers) {
  let list = loadHeadersList();
  if (!Array.isArray(list)) list = [];
  // 检查是否重复（比较 user-agent）
  const ua = headers['user-agent'];
  if (ua && list.some(h => h.value && h.value['user-agent'] === ua)) {
    return { message: '该 Headers 已存在', count: list.length };
  }
  list.push({ value: headers, createdAt: new Date().toISOString() });
  saveHeadersList(list);
  return { message: '导入成功', count: list.length };
}

/**
 * 删除指定索引的 headers 配置
 * @param {number} index - 要删除的索引
 * @returns {Object} 包含 message 和 count 的结果
 */
function deleteHeaders(index) {
  const list = loadHeadersList();
  if (index < 0 || index >= list.length) {
    return { error: '无效的索引' };
  }
  list.splice(index, 1);
  saveHeadersList(list);
  return { message: '已删除', count: list.length };
}

/**
 * 清空所有 headers 配置
 */
function clearHeaders() {
  saveHeadersList([]);
}

/**
 * 重置为默认 headers
 * @returns {Object} 默认 headers
 */
function resetHeaders() {
  const defaultHeaders = getDefaultHeaders();
  const list = [{ value: defaultHeaders, createdAt: new Date().toISOString() }];
  saveHeadersList(list);
  return defaultHeaders;
}

/**
 * 构建包含 Cookie 的请求头对象（使用随机 headers）
 * @param {string} cookieString - 需要添加到请求头中的 Cookie 字符串
 * @returns {Object} 合并了随机 headers 和指定 Cookie 的请求头对象
 */
function getRequestHeaders(cookieString) {
  const headers = getRandomHeaders();
  return { ...headers, cookie: cookieString };
}

/**
 * 解析 curl 命令并提取请求头信息
 * @param {string} curlStr - curl 命令字符串
 * @returns {Object} 提取的请求头对象
 */
function parseCurl(curlStr) {
  const headers = {};
  // Handle: 'value', "value", $'value' (with escaped quotes inside)
  const regex = /-H\s+\$?'((?:[^'\\]|\\.)*)'|-H\s+"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = regex.exec(curlStr)) !== null) {
    const raw = match[1] !== undefined ? match[1] : match[2];
    const header = raw.replace(/\\(.)/g, '$1');
    const colonIndex = header.indexOf(':');
    if (colonIndex > 0) {
      const key = header.slice(0, colonIndex).trim().toLowerCase();
      const value = header.slice(colonIndex + 1).trim();
      headers[key] = value;
    }
  }
  // Extract cookies from -b flag (also handle escaped quotes and $'...')
  const cookieRegex = /-b\s+\$?'((?:[^'\\]|\\.)*)'|-b\s+"((?:[^"\\]|\\.)*)"/;
  const cookieMatch = curlStr.match(cookieRegex);
  if (cookieMatch) {
    const raw = cookieMatch[1] !== undefined ? cookieMatch[1] : cookieMatch[2];
    headers['cookie'] = raw.replace(/\\(.)/g, '$1');
  }
  return headers;
}

/**
 * 从 cURL 命令字符串中导入请求配置
 * @param {string} curlStr - cURL 命令字符串
 * @returns {Object} 包含处理后的 headers 和 cookie 的对象
 */
function importCurl(curlStr) {
  const parsed = parseCurl(curlStr);
  const { cookie, ...headers } = parsed;
  if (Object.keys(headers).length === 0) {
    return { message: '未能从 curl 中解析到请求头，请检查格式', count: 0, cookie: null };
  }
  const result = addHeaders(headers);
  return { ...result, cookie: cookie || null };
}

/**
 * 加载站点配置文件
 * @returns {Object} 站点配置对象
 */
function loadSiteConfig() {
  if (!fs.existsSync(SITE_CONFIG_FILE)) {
    saveSiteConfig({ site: DEFAULT_SITE });
    return { site: DEFAULT_SITE };
  }
  try {
    return JSON.parse(fs.readFileSync(SITE_CONFIG_FILE, 'utf-8'));
  } catch {
    return { site: DEFAULT_SITE };
  }
}

/**
 * 保存站点配置
 * @param {Object} config - 站点配置对象
 */
function saveSiteConfig(config) {
  fs.writeFileSync(SITE_CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * 获取站点域名
 * @returns {string} 站点域名
 */
function getSiteDomain() {
  return loadSiteConfig().site || DEFAULT_SITE;
}

module.exports = {
  loadHeaders,
  saveHeadersList,
  getRandomHeaders,
  addHeaders,
  deleteHeaders,
  clearHeaders,
  resetHeaders,
  getRequestHeaders,
  importCurl,
  loadSiteConfig,
  saveSiteConfig,
  getSiteDomain
};
