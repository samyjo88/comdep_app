'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/api-auth'
import { upsertPlanningWeek } from '@/lib/community'
import type { PlanningWeekPayload } from '@/lib/community'

async function checkAuth() {
  const { unauthorized } = await requireAuth()
  if (unauthorized) throw new Error('Non autorisé')
}

export async function upsertPlanningAction(data: PlanningWeekPayload) {
  await checkAuth()
  const result = await upsertPlanningWeek(data)
  if (!result.error) revalidatePath('/community/planning')
  return result
}
