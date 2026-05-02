import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'
import type { RubriqueAnnonce } from '@/types/annonces'
import type { Culte } from '@/lib/annonces'

// ── Labels ─────────────────────────────────────────────────────────────────

const LABELS: Record<string, string> = {
  salutation:      'Salutation',
  culte_precedent: 'Culte précédent',
  culte_jour:      'Culte du jour',
  conference:      'Conférence',
  district:        'District',
  circuit:         'Circuit',
  eglise_local:    'Église locale',
}

// ── Styles ─────────────────────────────────────────────────────────────────

const NAVY = '#1A3A5C'
const GOLD  = '#C4A44A'

const s = StyleSheet.create({
  page: {
    fontFamily:  'Helvetica',
    paddingTop:    56,
    paddingBottom: 56,
    paddingLeft:   56,
    paddingRight:  56,
    backgroundColor: '#FFFFFF',
  },

  // En-tête
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  churchName: {
    fontSize:    10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color:       NAVY,
    marginBottom: 6,
  },
  title: {
    fontSize:    20,
    fontFamily:  'Helvetica-Bold',
    letterSpacing: 4,
    textTransform: 'uppercase',
    color:       NAVY,
    marginBottom: 4,
  },
  dateText: {
    fontSize:    10,
    color:       '#555555',
  },

  // Séparateur doré
  divider: {
    height:          1.5,
    backgroundColor: GOLD,
    marginVertical:  14,
  },

  // Rubriques
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize:    11,
    fontFamily:  'Helvetica-Bold',
    textTransform: 'uppercase',
    color:       NAVY,
    letterSpacing: 1,
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D0D9E3',
  },
  sectionBody: {
    fontSize:    10,
    lineHeight:  1.5,
    color:       '#333333',
  },
  emptyRubrique: {
    fontSize:    10,
    color:       '#AAAAAA',
    fontStyle:   'italic',
  },

  // Pied de page
  footer: {
    position:   'absolute',
    bottom:     28,
    left:       56,
    right:      56,
    borderTopWidth: 0.5,
    borderTopColor: '#D0D9E3',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7.5,
    color:    '#999999',
  },
})

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  return d.charAt(0).toUpperCase() + d.slice(1)
}

function formatGenerationDate() {
  return new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Composant ──────────────────────────────────────────────────────────────

interface Props {
  culte:     Culte
  rubriques: RubriqueAnnonce[]
  nomEglise: string
}

export default function AnnoncePDF({ culte, rubriques, nomEglise }: Props) {
  return (
    <Document
      title={`Annonces du ${culte.date_culte}`}
      author={nomEglise}
      subject="Annonces du culte"
    >
      <Page size="A4" style={s.page}>

        {/* En-tête */}
        <View style={s.header}>
          <Text style={s.churchName}>{nomEglise}</Text>
          <Text style={s.title}>Annonces du culte</Text>
          <Text style={s.dateText}>{formatDate(culte.date_culte)}</Text>
        </View>

        {/* Séparateur doré */}
        <View style={s.divider} />

        {/* Rubriques */}
        {rubriques.map((rubrique) => (
          <View key={rubrique.id} style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>
              {LABELS[rubrique.code_rubrique] ?? rubrique.code_rubrique}
            </Text>
            {rubrique.texte_final ? (
              <Text style={s.sectionBody}>{rubrique.texte_final}</Text>
            ) : (
              <Text style={s.emptyRubrique}>— Rubrique non complétée —</Text>
            )}
          </View>
        ))}

        {/* Pied de page */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Préparé par le Département Communication</Text>
          <Text style={s.footerText}>Généré le {formatGenerationDate()}</Text>
        </View>

      </Page>
    </Document>
  )
}
