import { describe, expect, it } from 'vitest'
import { montantEnLettres, nombreEnLettres } from './nombre-en-lettres'

describe('nombreEnLettres', () => {
  it.each([
    [0, 'zéro'],
    [16, 'seize'],
    [21, 'vingt et un'],
    [71, 'soixante et onze'],
    [77, 'soixante-dix-sept'],
    [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'],
    [91, 'quatre-vingt-onze'],
    [100, 'cent'],
    [200, 'deux cents'],
    [201, 'deux cent un'],
    [1000, 'mille'],
    [80_000, 'quatre-vingt mille'],
    [200_000, 'deux cent mille'],
    [101_325, 'cent un mille trois cent vingt-cinq'],
    [1_000_000, 'un million'],
    [2_000_000, 'deux millions'],
    [1_000_000_000, 'un milliard'],
  ])('%i → %s', (n, attendu) => {
    expect(nombreEnLettres(n)).toBe(attendu)
  })

  it('ignore les décimales et le signe', () => {
    expect(nombreEnLettres(-12.9)).toBe('douze')
  })

  it('renvoie une chaîne vide pour une valeur non finie', () => {
    expect(nombreEnLettres(Number.NaN)).toBe('')
  })
})

describe('montantEnLettres', () => {
  it('accorde « franc » au singulier et au pluriel', () => {
    expect(montantEnLettres(1)).toBe('un franc')
    expect(montantEnLettres(2500)).toBe('deux mille cinq cents francs')
  })
})
