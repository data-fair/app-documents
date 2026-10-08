export type MetadataType = 'string' | 'number' | 'boolean' | 'date'

export interface MetadataField {
  key: string
  title: string
  type?: MetadataType
  required?: boolean
  searchable?: boolean
}

export interface GedSchemaField {
  key: string
  type?: string
  format?: string
  title?: string
  description?: string
  'x-refersTo'?: string
  'x-required'?: boolean
}

export const ATTACHMENT_FIELD_KEY = 'attachmentPath'

// colonnes techniques attendues par la GED, dans l'ordre de création
export const TECHNICAL_FIELDS: GedSchemaField[] = [
  { key: 'path', type: 'string', title: 'Dossier', description: 'Chemin du dossier contenant le document' },
  { key: 'nom', type: 'string', title: 'Nom' },
  { key: 'type_mime', type: 'string', title: 'Type MIME' },
  { key: 'taille', type: 'integer', title: 'Taille' },
  { key: 'nbrevisions', type: 'integer', title: 'Nombre de révisions' },
  { key: 'datecreation', type: 'string', format: 'date-time', title: 'Date de création' },
  { key: 'datemodification', type: 'string', format: 'date-time', title: 'Date de modification' },
  { key: ATTACHMENT_FIELD_KEY, type: 'string', title: 'Pièce jointe', description: 'Fichier rattaché au document', 'x-refersTo': 'http://schema.org/DigitalDocument' }
]

export function metadataToSchemaField (field: MetadataField): GedSchemaField {
  const base: GedSchemaField = { key: field.key, title: field.title }
  if (field.required) base['x-required'] = true
  switch (field.type) {
    case 'number': return { ...base, type: 'number' }
    case 'boolean': return { ...base, type: 'boolean' }
    case 'date': return { ...base, type: 'string', format: 'date-time' }
    default: return { ...base, type: 'string' }
  }
}

export function buildDatasetSchema (metadata: MetadataField[] = []): GedSchemaField[] {
  return [...TECHNICAL_FIELDS, ...metadata.map(metadataToSchemaField)]
}

// fusion additive d'un schéma existant avec le schéma désiré : on ajoute les colonnes manquantes,
// on n'en supprime jamais (pas de perte de données)
export function mergeDatasetSchema (current: GedSchemaField[] = [], desired: GedSchemaField[] = []): { schema: GedSchemaField[], changed: boolean } {
  const schema = [...current]
  const keys = new Set(schema.map(f => f.key))
  let changed = false
  for (const field of desired) {
    if (!keys.has(field.key)) {
      schema.push(field)
      keys.add(field.key)
      changed = true
    }
  }
  return { schema, changed }
}

// champs interrogés par la recherche plein-texte : le nom et les métadonnées textuelles
export function searchableFields (metadata: MetadataField[] = []): string[] {
  return ['nom', ...metadata.filter(f => f.searchable !== false && f.type !== 'boolean' && f.type !== 'date').map(f => f.key)]
}

export function buildSearchQuery (q: string, metadata: MetadataField[] = []) {
  return {
    q: q.trim(),
    q_fields: searchableFields(metadata).join(',')
  }
}

// les clés de métadonnées doivent rester hors des colonnes techniques
export function metadataKeyError (metadata: MetadataField[] = []): string | null {
  const reserved = new Set(TECHNICAL_FIELDS.map(f => f.key))
  const seen = new Set<string>()
  for (const field of metadata) {
    if (reserved.has(field.key)) return `La clé "${field.key}" est réservée par la GED`
    if (seen.has(field.key)) return `La clé "${field.key}" est utilisée plusieurs fois`
    seen.add(field.key)
  }
  return null
}
