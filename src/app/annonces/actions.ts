'use server'

import { revalidatePath } from 'next/cache'
import { deleteCulte } from '@/lib/annonces'

export type ActionResult = { success: true } | { success: false; error: string }

export async function supprimerCulteAction(culteId: string): Promise<ActionResult> {
  const result = await deleteCulte(culteId)
  if (result.error) return { success: false, error: result.error }
  revalidatePath('/annonces')
  return { success: true }
}
