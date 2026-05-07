/**
 * 从给定的 URL 或字符串中提取笔记 ID 及相关信息。
 * 
 * @param {string} url - 待解析的 URL 字符串或笔记 ID。
 * @returns {Object|null} 返回一个包含解析结果的对象，如果无法解析则返回 null。
 *   - 若为短链接，返回 { type: 'short', url: string }
 *   - 若为完整链接或纯 ID，返回 { type: 'full', noteId?: string, fullUrl?: string }
 */
function extractNoteId(url) {
  url = url.trim();
  
  if (url.includes('xhslink.com')) return { type: 'short', url };

  const patterns = [
    /(xiaohongshu\.com\/explore\/[a-f0-9]+(?:\?[^ ]*)?)/,
    /(xiaohongshu\.com\/discovery\/item\/[a-f0-9]+(?:\?[^ ]*)?)/,
    /(xiaohongshu\.com\/note\/[a-f0-9]+(?:\?[^ ]*)?)/,
  ];
  
  for (const p of patterns) {
    const m = url.match(p);
    if (m) {
      const noteIdMatch = m[1].match(/([a-f0-9]{24})/);
      return { type: 'full', noteId: noteIdMatch?.[1], fullUrl: `https://www.${m[1]}` };
    }
  }
  
  if (/^[a-f0-9]{24}$/.test(url)) return { type: 'full', noteId: url };
  
  return null;
}

/**
 * 从 HTML 字符串中解析初始状态数据
 * 
 * @param {string} html - 包含 window.__INITIAL_STATE__ 定义的 HTML 字符串
 * @returns {Object|null} 解析后的 JavaScript 对象，如果解析失败则返回 null
 */
function parseInitialState(html) {
  const regex = /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?)\s*<\/script>/;
  const match = html.match(regex);
  if (!match) return null;

  let jsonStr = match[1];
  jsonStr = jsonStr.replace(/:\s*undefined/g, ': null');

  try {
    return JSON.parse(jsonStr);
  } catch {
    try {
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        return JSON.parse(jsonStr.slice(start, end + 1));
      }
    } catch {}
  }
  return null;
}

/**
 * 从状态对象中提取指定笔记的数据
 * 
 * @param {Object} state - 包含笔记详细信息的状态对象
 * @param {string} noteId - 笔记 ID
 * @returns {Object|null} 提取的笔记数据对象，如果无法找到笔记则返回 null
 */
function extractNoteData(state, noteId) {
  if (!state?.note?.noteDetailMap) return null;

  const map = state.note.noteDetailMap;
  let noteEntry = map[noteId];
  if (!noteEntry?.note?.noteId) {
    const keys = Object.keys(map).filter(k => k !== 'undefined' && map[k]?.note?.noteId);
    if (keys.length > 0) noteEntry = map[keys[0]];
  }

  if (!noteEntry?.note) return null;
  const note = noteEntry.note;
  const info = note.interactInfo || {};

  return {
    noteId: note.noteId || noteId,
    title: note.title || note.displayTitle || '',
    desc: (note.desc || '').slice(0, 200),
    author: note.user?.nickname || note.user?.nickName || '',
    userId: note.user?.userId || '',
    likedCount: info.likedCount || '0',
    collectedCount: info.collectedCount || '0',
    commentCount: info.commentCount || '0',
    shareCount: info.shareCount || '0',
    type: note.type === 'video' ? '视频' : '图文',
    time: note.time ? new Date(note.time).toLocaleString('zh-CN') : '',
    currentTime: noteEntry.currentTime ? new Date(noteEntry.currentTime).toLocaleString('zh-CN') : '',
    lastUpdateTime: note.lastUpdateTime ? new Date(note.lastUpdateTime).toLocaleString('zh-CN') : '',
  };
}

/**
 * 异步获取笔记信息
 * 
 * @param {string} noteUrl - 笔记链接，可以是短链接或完整链接
 * @param {string} cookieString - 用于请求的 Cookie 字符串
 * @returns {Promise<Object>} 返回包含笔记信息的对象
 * @throws {Error} 当解析链接失败、请求失败或无法提取笔记信息时抛出错误
 */
const { getRequestHeaders, loadHeaders } = require('./config');

async function fetchNoteInfo(noteUrl, cookieString) {
  const info = extractNoteId(noteUrl);
  if (!info) throw new Error(`无法解析链接: ${noteUrl}`);

  let targetUrl;
  if (info.type === 'short') {
    const configHeaders = loadHeaders();
    const resp = await fetch(info.url, {
      redirect: 'follow',
      headers: { 'User-Agent': configHeaders['user-agent'] },
    });
    const finalUrl = resp.url;
    const m = finalUrl.match(/explore\/([a-f0-9]+)/);
    if (!m) throw new Error(`短链接解析失败: ${noteUrl}`);
    targetUrl = `https://www.xiaohongshu.com/explore/${m[1]}`;
  } else {
    targetUrl = info.fullUrl;
  }

  const headers = { ...getRequestHeaders(cookieString), referer: targetUrl };
  const resp = await fetch(targetUrl, { headers, redirect: 'follow' });

  if (resp.url.includes('/404/') || resp.url.includes('error_code')) {
    const errMatch = resp.url.match(/error_msg=([^&]+)/);
    const errMsg = errMatch ? decodeURIComponent(errMatch[1]) : '笔记不可用';
    throw new Error(errMsg);
  }

  if (!resp.ok) throw new Error(`请求失败 (${resp.status})`);

  const html = await resp.text();
  if (!html || html.length < 1000) throw new Error('返回内容为空，可能被拦截');

  const state = parseInitialState(html);
  if (!state) throw new Error('无法解析页面数据，可能需要更新 Cookie');

  const noteId = targetUrl.match(/explore\/([a-f0-9]+)/)?.[1] || info.noteId;
  const data = extractNoteData(state, noteId);
  if (!data) throw new Error('无法提取笔记信息，可能需要更新 Cookie');

  return { ...data, url: targetUrl };
}

module.exports = { fetchNoteInfo };
