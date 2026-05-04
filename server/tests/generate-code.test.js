import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    constructor() { this.messages = { create: mockCreate } }
  }
}))

import { generateCode } from '../generate-code.js'

describe('generateCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a non-empty string of implementation code', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'export function login(email, password) { return true }' }],
    })

    const result = await generateCode('Add login', ['User can log in'], "it('logs in', () => {})")

    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes the intent in the Claude request', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'code' }],
    })

    await generateCode('Add login page', ['criterion'], 'stubs')

    const { messages } = mockCreate.mock.calls[0][0]
    expect(messages[0].content).toContain('Add login page')
  })

  it('includes acceptance criteria in the Claude request', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'code' }],
    })

    await generateCode('intent', ['User can log in with email', 'User sees error on bad password'], 'stubs')

    const { messages } = mockCreate.mock.calls[0][0]
    expect(messages[0].content).toContain('User can log in with email')
  })

  it('includes the test stubs in the Claude request', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'code' }],
    })

    await generateCode('intent', ['criterion'], "it('Test successful login', () => { expect.fail('not implemented') })")

    const { messages } = mockCreate.mock.calls[0][0]
    expect(messages[0].content).toContain('Test successful login')
  })
})
