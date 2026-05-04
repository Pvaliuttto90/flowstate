import { randomUUID } from 'crypto'
import { db, specs } from './db/index.js'

export async function createSpec(intent) {
  if (!intent) throw new Error('Intent must not be empty')
  const [row] = await db.insert(specs).values({
    id: randomUUID(),
    intent,
    status: 'pending',
  }).returning()
  return row
}
