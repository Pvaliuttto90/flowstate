import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    constructor() { this.messages = { create: mockCreate } }
  }
}))

import { generateTests } from '../generate-tests.js'

describe('generateTests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a string containing Vitest it() stubs', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: "import { describe, it, expect } from 'vitest'\ndescribe('f', () => { it('passes', () => { expect.fail('not implemented') }) })" }],
    })

    const result = await generateTests(['user can log in'])

    expect(typeof result).toBe('string')
    expect(result).toContain('it(')
  })

  it('includes each scenario in the Claude request', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: "it('a', () => {})\nit('b', () => {})" }],
    })

    await generateTests(['user can log in', 'user can log out'])

    const { messages } = mockCreate.mock.calls[0][0]
    expect(messages[0].content).toContain('user can log in')
    expect(messages[0].content).toContain('user can log out')
  })
})
