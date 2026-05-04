import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    constructor() { this.messages = { create: mockCreate } }
  }
}))

import { generatePR } from '../generate-pr.js'

const INTENT = 'Add a login page'
const CRITERIA = ['User can log in with email', 'User sees error on bad password']
const TEST_STUBS = "it('logs in', () => { expect.fail('not implemented') })"
const CODE = 'export function login(email, password) { return { success: true } }'

describe('generatePR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an object with title and body strings', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ title: 'Add login page', body: 'Implements login flow' }) }],
    })

    const result = await generatePR(INTENT, CRITERIA, TEST_STUBS, CODE)

    expect(typeof result.title).toBe('string')
    expect(typeof result.body).toBe('string')
    expect(result.title.length).toBeGreaterThan(0)
    expect(result.body.length).toBeGreaterThan(0)
  })

  it('includes the intent in the Claude request', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ title: 'x', body: 'y' }) }],
    })

    await generatePR(INTENT, CRITERIA, TEST_STUBS, CODE)

    const { messages } = mockCreate.mock.calls[0][0]
    expect(messages[0].content).toContain(INTENT)
  })

  it('includes the generated code in the Claude request', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ title: 'x', body: 'y' }) }],
    })

    await generatePR(INTENT, CRITERIA, TEST_STUBS, CODE)

    const { messages } = mockCreate.mock.calls[0][0]
    expect(messages[0].content).toContain('export function login')
  })
})
