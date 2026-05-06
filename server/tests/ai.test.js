import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    constructor() { this.messages = { create: mockCreate } }
  }
}))

import { generateSpec } from '../ai.js'

describe('generateSpec', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns acceptanceCriteria and suggestedTests arrays for a valid spec', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{
        type: 'text',
        text: JSON.stringify({
          acceptanceCriteria: ['User can log in with email and password'],
          suggestedTests: ['Test successful login', 'Test failed login with wrong password'],
        }),
      }],
    })

    const result = await generateSpec('increase user retention', 'users forget to return', 'Add a login page')

    expect(result.acceptanceCriteria).toBeInstanceOf(Array)
    expect(result.acceptanceCriteria.length).toBeGreaterThan(0)
    expect(result.suggestedTests).toBeInstanceOf(Array)
    expect(result.suggestedTests.length).toBeGreaterThan(0)
  })

  it('includes the outcome, opportunity, and solution in the Claude request', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{
        type: 'text',
        text: JSON.stringify({
          acceptanceCriteria: ['criterion'],
          suggestedTests: ['test'],
        }),
      }],
    })

    await generateSpec('increase retention', 'users forget to return', 'Build a dashboard')

    expect(mockCreate).toHaveBeenCalledOnce()
    const { messages } = mockCreate.mock.calls[0][0]
    expect(messages[0].content).toContain('increase retention')
    expect(messages[0].content).toContain('users forget to return')
    expect(messages[0].content).toContain('Build a dashboard')
  })
})
