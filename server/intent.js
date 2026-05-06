import { randomUUID } from 'crypto'
import { db, specs } from './db/index.js'

export async function createSpec({ solution, outcome, opportunity, hypothesis, successMetric }, { userId } = {}) {
  if (!solution) throw new Error('Solution must not be empty')
  const [row] = await db.insert(specs).values({
    id: randomUUID(),
    solution,
    outcome,
    opportunity,
    hypothesis,
    successMetric,
    status: 'pending',
    userId,
  }).returning()
  return row
}
