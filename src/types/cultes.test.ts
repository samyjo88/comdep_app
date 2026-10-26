import { describe, expect, it } from 'vitest'
import { formatHeure, typeParDefaut, type CulteProgramme } from './cultes'
import { lignesPreparation, progression } from '@/components/cultes/EtatPreparation'

describe('typeParDefaut', () => {
  it('un dimanche est un culte dominical', () => {
    expect(typeParDefaut('2026-11-01')).toBe('dominical')
  })
  it('un jeudi est un culte de semaine', () => {
    expect(typeParDefaut('2026-11-05')).toBe('semaine')
  })
})

describe('formatHeure', () => {
  it('formate l’heure à la française', () => {
    expect(formatHeure('18:30:00')).toBe('18h30')
    expect(formatHeure('09:00')).toBe('9h00')
    expect(formatHeure(null)).toBeNull()
  })
})

const base: CulteProgramme = {
  id: 'c1', date_culte: '2026-11-05', heure_debut: '18:30:00', type_culte: 'semaine',
  libelle: null, theme: null, predicateur: null,
  annonce: null, setlist: null, son: null, captation: [], projection: [],
}

describe('préparation d’un culte', () => {
  it('un culte vide est à 0 % et tout est à faire', () => {
    const l = lignesPreparation(base)
    expect(l.every(x => x.etat === 'manquant')).toBe(true)
    expect(progression(l)).toBe(0)
  })

  it('un culte entièrement préparé est à 100 %', () => {
    const membre = { id: '1', nom: 'Jean Kouassi', email: 'jean@exemple.ci' }
    const l = lignesPreparation({
      ...base,
      annonce:   { id: 'a', statut_global: 'valide' },
      setlist:   { id: 's', statut: 'valide', nbChants: 5 },
      son:       { id: 1, affectations: { responsable: membre } },
      captation: [{ role: 'cameraman', membre }, { role: 'photographe', membre }],
    })
    expect(progression(l)).toBe(100)
  })

  it('la sono sans responsable reste à compléter', () => {
    const membre = { id: '2', nom: 'Awa Koné', email: null }
    const sono = lignesPreparation({ ...base, son: { id: 1, affectations: { assistant1: membre } } })
      .find(x => x.label === 'Sono')!
    expect(sono.etat).toBe('partiel')
    expect(sono.detail).toBe('À désigner')
  })
})
