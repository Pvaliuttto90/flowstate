import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockVerifyToken = vi.hoisted(() => vi.fn())
const mockGetSpec = vi.hoisted(() => vi.fn())
const mockSaveGeneratedTests = vi.hoisted(() => vi.fn())
const mockGenerateTests = vi.hoisted(() => vi.fn())

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({ verifyToken: mockVerifyToken }),
}))

vi.mock('../db/index.js', () => ({
  db: { insert: vi.fn() },
  specs: {},
}))

vi.mock('../ai.js', () => ({
  generateSpec: vi.fn(),
}))

vi.mock('../spec.js', () => ({
  getSpec: mockGetSpec,
  saveGeneratedTests: mockSaveGeneratedTests,
}))

vi.mock('../generate-tests.js', () => ({
  generateTests: mockGenerateTests,
}))

import app from '../app.js'

const VALID_SPEC = {
  id: 'spec-uuid',
  intent: 'Add a login page',
  type: 'text',
  status: 'pending',
  acceptanceCriteria: ['User can log in'],
  suggestedTests: ['Test successful login', 'Test failed login'],
  generatedTests: null,
  userId: 'user_test',
  createdAt: new Date('2026-05-04'),
}

const STUBS = "import { describe, it, expect } from 'vitest'\ndescribe('login', () => { it('Test successful login', () => { expect.fail('not implemented') }) })"

describe('POST /tests/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyToken.mockResolvedValue({ sub: 'user_test' })
    mockGetSpec.mockResolvedValue(VALID_SPEC)
    mockGenerateTests.mockResolvedValue(STUBS)
    mockSaveGeneratedTests.mockResolvedValue({ ...VALID_SPEC, generatedTests: STUBS })
  })

  it('returns specId and testStubs for a valid request', async () => {
    const res = await app.request('/tests/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ specId: 'spec-uuid' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.specId).toBe('spec-uuid')
    expect(typeof body.testStubs).toBe('string')
    expect(body.testStubs).toContain('it(')
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.request('/tests/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specId: 'spec-uuid' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('Invalid token'))
    const res = await app.request('/tests/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bad-token' },
      body: JSON.stringify({ specId: 'spec-uuid' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 400 when specId is missing', async () => {
    const res = await app.request('/tests/generate', {
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
    const res = await app.request('/tests/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ specId: 'nonexistent-uuid' }),
    })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Spec not found')
  })

  it('returns 400 when spec has no suggestedTests', async () => {
    mockGetSpec.mockResolvedValueOnce({ ...VALID_SPEC, suggestedTests: [] })
    const res = await app.request('/tests/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ specId: 'spec-uuid' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})
