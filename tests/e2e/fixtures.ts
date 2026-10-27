// Shared base of the e2e suite: console guard, session mocks, window.APPLICATION, and an in-memory
// REST dataset that follows data-fair's behaviour (default page of 12, exact/prefix filters, values
// aggregation, bulk actions, patch merges, a revision per write). Specs import `test` and `expect` from here.
import { test as base, expect, type Page, type Route } from '@playwright/test'

export interface MockLine {
  _id: string
  nom: string
  path: string
  attachmentPath?: string
  taille?: number
  type_mime?: string
  nbrevisions?: number
  _updatedAt?: string
  [key: string]: unknown
}

export const datasetId = 'ged-test'
export const datasetHref = `/data-fair/api/v1/datasets/${datasetId}`
const port = Number(process.env.E2E_PORT ?? 3100)
export const baseUrl = `http://localhost:${port}`

export const siteInfo = {
  main: true,
  theme: {
    colors: { primary: '#1e88e5', secondary: '#424242', accent: '#82B1FF', success: '#4CAF50', error: '#FF5252', info: '#2196F3', warning: '#FFC107' },
    dark: false
  },
  authMode: 'user',
  owner: { type: 'user', id: 'test-user' }
}

const SCHEMA = ['nom', 'path', 'attachmentPath', 'taille', 'type_mime', 'nbrevisions', 'datecreation', 'datemodification', 'auteur', '_attachment_url', '_updatedAt', '_id']

export function initialLines (): MockLine[] {
  return [
    { _id: 'docs-folder', nom: 'docs', path: '/', type_mime: '_folder', _updatedAt: '2026-01-01T10:00:00.000Z' },
    { _id: 'file1', nom: 'rapport.pdf', path: '/', attachmentPath: 'file1/h1/rapport.pdf', taille: 123456, type_mime: 'application/pdf', nbrevisions: 0, auteur: 'Durand', _updatedAt: '2026-01-02T10:00:00.000Z' },
    { _id: 'file2', nom: 'notes.txt', path: '/docs/', attachmentPath: 'file2/h2/notes.txt', taille: 2048, type_mime: 'text/plain', nbrevisions: 2, _updatedAt: '2026-01-03T10:00:00.000Z' },
    // a folder only implied by the path of its content, as older GEDs have them
    { _id: 'file3', nom: 'photo.png', path: '/images/', attachmentPath: 'file3/h3/photo.png', taille: 5000, type_mime: 'image/png', nbrevisions: 0, _updatedAt: '2026-01-04T10:00:00.000Z' }
  ]
}

export interface GedOptions {
  configuration?: Record<string, unknown>
  lines?: MockLine[]
  history?: boolean
  schema?: string[]
}

export interface CapturedRequest {
  method: string
  suffix: string
  query: Record<string, string>
  body: string | null
}

function parseMultipart (body: Buffer | null, contentType: string) {
  const fields: Record<string, string> = {}
  let fileName: string | undefined
  const boundary = contentType.match(/boundary=(.+)$/)?.[1]
  if (!body || !boundary) return { fields, fileName }
  for (const part of body.toString('utf8').split(`--${boundary}`)) {
    const name = part.match(/name="([^"]+)"/)?.[1]
    if (!name) continue
    const file = part.match(/filename="([^"]*)"/)?.[1]
    if (file !== undefined) {
      fileName = file
      continue
    }
    fields[name] = part.split(/\r\n\r\n/).slice(1).join('\r\n\r\n').replace(/\r\n$/, '')
  }
  return { fields, fileName }
}

