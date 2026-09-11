import { test as base, type Page, type WebSocketRoute } from '@playwright/test'

export interface MockLine {
  _id: string
  nom: string
  path: string
  attachmentPath?: string
  taille?: number
  type_mime?: string
  datecreation?: string
  datemodification?: string
  nbrevisions?: number
}

export const datasetId = 'ged-test'
export const datasetHref = `/data-fair/api/v1/datasets/${datasetId}`
const port = Number(process.env.E2E_PORT ?? 3100)
const baseUrl = `http://localhost:${port}`

const siteInfo = {
  main: true,
  theme: {
    colors: {
      primary: '#1e88e5',
      secondary: '#424242',
      accent: '#82B1FF',
      success: '#4CAF50',
      error: '#FF5252',
      info: '#2196F3',
      warning: '#FFC107'
    },
    dark: false
  },
  authMode: 'user',
  owner: { type: 'user', id: 'test-user' }
}

function initialLines (): MockLine[] {
  return [
    {
      _id: 'file1',
      nom: 'rapport.pdf',
      path: '/',
      attachmentPath: 'file1/abc/rapport.pdf',
      taille: 123456,
      type_mime: 'application/pdf',
      datecreation: '2026-01-01T10:00:00.000Z',
      datemodification: '2026-01-02T10:00:00.000Z',
      nbrevisions: 1
    },
    {
      _id: 'file2',
      nom: 'notes.txt',
      path: '/docs/',
      attachmentPath: 'file2/def/notes.txt',
      taille: 2048,
      type_mime: 'text/plain',
      datecreation: '2026-01-01T10:00:00.000Z',
      datemodification: '2026-01-01T10:00:00.000Z',
      nbrevisions: 2
    }
  ]
}

function multipartField (body: Buffer | null, field: string): string | null {
  if (!body) return null
  const text = body.toString('utf8')
  const m = text.match(new RegExp(`name="${field}"\\r?\\n\\r?\\n([^\\r\\n]*)`))
  return m?.[1] ?? null
}

let idCounter = 0
function nextId () {
  idCounter++
  return `new-${idCounter}`
}

