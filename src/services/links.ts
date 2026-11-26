import { z } from 'zod'

export const isWebUrl = (value: string) => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  } catch {
    return false
  }
}

const webUrl = z.string().refine(isWebUrl)
const linkSchema = z.object({
  id: z.string().min(1),
  shortUrl: webUrl,
  longUrl: webUrl,
  createdAt: z.iso.datetime({ offset: true }),
})
const listSchema = z.object({
  items: z.array(linkSchema),
  total: z.number().int().nonnegative(),
})

export type ShortLink = z.infer<typeof linkSchema>
const key = 'linkline.links.v1'
const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')
export const isDemo = !apiBase

function readLinks(): ShortLink[] {
  const stored = localStorage.getItem(key)
  if (!stored) return []
  const result = z.array(linkSchema).safeParse(JSON.parse(stored))
  if (!result.success) throw new Error('Saved links could not be read.')
  return result.data
}

async function request<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}) {
  const timeout = AbortSignal.timeout(15_000)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      signal,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      credentials: 'include',
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new Error(timeout.aborted ? 'The request timed out. Please try again.' : 'Could not reach the link service.')
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('You do not have access to this operation.')
  }
  if (!response.ok) throw new Error(`The link service returned an error (${response.status}).`)

  const result = schema.safeParse(await response.json().catch(() => null))
  if (!result.success) throw new Error('The link service returned an unexpected response.')
  return result.data
}

export async function createLink(longUrl: string) {
  if (!isWebUrl(longUrl)) throw new Error('Enter a valid HTTP or HTTPS URL.')
  if (!isDemo) {
    return request('/links', linkSchema, { method: 'POST', body: JSON.stringify({ longUrl }) })
  }

  const save = () => {
    const links = readLinks()
    let id: string
    do {
      id = crypto.randomUUID().slice(0, 8)
    } while (links.some((link) => link.id === id))

    const link: ShortLink = {
      id,
      longUrl,
      shortUrl: new URL(`/s/${id}`, window.location.origin).href,
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify([link, ...links]))
    return link
  }

  try {
    return await (navigator.locks ? navigator.locks.request(key, save) : save())
  } catch {
    throw new Error('Could not save the link in this browser.')
  }
}

export async function listLinks(page: number, pageSize: number, signal?: AbortSignal) {
  if (!isDemo) return request(`/links?page=${page}&pageSize=${pageSize}`, listSchema, { signal })
  const links = readLinks()
  const start = (page - 1) * pageSize
  return { items: links.slice(start, start + pageSize), total: links.length }
}

export function resolveDemoLink(id: string) {
  return isDemo ? readLinks().find((link) => link.id === id)?.longUrl : undefined
}