function mockDataset (options: GedOptions) {
  const lines: MockLine[] = (options.lines ?? initialLines()).map(l => ({ ...l }))
  const schema = options.schema ?? SCHEMA
  const revisions = new Map<string, MockLine[]>()
  const requests: CapturedRequest[] = []
  let counter = 0

  const now = () => new Date(Date.UTC(2026, 9, 1, 8, 0, ++counter)).toISOString()
  const unknownKeys = (body: Record<string, unknown>) => Object.keys(body).filter(k => !k.startsWith('_') && !schema.includes(k))
  function record (line: MockLine, action: string) {
    line._updatedAt = now()
    const list = revisions.get(line._id) ?? []
    list.unshift({ ...line, _action: action, _i: counter })
    revisions.set(line._id, list)
  }
  function apply (action: Record<string, unknown>, fileName?: string): { status: number, line?: MockLine, error?: string } {
    const { _action: act = 'create', _id: id, ...body } = action as { _action?: string, _id?: string } & Record<string, unknown>
    if (unknownKeys(body).length) return { status: 400, error: `unknown properties ${unknownKeys(body).join(',')}` }
    for (const key of ['taille', 'nbrevisions']) if (typeof body[key] === 'string') body[key] = Number(body[key])
    if (act === 'delete') {
      const i = lines.findIndex(l => l._id === id)
      if (i === -1) return { status: 404 }
      record(lines[i], 'delete')
      lines.splice(i, 1)
      return { status: 204 }
    }
    if (act === 'patch') {
      const line = lines.find(l => l._id === id)
      if (!line) return { status: 404 }
      Object.assign(line, body)
      if (fileName) line.attachmentPath = `${line._id}/r${counter + 1}/${fileName}`
      record(line, 'patch')
      return { status: 200, line }
    }
    const newId = id ?? `new-${++counter}`
    const line = { _id: newId, ...body } as MockLine
    if (fileName) line.attachmentPath = `${newId}/r${counter + 1}/${fileName}`
    lines.push(line)
    record(line, 'create')
    return { status: 201, line }
  }
  const withUrl = (line: MockLine) => line.attachmentPath ? { ...line, _attachment_url: `${baseUrl}${datasetHref}/attachments/${line.attachmentPath}` } : line

  return {
    lines,
    requests,
    async handle (route: Route) {
      const request = route.request()
      const url = new URL(request.url())
      const suffix = url.pathname.slice(datasetHref.length)
      const query = Object.fromEntries(url.searchParams)
      const method = request.method()
      requests.push({ method, suffix, query, body: request.postData() })
      const size = Number(query.size ?? 12)

      if (suffix === '' && method === 'GET') {
        return route.fulfill({ json: { schema: schema.map(key => ({ key })), rest: { history: options.history !== false } } })
      }
      if (suffix === '' && method === 'PATCH') return route.fulfill({ json: request.postDataJSON() })

      if (suffix === '/lines' && method === 'GET') {
        if (query.select?.split(',').some(k => !schema.includes(k))) return route.fulfill({ status: 400, body: 'unknown select field' })
        let result = lines
        if (query.path_eq !== undefined) result = result.filter(l => l.path === query.path_eq)
        if (query.path_starts !== undefined) result = result.filter(l => l.path.startsWith(query.path_starts))
        if (query.nom_eq !== undefined) result = result.filter(l => l.nom === query.nom_eq)
        if (query.q) {
          const needle = query.q.toLowerCase()
          const fields = (query.q_fields ?? 'nom').split(',')
          result = result.filter(l => fields.some(f => String(l[f] ?? '').toLowerCase().split(/\s+/).some(word => query.q_mode === 'complete' ? word.startsWith(needle) : word === needle)))
        }
        if (query.sort) {
          const key = query.sort.replace(/^-/, '')
          const direction = query.sort.startsWith('-') ? -1 : 1
          const value = (l: MockLine) => l[key] ?? ''
          result = [...result].sort((a, b) => String(value(a)).localeCompare(String(value(b)), 'fr', { numeric: typeof value(a) === 'number', sensitivity: 'base' }) * direction)
        }
        return route.fulfill({ json: { total: result.length, results: result.slice(0, size).map(withUrl) } })
      }
      if (suffix === '/values/path' && method === 'GET') {
        const paths = [...new Set(lines.filter(l => l.path.startsWith(query.path_starts ?? '')).map(l => l.path))]
        return route.fulfill({ json: paths.slice(0, query.size ? size : 10) })
      }
      if (suffix === '/lines' && method === 'POST') {
        const contentType = request.headers()['content-type'] ?? ''
        let result
        if (contentType.includes('application/json')) {
          result = apply(request.postDataJSON())
        } else {
          const { fields, fileName } = parseMultipart(request.postDataBuffer(), contentType)
          result = apply(fields, fileName)
        }
        if (result.error) return route.fulfill({ status: result.status, body: result.error })
        return route.fulfill({ status: result.status, json: result.line ?? {} })
      }
      if (suffix === '/_bulk_lines' && method === 'POST') {
        const results = (request.postDataJSON() as Record<string, unknown>[]).map(a => apply(a))
        const errors = results.filter(r => r.status >= 400).map(r => ({ error: r.error ?? String(r.status) }))
        return route.fulfill({ json: { nbOk: results.length - errors.length, nbErrors: errors.length, errors, indexedAt: now() } })
      }
      const lineMatch = suffix.match(/^\/lines\/([^/]+)(\/revisions)?$/)
      if (lineMatch && method === 'GET' && lineMatch[2]) {
        if (options.history === false) return route.fulfill({ status: 400, body: 'history disabled' })
        const list = revisions.get(decodeURIComponent(lineMatch[1])) ?? []
        return route.fulfill({ json: { total: list.length, results: list.slice(0, size) } })
      }
      if (lineMatch && method === 'PATCH') {
        const result = apply({ ...request.postDataJSON(), _action: 'patch', _id: decodeURIComponent(lineMatch[1]) })
        return result.error ? route.fulfill({ status: result.status, body: result.error }) : route.fulfill({ status: result.status, json: result.line ?? {} })
      }
      if (lineMatch && method === 'DELETE') {
        const result = apply({ _action: 'delete', _id: decodeURIComponent(lineMatch[1]) })
        return route.fulfill({ status: result.status, body: '' })
      }
      if (suffix.startsWith('/attachments/')) {
        const name = decodeURIComponent(suffix.split('/').pop() ?? '')
        return route.fulfill({ status: 200, contentType: 'text/plain', headers: { 'content-disposition': `inline; filename="${name}"` }, body: 'contenu du fichier' })
      }
      return route.fulfill({ status: 404, json: {} })
    }
  }
}