export const test = base.extend<{
  ged: { page: Page, emitJournal: () => void, lines: MockLine[], freezeReads: () => void, unfreezeReads: () => void }
}>({
      ged: async ({ page }, use) => {
        const lines = initialLines()
        let frozenLines: MockLine[] | null = null
        let wsServer: WebSocketRoute | null = null

        const freezeReads = () => { frozenLines = lines.map(l => ({ ...l })) }
        const unfreezeReads = () => { frozenLines = null }

        const emitJournal = () => {
          setTimeout(() => {
            const channel = `datasets/${datasetId}/journal`
            for (const type of ['index-start', 'index-end', 'finalize-start', 'finalize-end']) {
              wsServer?.send(JSON.stringify({ channel, type: 'journal', data: { type } }))
            }
          }, 200)
        }

        await page.route('**/simple-directory/**', route => route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: `window.__PUBLIC_SITE_INFO = ${JSON.stringify(siteInfo)}`
        }))

        await page.routeWebSocket(/\/ws$/, ws => {
          wsServer = ws
          ws.onMessage(message => {
            const data = JSON.parse(String(message))
            if (data.type === 'subscribe') {
              ws.send(JSON.stringify({ type: 'subscribe-confirm', channel: data.channel }))
            }
          })
        })

        await page.route(`**${datasetHref}/**`, async (route) => {
          const request = route.request()
          const url = new URL(request.url())
          const pathname = url.pathname
          const suffix = pathname.slice(datasetHref.length)

          // GET /lines — liste d'un dossier, enfants d'un préfixe, ou scan complet pour l'extraction des dossiers
          if (suffix === '/lines' && request.method() === 'GET') {
            const source = frozenLines ?? lines
            if (url.searchParams.get('select') === 'path') {
              return route.fulfill({ json: { results: source } })
            }
            const qs = url.searchParams.get('qs') ?? ''
            const scanMatch = qs.match(/\(path:([^)]+)\)/)
            if (scanMatch) {
              let prefix = scanMatch[1].replace(/\\\//g, '/').replace(/\\ /g, ' ')
              prefix = prefix.replace(/\*$/, '')
              return route.fulfill({ json: { results: source.filter(l => l.path.startsWith(prefix)) } })
            }
            const path = qs.match(/path:"([^"]+)"/)?.[1] ?? '/'
            return route.fulfill({ json: { results: source.filter(l => l.path === path) } })
          }

          // POST /lines — création de dossier (json), création de fichier (multipart)
          // ou remplacement d'un fichier existant (_action=update)
          if (suffix === '/lines' && request.method() === 'POST') {
            const contentType = request.headers()['content-type'] ?? ''
            if (contentType.includes('application/json')) {
              const body = request.postDataJSON()
              const created: MockLine = {
                _id: nextId(),
                nom: body.nom,
                path: body.path,
                type_mime: body.type_mime ?? '',
                nbrevisions: 0
              }
              lines.push(created)
              emitJournal()
              return route.fulfill({ status: 201, json: created })
            }
            const data = request.postDataBuffer()
            const action = multipartField(data, '_action')
            const nom = multipartField(data, 'nom') ?? 'nouveau-fichier'
            const isUpdate = action === 'update'
            const id = multipartField(data, '_id') ?? nextId()
            const existing = lines.find(l => l._id === id)
            const line: MockLine = {
              _id: id,
              nom,
              path: multipartField(data, 'path') ?? existing?.path ?? '/',
              attachmentPath: `${id}/${nextId()}/${nom}`,
              taille: Number(multipartField(data, 'taille') ?? '0'),
              type_mime: multipartField(data, 'type_mime') ?? '',
              datecreation: multipartField(data, 'datecreation') ?? new Date().toISOString(),
              datemodification: new Date().toISOString(),
              nbrevisions: isUpdate ? Number(multipartField(data, 'nbrevisions') ?? '1') : 1
            }
            if (isUpdate && existing) {
              Object.assign(existing, line)
              emitJournal()
              return route.fulfill({ status: 200, json: existing })
            }
            lines.push(line)
            emitJournal()
            return route.fulfill({ status: 201, json: line })
          }

          // POST /_bulk_lines — suppression
          if (suffix === '/_bulk_lines' && request.method() === 'POST') {
            const body = request.postDataJSON() as Array<{ _action: string, _id: string }>
            for (const op of body) {
              if (op._action === 'delete') {
                const index = lines.findIndex(l => l._id === op._id)
                if (index !== -1) lines.splice(index, 1)
              }
            }
            emitJournal()
            return route.fulfill({ json: { nbDeleted: body.length } })
          }

          // GET /lines/{id}/revisions
          const revisionsMatch = suffix.match(/^\/lines\/([^/]+)\/revisions$/)
          if (revisionsMatch && request.method() === 'GET') {
            const line = lines.find(l => l._id === revisionsMatch[1])
            if (!line) return route.fulfill({ status: 404, json: {} })
            return route.fulfill({
              json: {
                results: [
                  line,
                  { ...line, attachmentPath: `${line._id}/old/${line.nom}`, datemodification: '2026-01-01T10:00:00.000Z' }
                ]
              }
            })
          }

          // PATCH /lines/{id} — renommage ou changement de path
          const lineMatch = suffix.match(/^\/lines\/([^/]+)$/)
          if (lineMatch && request.method() === 'PATCH') {
            const line = lines.find(l => l._id === lineMatch[1])
            if (!line) return route.fulfill({ status: 404, json: {} })
            const contentType = request.headers()['content-type'] ?? ''
            if (contentType.includes('application/json')) {
              const body = request.postDataJSON()
              if (body.nom !== undefined) line.nom = body.nom
              if (body.path !== undefined) line.path = body.path
            } else {
              const data = request.postDataBuffer()
              const nom = multipartField(data, 'nom')
              const path = multipartField(data, 'path')
              if (nom !== null) line.nom = nom
              if (path !== null) line.path = path
            }
            emitJournal()
            return route.fulfill({ status: 200, json: line })
          }

          // GET /attachments/...
          if (suffix.startsWith('/attachments/')) {
            return route.fulfill({ status: 200, contentType: 'text/plain', body: 'contenu du fichier' })
          }

          return route.fulfill({ status: 404, json: {} })
        })

        await page.addInitScript((app) => {
          Object.defineProperty(window, 'APPLICATION', { value: app, writable: false, configurable: false })
        }, {
          id: 'app0',
          slug: 'ged-test',
          title: 'GED test',
          href: `${baseUrl}/app/app0`,
          exposedUrl: `${baseUrl}/app/app0`,
          wsUrl: `ws://${new URL(baseUrl).host}/ws`,
          configuration: {
            datasets: [{ id: datasetId, href: datasetHref, title: 'Test-GED', finalizedAt: '2026-01-01T00:00:00.000Z' }]
          }
        })

        await use({ page, emitJournal, lines, freezeReads, unfreezeReads })
      }
    })

export { expect } from '@playwright/test'
