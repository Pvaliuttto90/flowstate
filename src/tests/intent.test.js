import { describe, it, expect } from 'vitest'
import { createSpec } from '../../server/intent.js'

describe('Intent → Spec', () => {
  it('creates a spec object from a user intent string', () => {
    const intent = 'Add a login page with email and password fields'

    const spec = createSpec(intent)

    expect(spec).toMatchObject({
      id: expect.any(String),
      intent,
      status: 'pending',
      createdAt: expect.any(Date),
    })
    expect(spec.id.length).toBeGreaterThan(0)
  })

  it('rejects an empty intent', () => {
    expect(() => createSpec('')).toThrow('Intent must not be empty')
  })
})
