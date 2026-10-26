import { describe, expect, it } from 'vitest'
import { emailIlikePattern, normalizeEmail } from './email'

describe('normalizeEmail', () => {
  it('met en minuscules et retire les espaces', () => {
    expect(normalizeEmail('  Jean.Kouassi@Exemple.CI ')).toBe('jean.kouassi@exemple.ci')
  })
})

describe('emailIlikePattern', () => {
  it('échappe les jokers ILIKE', () => {
    expect(emailIlikePattern('a_b%c\\d@x.ci')).toBe('a\\_b\\%c\\\\d@x.ci')
  })
})
