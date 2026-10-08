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
  test('ajoute les colonnes techniques et la pièce jointe', () => {
    const schema = buildDatasetSchema()
    const keys = schema.map(f => f.key)
    expect(keys).toEqual(['path', 'nom', 'type_mime', 'taille', 'nbrevisions', 'datecreation', 'datemodification', ATTACHMENT_FIELD_KEY])
    const attachment = schema.find(f => f.key === ATTACHMENT_FIELD_KEY)
    expect(attachment?.['x-refersTo']).toBe('http://schema.org/DigitalDocument')
  })

  test('ajoute les champs de métadonnées configurés', () => {
    const schema = buildDatasetSchema([{ key: 'auteur', title: 'Auteur' }])
    expect(schema.at(-1)).toMatchObject({ key: 'auteur', title: 'Auteur', type: 'string' })
  })
})

test.describe('metadataToSchemaField', () => {
  test('mappe les types vers le schéma data-fair', () => {
    expect(metadataToSchemaField({ key: 'a', title: 'A', type: 'number' })).toEqual({ key: 'a', title: 'A', type: 'number' })
    expect(metadataToSchemaField({ key: 'b', title: 'B', type: 'boolean' })).toEqual({ key: 'b', title: 'B', type: 'boolean' })
    expect(metadataToSchemaField({ key: 'c', title: 'C', type: 'date' })).toEqual({ key: 'c', title: 'C', type: 'string', format: 'date-time' })
  })

  test('marque les champs obligatoires', () => {
    expect(metadataToSchemaField({ key: 'a', title: 'A', required: true })).toMatchObject({ 'x-required': true })
  })
})

test.describe('searchableFields', () => {
  test('inclut le nom et les métadonnées textuelles', () => {
    const fields = searchableFields([
      { key: 'auteur', title: 'Auteur', type: 'string' },
      { key: 'montant', title: 'Montant', type: 'number' },
      { key: 'masque', title: 'Masqué', type: 'string', searchable: false },
      { key: 'paye', title: 'Payé', type: 'boolean' }
    ])
    expect(fields).toEqual(['nom', 'auteur', 'montant'])
  })
})

test.describe('buildSearchQuery', () => {
  test('construit la requête plein-texte', () => {
    expect(buildSearchQuery('  rapport  ', [{ key: 'auteur', title: 'Auteur' }])).toEqual({
      q: 'rapport',
      q_fields: 'nom,auteur'
    })
  })

  test('nettoie une recherche vide', () => {
    expect(buildSearchQuery('   ')).toEqual({ q: '', q_fields: 'nom' })
  })
})

test.describe('mergeDatasetSchema', () => {
  test('ajoute les colonnes manquantes', () => {
    const { schema, changed } = mergeDatasetSchema(
      [{ key: 'nom', type: 'string' }],
      [{ key: 'nom', type: 'string' }, { key: 'auteur', type: 'string' }]
    )
    expect(changed).toBe(true)
    expect(schema.map(f => f.key)).toEqual(['nom', 'auteur'])
  })

  test('ne change rien quand le schéma est complet', () => {
    const current = [{ key: 'nom', type: 'string' }, { key: 'auteur', type: 'string' }]
    const { schema, changed } = mergeDatasetSchema(current, [{ key: 'nom' }, { key: 'auteur' }])
    expect(changed).toBe(false)
    expect(schema).toEqual(current)
  })

  test('ne supprime jamais une colonne existante', () => {
    const { schema, changed } = mergeDatasetSchema([{ key: 'ancien', type: 'string' }], [{ key: 'nouveau' }])
    expect(changed).toBe(true)
    expect(schema.map(f => f.key)).toEqual(['ancien', 'nouveau'])
  })
})

test.describe('metadataKeyError', () => {
  test('refuse une clé réservée', () => {
    expect(metadataKeyError([{ key: 'path', title: 'Chemin' }])).toContain('réservée')
  })

  test('refuse une clé en doublon', () => {
    expect(metadataKeyError([{ key: 'a', title: 'A' }, { key: 'a', title: 'B' }])).toContain('plusieurs fois')
  })

  test('accepte des clés valides', () => {
    expect(metadataKeyError([{ key: 'auteur', title: 'Auteur' }])).toBeNull()
  })
})
