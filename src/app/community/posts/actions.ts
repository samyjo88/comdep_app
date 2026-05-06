'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/api-auth'
import { createPost, updatePost, deletePost, updateStatutPost } from '@/lib/community'
import type { PostPayload, PostUpdatePayload } from '@/lib/community'
import type { StatutPost } from '@/types/community'

async function checkAuth() {
  const { unauthorized } = await requireAuth()
  if (unauthorized) throw new Error('Non autorisé')
}

export async function createPostAction(data: PostPayload) {
  await checkAuth()
  const result = await createPost(data)
  if (!result.error) revalidatePath('/community/posts')
  return result
}

export async function updatePostAction(id: string, data: PostUpdatePayload) {
  await checkAuth()
  const result = await updatePost(id, data)
  if (!result.error) revalidatePath('/community/posts')
  return result
}

export async function deletePostAction(id: string) {
  await checkAuth()
  const result = await deletePost(id)
  if (!result.error) revalidatePath('/community/posts')
  return result
}

export async function updateStatutPostAction(id: string, statut: StatutPost) {
  await checkAuth()
  const result = await updateStatutPost(id, statut)
  if (!result.error) revalidatePath('/community/posts')
  return result
}
