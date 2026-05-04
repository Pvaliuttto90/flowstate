import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockDbValues = vi.hoisted(() => vi.fn())
const mockDbInsert = vi.hoisted(() => vi.fn())
const mockVerifyToken = vi.hoisted(() => vi.fn())

vi.mock('../db/index.js', () => ({
  db: { insert: mockDbInsert },
  specs: {},
}))

vi.mock('../ai.js', () => ({
  generateSpec: vi.fn().mockResolvedValue({
    acceptanceCriteria: ['Dashboard shows key metrics'],
    suggestedTests: ['Test metrics display correctly'],
  }),
}))

vi.mock('../generate-tests.js', () => ({ generateTests: vi.fn() }))
vi.mock('../spec.js', () => ({ getSpec: vi.fn(), saveGeneratedTests: vi.fn() }))

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({ verifyToken: mockVerifyToken }),
}))

import app from '../app.js'

describe('POST /intent', () => {
  beforeEach(() => {
    mockVerifyToken.mockResolvedValue({ sub: 'user_test' })
    mockDbInsert.mockReturnValue({ values: mockDbValues })
    mockDbValues.mockImplementation((vals) => ({
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

  it('returns a spec for a valid intent', async () => {
    const res = await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ intent: 'Add a login page with email and password' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toMatchObject({
      id: expect.any(String),
      intent: 'Add a login page with email and password',
      status: 'pending',
      createdAt: expect.any(String),
    })
  })

  it('returns 400 when intent is empty', async () => {
    const res = await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ intent: '' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toMatchObject({ error: 'Intent must not be empty' })
  })

  it('returns 400 when intent field is missing', async () => {
    const res = await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toMatchObject({ error: 'Intent must not be empty' })
  })

  it('response includes acceptanceCriteria and suggestedTests from the AI', async () => {
    const res = await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      body: JSON.stringify({ intent: 'Add a dashboard page' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.acceptanceCriteria).toBeInstanceOf(Array)
    expect(body.acceptanceCriteria.length).toBeGreaterThan(0)
    expect(body.suggestedTests).toBeInstanceOf(Array)
    expect(body.suggestedTests.length).toBeGreaterThan(0)
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'Add a login page' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('Invalid token'))
    const res = await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bad-token' },
      body: JSON.stringify({ intent: 'Add a login page' }),
    })

    expect(res.status).toBe(401)
  })
})
