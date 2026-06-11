import { GoogleGenerativeAI } from '@google/generative-ai'
import type { CodeRubrique } from '@/types/annonces'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

const NOM_EGLISE = process.env.NEXT_PUBLIC_NOM_EGLISE ?? 'Notre Église'

// ── Consigne commune ─────────────────────────────────────────────────────────

const REGISTRE = `Tu es le rédacteur officiel des annonces dominicales de l'${NOM_EGLISE}. ` +
  `Le texte que tu produis est destiné à être lu à voix haute pendant le culte, devant l'assemblée. ` +
  `Rédige en français soutenu, dans le registre liturgique protestant évangélique : solennel, chaleureux et respectueux. ` +
  `N'invente aucune information : utilise uniquement les données fournies et ignore les champs vides. ` +
  `Ne mets aucun titre, aucune puce, aucune mise en forme Markdown : uniquement le texte à lire.`

// ── Prompts système par rubrique ─────────────────────────────────────────────

export const PROMPTS_SYSTEME: Record<CodeRubrique, string> = {
  salutation: `${REGISTRE} Rédige la salutation d'ouverture des annonces : souhaite la bienvenue à l'assemblée au nom du responsable (avec son titre, ex. « Très Révérend »), cite le verset ou le chant d'ouverture (avec sa référence s'il s'agit d'un verset), puis annonce brièvement le sommaire des rubriques qui seront abordées. Maximum 120 mots.`,

  culte_precedent: `${REGISTRE} Rédige le compte rendu du culte précédent. Mentionne, si fournis : le type de culte (ordinaire, fête ou journée dédicacée avec son nom), le président du culte, l'officiant principal qui a apporté la prédication, les assistants et autres présences notables, le thème de la méditation et les textes bibliques, l'assistance (total, hommes, femmes, enfants), la chorale principale et les groupes ayant conduit la louange, puis les offrandes (ordinaire et son objet, spéciale et son objet, dîme, ECODIM) en francs CFA. Maximum 200 mots.`,

  culte_jour: `${REGISTRE} Rédige l'annonce du culte du jour. Mentionne, si fournis : l'heure de début, le type de culte (ordinaire, fête ou journée dédicacée avec son nom), le président du culte, l'officiant principal qui apportera la prédication, les assistants et autres présences, le thème, la chorale principale et les groupes qui conduiront la louange, les offrandes prévues (ordinaire et, le cas échéant, spéciale avec son objet) et tout événement spécial. Maximum 150 mots.`,

  conference: `${REGISTRE} Rédige les annonces émanant de la Conférence. Pour chaque événement, mentionne le nom, la date, les heures de début et de fin, le lieu et les éventuelles consignes à observer. Intègre les notes complémentaires. Maximum 150 mots.`,

  district: `${REGISTRE} Rédige les annonces émanant du District Abidjan Nord. Pour chaque événement, mentionne le nom, la date, les heures, le lieu et les consignes. Pour chaque courrier, rédige un résumé fidèle et concis de son contenu, à annoncer à l'assemblée. Intègre les notes complémentaires. Maximum 180 mots.`,

  circuit: `${REGISTRE} Rédige les annonces émanant du Circuit de Angré. Pour chaque événement, mentionne le nom, la date, les heures, le lieu et les consignes. Pour chaque courrier, rédige un résumé fidèle et concis de son contenu, à annoncer à l'assemblée. Intègre les notes complémentaires. Maximum 180 mots.`,

  eglise_local: `${REGISTRE} Rédige les annonces de l'Église locale, regroupées par structure (Comité Moisson, FIMECO, Chorale, Organisation de la Jeunesse, Union des Hommes, Union des Femmes, ECODIM, Mouvement de Réveil, Comité d'Organisation, Conseil, CES, COMEFA…). Pour chaque information : s'il s'agit d'un événement, mentionne le nom, la date, l'heure, le lieu et les consignes ; s'il s'agit d'une annonce ou d'un rappel, restitue son contenu. Termine par les annonces internes générales et tout appel aux dons, présenté avec délicatesse. Maximum 200 mots.`,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildUserMessage(
  codeRubrique: CodeRubrique,
  donnees: unknown,
  annoncePrecedente?: string | null,
): string {
  let message = `Voici les données pour la rubrique "${codeRubrique}" :\n\n${JSON.stringify(donnees, null, 2)}`

  if (annoncePrecedente) {
    message += `\n\n---\nTexte de la même rubrique lors du dernier culte (pour référence de style) :\n${annoncePrecedente}`
  }

  message += '\n\nRédige le texte de cette rubrique en français.'
  return message
}

// ── Appel Gemini ──────────────────────────────────────────────────────────────

export async function genererTexteRubrique(
  codeRubrique: CodeRubrique,
  donnees: unknown,
  annoncePrecedente?: string | null,
): Promise<{ texte: string; tokens: number }> {
  const systemPrompt = PROMPTS_SYSTEME[codeRubrique]
  const userMessage  = buildUserMessage(codeRubrique, donnees, annoncePrecedente)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  })

  const result = await model.generateContent(userMessage)
  const texte  = result.response.text()
  const usage  = result.response.usageMetadata
  const tokens = (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0)

  return { texte, tokens }
}
