const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', '.headers.json');

const DEFAULT_HEADERS = {
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
  'sec-fetch-user': '?1',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  'referer': 'https://www.xiaohongshu.com/',
};

/**
 * 加载请求头配置信息。
 * 
 * 该函数尝试从配置文件中读取自定义请求头，并将其与默认请求头合并。
 * 如果配置文件不存在或解析失败，则返回仅包含默认请求头的对象。
 * 
 * @returns {Object} 合并后的请求头对象，以默认请求头为基础，叠加配置文件中的自定义项。
 */
function loadHeaders() {
  if (!fs.existsSync(CONFIG_FILE)) {
    saveHeaders({ ...DEFAULT_HEADERS });
    return { ...DEFAULT_HEADERS };
  }
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    return { ...DEFAULT_HEADERS, ...data };
  } catch {
    return { ...DEFAULT_HEADERS };
  }
}

/**
 * 将请求头信息保存到配置文件中
 * @param {Object} headers - 需要保存的请求头对象
 */
function saveHeaders(headers) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(headers, null, 2));
}

/**
 * 更新请求头信息
 * 
 * @param {Object} partial - 需要更新的头部字段对象，其属性将覆盖现有头部中的同名属性
 * @returns {Object} 更新后的完整头部对象
 */
function updateHeaders(partial) {
  const current = loadHeaders();
  const updated = { ...current, ...partial };
  saveHeaders(updated);
  return updated;
}

/**
 * 重置请求头为默认值。
 * 
 * 该函数将当前的请求头恢复为默认的 DEFAULT_HEADERS 配置，
 * 并返回一份默认请求头的副本。
 * 
 * @returns {Object} 返回一个包含默认请求头键值对的新对象。
 */
function resetHeaders() {
  saveHeaders({ ...DEFAULT_HEADERS });
  return { ...DEFAULT_HEADERS };
}

/**
 * 构建包含 Cookie 的请求头对象
 * @param {string} cookieString - 需要添加到请求头中的 Cookie 字符串
 * @returns {Object} 合并了基础头部信息和指定 Cookie 的请求头对象
 */
function getRequestHeaders(cookieString) {
  const headers = loadHeaders();
  return { ...headers, cookie: cookieString };
}

/**
 * 解析 curl 命令并提取请求头信息
 * @param {string} curlStr - curl 命令字符串
 * @returns {Object} 提取的请求头对象
 */
function parseCurl(curlStr) {
  const headers = {};
  const regex = /-H\s+'([^']+)'|-H\s+"([^"]+)"/g;
  let match;
  while ((match = regex.exec(curlStr)) !== null) {
    const header = match[1] || match[2];
    const colonIndex = header.indexOf(':');
    if (colonIndex > 0) {
      const key = header.slice(0, colonIndex).trim().toLowerCase();
      const value = header.slice(colonIndex + 1).trim();
      headers[key] = value;
    }
  }
  // Extract cookies from -b flag
  const cookieRegex = /-b\s+'([^']+)'|-b\s+"([^"]+)"/;
  const cookieMatch = curlStr.match(cookieRegex);
  if (cookieMatch) {
    headers['cookie'] = cookieMatch[1] || cookieMatch[2];
  }
  return headers;
}

/**
 * 从 cURL 命令字符串中导入请求配置。
 * 该函数会解析 cURL 字符串，提取 Cookie，并仅更新 Accept 和 User-Agent 请求头。
 *
 * @param {string} curlStr - cURL 命令字符串
 * @returns {Object} 包含处理后的请求头和 Cookie 的对象
 * @returns {Object} return.headers - 更新后的请求头对象
 * @returns {string|null} return.cookie - 提取到的 Cookie 字符串，若不存在则为 null
 */
function importCurl(curlStr) {
  const parsed = parseCurl(curlStr);
  // Remove cookie from headers (managed separately)
  const { cookie } = parsed;
  // Only update accept and user-agent from curl
  const current = loadHeaders();
  if (parsed['accept']) current['accept'] = parsed['accept'];
  if (parsed['user-agent']) current['user-agent'] = parsed['user-agent'];
  saveHeaders(current);
  return { headers: current, cookie: cookie || null };
}

module.exports = { loadHeaders, saveHeaders, updateHeaders, resetHeaders, getRequestHeaders, importCurl };
