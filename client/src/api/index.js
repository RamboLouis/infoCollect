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
