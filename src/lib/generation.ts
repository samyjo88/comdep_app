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

// ── Annonce complète ──────────────────────────────────────────────────────────

const NOM_EGLISE_COMPLET = process.env.NEXT_PUBLIC_NOM_EGLISE ?? 'Église Horeb de la Cité SIR'

export const SYSTEM_PROMPT_ANNONCE_COMPLETE = `Tu es l'assistant de communication de l'${NOM_EGLISE_COMPLET}, une église méthodiste à Abidjan, Côte d'Ivoire.

Tu rédiges les annonces dominicales en français soutenu, dans un registre liturgique protestant évangélique, au style oral solennel, destinées à être lues à voix haute pendant le culte.

RÈGLES IMPÉRATIVES :
1. Tous les montants en FCFA sont écrits en toutes lettres.
   Exemples : 101325 → « cent un mille trois cent vingt-cinq francs »
              37000  → « trente-sept mille francs »
   Les conversions en toutes lettres sont fournies dans les données : utilise-les telles quelles.
2. Les effectifs (assistance) sont écrits en toutes lettres.
   Exemple : 189 → « cent quatre-vingt-neuf »
3. Le texte est continu, sans titres, sans puces, sans numéros.
4. Respect strict de l'ordre des rubriques :
   Salutation → Culte précédent → Culte du jour → Conférence →
   District Abidjan Nord → Circuit Angré → Église locale.
5. N'inclus que les rubriques qui ont des données renseignées. N'invente aucune information.
6. Formules consacrées à utiliser :
   - « Que Dieu bénisse chaque main qui a donné » (après les offrandes)
   - « Que la grâce et la paix du Saint-Esprit reposent sur chacun de vous »
   - « Bien-aimés dans le Seigneur, chers frères et sœurs »
7. Pour les courriers : utilise le résumé validé s'il existe, sinon résume toi-même
   le contenu brut en 2-3 phrases.
8. Pour les événements : annonce la date, l'heure, le lieu et les consignes
   de façon naturelle et fluide.
9. Termine chaque grande rubrique par une transition naturelle vers la suivante.
10. Le ton doit être solennel mais chaleureux, comme un annonceur d'église
    expérimenté qui parle à sa communauté.`

export async function genererAnnonceComplete(
  userPrompt: string,
): Promise<{ texte: string; tokens: number }> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT_ANNONCE_COMPLETE,
  })

  const result = await model.generateContent(userPrompt)
  const texte  = result.response.text()
  const usage  = result.response.usageMetadata
  const tokens = (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0)

  return { texte, tokens }
}

// ── Résumé de courrier ────────────────────────────────────────────────────────

const SYSTEM_PROMPT_RESUME_COURRIER =
  'Résume ce courrier d\'église en 3-4 phrases maximum, en français soutenu, ' +
  'de façon neutre et informative. Ne commence pas par « Ce courrier » ou ' +
  '« Le courrier ». Commence directement par le contenu résumé. ' +
  'Réponds uniquement avec le résumé, sans préambule ni mise en forme.'

export async function resumerCourrier(
  contenu: string,
  objet?: string,
): Promise<{ resume: string }> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT_RESUME_COURRIER,
  })

  const message = objet ? `Objet du courrier : ${objet}\n\nContenu :\n${contenu}` : contenu
  const result  = await model.generateContent(message)

  return { resume: result.response.text().trim() }
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
