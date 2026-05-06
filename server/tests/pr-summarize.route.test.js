import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockVerifyToken = vi.hoisted(() => vi.fn())
const mockGetSpec = vi.hoisted(() => vi.fn())
const mockSavePRSummary = vi.hoisted(() => vi.fn())
const mockGeneratePR = vi.hoisted(() => vi.fn())

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({ verifyToken: mockVerifyToken }),
}))

vi.mock('../db/index.js', () => ({
  db: { insert: vi.fn() },
  specs: {},
}))

vi.mock('../ai.js', () => ({ generateSpec: vi.fn() }))
vi.mock('../generate-tests.js', () => ({ generateTests: vi.fn() }))
vi.mock('../generate-code.js', () => ({ generateCode: vi.fn() }))

vi.mock('../spec.js', () => ({
  getSpec: mockGetSpec,
  saveGeneratedTests: vi.fn(),
  saveGeneratedCode: vi.fn(),
  savePRSummary: mockSavePRSummary,
}))

vi.mock('../generate-pr.js', () => ({
  generatePR: mockGeneratePR,
}))

import app from '../app.js'

const PR_SUMMARY = { title: 'Add login page', body: '## Summary\nImplements login flow\n\n## Changes\n- login function' }

const VALID_SPEC = {
  id: 'spec-uuid',
  solution: 'Add a login page',
  outcome: 'Increase user retention',
  opportunity: 'Users forget to return after first visit',
  hypothesis: null,
  successMetric: null,
  result: null,
  type: 'text',
  status: 'pending',
  acceptanceCriteria: ['User can log in'],
  suggestedTests: ['Test successful login'],
  generatedTests: "it('Test successful login', () => { expect.fail('not implemented') })",
  generatedCode: 'export function login(email, password) { return { success: true } }',
  prSummary: null,
  userId: 'user_test',
  createdAt: new Date('2026-05-04'),
}

describe('POST /pr/summarize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyToken.mockResolvedValue({ sub: 'user_test' })
    mockGetSpec.mockResolvedValue(VALID_SPEC)
    mockGeneratePR.mockResolvedValue(PR_SUMMARY)
    mockSavePRSummary.mockResolvedValue({ ...VALID_SPEC, prSummary: PR_SUMMARY })
  })

  it('returns specId and prSummary with title and body for a valid request', async () => {
    const res = await app.request('/pr/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ specId: 'spec-uuid' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.specId).toBe('spec-uuid')
    expect(typeof body.prSummary.title).toBe('string')
    expect(typeof body.prSummary.body).toBe('string')
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.request('/pr/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specId: 'spec-uuid' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('Invalid token'))
    const res = await app.request('/pr/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bad-token' },
      body: JSON.stringify({ specId: 'spec-uuid' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 400 when specId is missing', async () => {
    const res = await app.request('/pr/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 404 when spec is not found', async () => {
    mockGetSpec.mockResolvedValueOnce(null)
    const res = await app.request('/pr/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ specId: 'nonexistent-uuid' }),
    })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Spec not found')
  })

  it('returns 400 when spec has no generated code', async () => {
    mockGetSpec.mockResolvedValueOnce({ ...VALID_SPEC, generatedCode: null })
    const res = await app.request('/pr/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ specId: 'spec-uuid' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})
