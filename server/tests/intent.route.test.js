import { describe, it, expect } from 'vitest'
import app from '../app.js'

describe('POST /intent', () => {
  it('returns a spec for a valid intent', async () => {
    const res = await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: '' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toMatchObject({ error: 'Intent must not be empty' })
  })

  it('returns 400 when intent field is missing', async () => {
    const res = await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toMatchObject({ error: 'Intent must not be empty' })
  })
})