export async function mockSite (page: Page, info: unknown = siteInfo) {
  // the dataset journal websocket of lib-vue's useWS: accepted, silent
  await page.routeWebSocket(/\/data-fair\/$/, () => {})
  await page.route('**/simple-directory/**', (route) => {
    const url = route.request().url()
    if (url.includes('/_public.js')) return route.fulfill({ contentType: 'application/javascript', body: `window.__PUBLIC_SITE_INFO = ${JSON.stringify(info)}` })
    if (url.endsWith('.css')) return route.fulfill({ contentType: 'text/css', body: '' })
    return route.fulfill({ json: info })
  })
}

export async function mockApplication (page: Page, configuration: Record<string, unknown>) {
  await page.addInitScript((app) => {
    Object.defineProperty(window, 'APPLICATION', { value: app, writable: false, configurable: false })
  }, {
    id: 'app0',
    slug: 'ged-test',
    title: 'GED test',
    href: `${baseUrl}/app/app0`,
    exposedUrl: `${baseUrl}/app/app0`,
    apiUrl: `${baseUrl}/data-fair/api/v1`,
    wsUrl: `ws://${new URL(baseUrl).host}/ws`,
    owner: { type: 'user', id: 'test-user', name: 'Test User' },
    configuration
  })
}

export const test = base.extend<{
  consoleGuard: void
  expectedConsole: string[]
  gedOptions: GedOptions
  ged: { page: Page, lines: MockLine[], requests: CapturedRequest[] }
}>({
  // messages a test provokes on purpose, named one by one: test.use({ expectedConsole: ['status of 500'] })
  expectedConsole: [[], { option: true }],
  gedOptions: [{}, { option: true }],
  consoleGuard: [async ({ page, expectedConsole }, use) => {
    const messages: string[] = []
    page.on('console', (msg) => {
      if (msg.type() !== 'error' && msg.type() !== 'warning') return
      if (expectedConsole.some(text => msg.text().includes(text))) return
      messages.push(`[${msg.type()}] ${msg.text()}`)
    })
    page.on('pageerror', (err) => {
      if (expectedConsole.some(text => err.message.includes(text))) return
      // harness artifact: Vite serves index.html raw, the inline `window.APPLICATION=%APPLICATION%` fails to parse
      if (err.message === "Unexpected token '%'") return
      messages.push(`[pageerror] ${err.message}`)
    })
    await use()
    expect(messages, 'console must stay clean').toEqual([])
  }, { auto: true }],
  ged: async ({ page, gedOptions }, use) => {
    const dataset = mockDataset(gedOptions)
    await mockSite(page)
    await page.route(`**${datasetHref}**`, route => dataset.handle(route))
    await mockApplication(page, gedOptions.configuration ?? {
      datasets: [{ id: datasetId, href: datasetHref, title: 'Test-GED', managedByApp: true }],
      metadata: [{ key: 'auteur', title: 'Auteur', type: 'string' }]
    })
    await use({ page, lines: dataset.lines, requests: dataset.requests })
  }
})

export { expect }
