// Typed `fetch` wrapper for the axum API mounted at /api/*.

import { resolveApiPath } from './api-url'
import { HTTPError } from './errors'

export type Json = unknown

interface RequestInit2 extends Omit<RequestInit, 'body'> {
  body?: unknown
}

async function request<T = Json>(method: string, path: string, init?: RequestInit2): Promise<T> {
  const url = resolveApiPath(path)
  const headers = new Headers(init?.headers as HeadersInit | undefined)
  let body: BodyInit | undefined
  if (init?.body !== undefined && init?.body !== null) {
    if (typeof init.body === 'string' || init.body instanceof FormData) {
      body = init.body as BodyInit
    } else {
      headers.set('content-type', 'application/json')
      body = JSON.stringify(init.body)
    }
  }
  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: 'same-origin',
    signal: init?.signal,
  })
  if (!res.ok) {
    throw await HTTPError.fromResponse(res, `${method} ${url}`)
  }
  if (res.status === 204) return undefined as T
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json() as Promise<T>
  return (await res.text()) as T
}

async function downloadBlob(path: string): Promise<{ blob: Blob; status: number }> {
  const url = resolveApiPath(path)
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) {
    throw await HTTPError.fromResponse(res, `GET ${url}`)
  }
  return { blob: await res.blob(), status: res.status }
}

async function postRaw(path: string, body: unknown): Promise<Response> {
  const url = resolveApiPath(path)
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const apiClient = {
  get: <T = Json>(path: string, init?: RequestInit2) => request<T>('GET', path, init),
  post: <T = Json>(path: string, body?: unknown, init?: RequestInit2) =>
    request<T>('POST', path, { ...init, body }),
  patch: <T = Json>(path: string, body?: unknown, init?: RequestInit2) =>
    request<T>('PATCH', path, { ...init, body }),
  put: <T = Json>(path: string, body?: unknown, init?: RequestInit2) =>
    request<T>('PUT', path, { ...init, body }),
  delete: <T = Json>(path: string, init?: RequestInit2) => request<T>('DELETE', path, init),
  downloadBlob,
  postRaw,
  triggerDownload,
}
