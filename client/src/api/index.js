export async function getLoginStatus() {
  const resp = await fetch('/api/login-status')
  return resp.json()
}

export async function getCookies() {
  const resp = await fetch('/api/cookies')
  return resp.json()
}

export async function importCookies(cookieString) {
  const resp = await fetch('/api/import-cookies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cookieString }),
  })
  return resp.json()
}

export async function deleteCookie(index) {
  const resp = await fetch(`/api/cookies/${index}`, { method: 'DELETE' })
  return resp.json()
}

export async function clearCookies() {
  const resp = await fetch('/api/clear-cookies', { method: 'POST' })
  return resp.json()
}

export async function parseUrls(urls) {
  const resp = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  })
  return resp.json()
}

export async function parseUrlsStream(urls, onProgress) {
  const resp = await fetch('/api/parse-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  })

  if (!resp.ok) {
    const err = await resp.json()
    throw new Error(err.error || '请求失败')
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResults = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6))
        if (data.done) {
          finalResults = data.results
        } else {
          onProgress(data)
        }
      } catch {}
    }
  }

  return finalResults
}

export async function getHeaders() {
  const resp = await fetch('/api/headers')
  return resp.json()
}

export async function updateHeaders(headers) {
  const resp = await fetch('/api/headers', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(headers),
  })
  return resp.json()
}

export async function resetHeaders() {
  const resp = await fetch('/api/headers/reset', { method: 'POST' })
  return resp.json()
}

export async function importCurl(curlString) {
  const resp = await fetch('/api/headers/import-curl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ curlString }),
  })
  return resp.json()
}
