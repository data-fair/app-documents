import { test, expect } from '@playwright/test'
import {
  ATTACHMENT_FIELD_KEY,
  buildDatasetSchema,
  buildSearchQuery,
  mergeDatasetSchema,
  metadataKeyError,
  metadataToSchemaField,
  searchableFields
} from '../../src/assets/ged'

test.describe('buildDatasetSchema', () => {
  test('adds the technical columns and the attachment', () => {
    const schema = buildDatasetSchema()
    const keys = schema.map(f => f.key)
    expect(keys).toEqual(['path', 'nom', 'type_mime', 'taille', 'nbrevisions', 'datecreation', 'datemodification', ATTACHMENT_FIELD_KEY])
    const attachment = schema.find(f => f.key === ATTACHMENT_FIELD_KEY)
    expect(attachment?.['x-refersTo']).toBe('http://schema.org/DigitalDocument')
  })

  test('adds the configured metadata fields', () => {
    const schema = buildDatasetSchema([{ key: 'auteur', title: 'Auteur' }])
    expect(schema.at(-1)).toMatchObject({ key: 'auteur', title: 'Auteur', type: 'string' })
  })
})

test.describe('metadataToSchemaField', () => {
  test('maps the types to the data-fair schema', () => {
    expect(metadataToSchemaField({ key: 'a', title: 'A', type: 'number' })).toEqual({ key: 'a', title: 'A', type: 'number' })
    expect(metadataToSchemaField({ key: 'b', title: 'B', type: 'boolean' })).toEqual({ key: 'b', title: 'B', type: 'boolean' })
    expect(metadataToSchemaField({ key: 'c', title: 'C', type: 'date' })).toEqual({ key: 'c', title: 'C', type: 'string', format: 'date' })
  })

  test('marks the required fields', () => {
    expect(metadataToSchemaField({ key: 'a', title: 'A', required: true })).toMatchObject({ 'x-required': true })
  })
})

test.describe('searchableFields', () => {
  test('includes the name, the text metadata and the text of the files', () => {
    const fields = searchableFields([
      { key: 'auteur', title: 'Auteur', type: 'string' },
      { key: 'montant', title: 'Montant', type: 'number' },
      { key: 'masque', title: 'Masqué', type: 'string', searchable: false },
      { key: 'paye', title: 'Payé', type: 'boolean' }
    ])
    expect(fields).toEqual(['nom', 'auteur', 'montant', '_file.content'])
  })
})

test.describe('buildSearchQuery', () => {
  test('builds the full-text query', () => {
    expect(buildSearchQuery('  rapport  ', [{ key: 'auteur', title: 'Auteur' }])).toEqual({
      q: 'rapport',
      q_fields: 'nom,auteur,_file.content'
    })
  })

  test('cleans an empty search', () => {
    expect(buildSearchQuery('   ')).toEqual({ q: '', q_fields: 'nom,_file.content' })
  })
})

test.describe('mergeDatasetSchema', () => {
  test('adds the missing columns', () => {
    const { schema, changed } = mergeDatasetSchema(
      [{ key: 'nom', type: 'string' }],
      [{ key: 'nom', type: 'string' }, { key: 'auteur', type: 'string' }]
    )
    expect(changed).toBe(true)
    expect(schema.map(f => f.key)).toEqual(['nom', 'auteur'])
  })

  test('changes nothing when the schema is complete', () => {
    const current = [{ key: 'nom', type: 'string' }, { key: 'auteur', type: 'string' }]
    const { schema, changed } = mergeDatasetSchema(current, [{ key: 'nom' }, { key: 'auteur' }])
    expect(changed).toBe(false)
    expect(schema).toEqual(current)
  })

  test('never removes an existing column', () => {
    const { schema, changed } = mergeDatasetSchema([{ key: 'ancien', type: 'string' }], [{ key: 'nouveau' }])
    expect(changed).toBe(true)
    expect(schema.map(f => f.key)).toEqual(['ancien', 'nouveau'])
  })
})

test.describe('metadataKeyError', () => {
  test('refuses a reserved key', () => {
    expect(metadataKeyError([{ key: 'path', title: 'Chemin' }])).toContain('réservée')
  })

  test('refuses a duplicate key', () => {
    expect(metadataKeyError([{ key: 'a', title: 'A' }, { key: 'a', title: 'B' }])).toContain('plusieurs fois')
  })

  test('accepts valid keys', () => {
    expect(metadataKeyError([{ key: 'auteur', title: 'Auteur' }])).toBeNull()
  })
})
