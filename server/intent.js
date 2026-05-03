import { randomUUID } from 'crypto'

export function createSpec(intent) {
  if (!intent) throw new Error('Intent must not be empty')
  return {
    id: randomUUID(),
    intent,
    status: 'pending',
    createdAt: new Date(),
  }
}
