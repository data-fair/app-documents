export interface DocumentLine {
  nom: string
  _id: string
  attachmentPath?: string
  taille?: number
  type_mime?: string
  path?: string
  datecreation?: string
  datemodification?: string
  nbrevisions?: number
  load?: boolean
  pending?: boolean
  color?: string
}

export interface LinesResponse {
  results: DocumentLine[]
  total?: number
}

export function escapeQueryPath (p: string): string {
  return p.replace(/\//g, '\\/').replace(/ /g, '\\ ') // could fail if regexp dont work and provoque error 400
}

export function extractFolderNames (results: Array<{ path?: string }>, currentPath: string): string[] {
  const segmentCount = currentPath.split('/').length
  const names = new Set<string>()
  for (const result of results) {
    if (result.path === undefined) continue
    const segments = result.path.split('/')
    const name = segments[segmentCount - 1]
    if (name !== undefined && name !== '') names.add(name)
  }
  return [...names]
}

export function buildLinesMap (results: DocumentLine[], folderNames: string[], currentPath: string): Map<string, DocumentLine> {
  const lines = new Map<string, DocumentLine>()
  for (const result of results) {
    lines.set(result._id, { ...result })
  }
  for (const name of folderNames) {
    lines.set(name, { nom: name, _id: name, path: currentPath, attachmentPath: undefined })
  }
  return lines
}

export function mergePendingLines (lines: Map<string, DocumentLine>, previous: Map<string, DocumentLine>, currentPath: string): Map<string, DocumentLine> {
  for (const [id, line] of previous) {
    if (line.pending === true && line.path === currentPath && !lines.has(id)) {
      lines.set(id, line)
    }
  }
  return lines
}

export function navigatePath (currentPathArray: string[], target: string): { newPath: string, newPathArray: string[] } {
  if (target === '/') {
    return { newPath: '/', newPathArray: [] }
  }
  if (currentPathArray.includes(target)) {
    const copy = [...currentPathArray]
    let i = copy.length - 1
    while (copy[i] !== target && i > -1) {
      copy.pop()
      i--
    }
    return { newPath: '/' + copy.join('/') + '/', newPathArray: copy }
  }
  const copy = [...currentPathArray, target]
  return { newPath: '/' + copy.join('/') + '/', newPathArray: copy }
}

export function displaySize (n: number): string {
  if (n / 1000000 > 1) { // display Mo
    return (n / 1000000).toFixed(1) + ' Mo'
  } else if (n / 1000 > 1) { // display Ko
    return (n / 1000).toFixed(1) + ' Ko'
  }
  return n + ' o'
}
