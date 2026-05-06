import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockValues = vi.hoisted(() => vi.fn())
const mockInsert = vi.hoisted(() => vi.fn())

vi.mock('../../server/db/index.js', () => ({
  db: { insert: mockInsert },
  specs: {},
}))

import { createSpec } from '../../server/intent.js'

describe('Intent → Spec', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({ values: mockValues })
    mockValues.mockImplementation((vals) => ({
      returning: () =>
        Promise.resolve([{
          id: 'test-uuid',
          type: 'text',
          status: 'pending',
          acceptanceCriteria: [],
          suggestedTests: [],
          userId: null,
          createdAt: new Date('2026-05-04'),
          ...vals,
        }]),
    }))
  })

  it('inserts the spec into the database and returns the saved row', async () => {
    const solution = 'Add a login page with email and password fields'

    const spec = await createSpec({ solution, outcome: 'Increase retention', opportunity: 'Users churn early' })

    expect(mockInsert).toHaveBeenCalledOnce()
    expect(spec).toMatchObject({
      id: expect.any(String),
      solution,
      status: 'pending',
      createdAt: expect.any(Date),
    })
  })

  it('includes the solution in the inserted row', async () => {
    await createSpec({ solution: 'Build a dashboard' })

    const [insertedValues] = mockValues.mock.calls[0]
    expect(insertedValues.solution).toBe('Build a dashboard')
  })

  it('rejects an empty solution without touching the database', async () => {
    await expect(createSpec({ solution: '' })).rejects.toThrow('Solution must not be empty')
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
