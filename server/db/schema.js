import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const specs = pgTable('specs', {
  id: uuid('id').primaryKey(),
  intent: text('intent').notNull(),
  type: text('type').notNull().default('text'),
  status: text('status').notNull().default('pending'),
  acceptanceCriteria: jsonb('acceptance_criteria').default([]),
  suggestedTests: jsonb('suggested_tests').default([]),
  userId: text('user_id'),
  createdAt: timestamp('created_at').defaultNow()
})