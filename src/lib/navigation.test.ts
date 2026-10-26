import { describe, expect, it } from 'vitest'
import { estActif, modulesVisibles, NAV_MODULES } from './navigation'

describe('estActif', () => {
  it('le tableau de bord n’est actif que sur sa propre page', () => {
    expect(estActif('/dashboard', '/dashboard')).toBe(true)
    expect(estActif('/dashboard/planning-dimanche', '/dashboard')).toBe(false)
  })

  it('un module est actif sur ses sous-pages', () => {
    expect(estActif('/sonorisation/inventaire', '/sonorisation')).toBe(true)
  })

  it('ne confond pas deux chemins au préfixe commun', () => {
    expect(estActif('/annonces-archives', '/annonces')).toBe(false)
  })
})

describe('modulesVisibles', () => {
  it('null donne accès à tous les modules', () => {
    expect(modulesVisibles(null)).toHaveLength(NAV_MODULES.length)
  })

  it('filtre selon les modules accessibles', () => {
    expect(modulesVisibles(['son', 'annonces']).map(m => m.key)).toEqual(['son', 'annonces'])
  })

  it('aucun module pour une liste vide', () => {
    expect(modulesVisibles([])).toEqual([])
  })
})
