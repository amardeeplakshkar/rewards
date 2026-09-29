import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

/** Drop cached public content whenever an editor changes it in the admin panel. */
export const invalidateCollectionCache = (...prefixes: string[]) => {
  const afterChange: CollectionAfterChangeHook = async ({ doc }) => {
    const { invalidateCache } = await import('@/lib/cache')
    await invalidateCache(...prefixes)
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
    const { invalidateCache } = await import('@/lib/cache')
    await invalidateCache(...prefixes)
    return doc
  }
  return { afterChange: [afterChange], afterDelete: [afterDelete] }
}

export const invalidateGlobalCache = (...prefixes: string[]): GlobalAfterChangeHook => async ({ doc }) => {
  const { invalidateCache } = await import('@/lib/cache')
  await invalidateCache(...prefixes)
  return doc
}
