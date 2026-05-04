import { eq } from 'drizzle-orm'
import { db, specs } from './db/index.js'

export async function getSpec(specId) {
  const rows = await db.select().from(specs).where(eq(specs.id, specId))
  return rows[0] ?? null
}

export async function saveGeneratedTests(specId, stubs) {
  const [row] = await db.update(specs)
    .set({ generatedTests: stubs })
    .where(eq(specs.id, specId))
    .returning()
  return row
}
