import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import app from '../app.js'

describe('POST /intent — structured logging', () => {
  let spy

  beforeEach(() => {
    spy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    spy.mockRestore()
  })

  it('logs intent, spec id, and status on success', async () => {
    await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'Add a dashboard page' }),
    })

    expect(spy).toHaveBeenCalledOnce()
    const entry = JSON.parse(spy.mock.calls[0][0])
    expect(entry).toMatchObject({
      level: 'info',
      timestamp: expect.any(String),
      intent: 'Add a dashboard page',
      specId: expect.any(String),
      status: 'pending',
    })
    expect(new Date(entry.timestamp).getTime()).not.toBeNaN()
  })

  it('logs intent and full error context on failure', async () => {
    await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: '' }),
    })

    expect(spy).toHaveBeenCalledOnce()
    const entry = JSON.parse(spy.mock.calls[0][0])
    expect(entry).toMatchObject({
      level: 'error',
      timestamp: expect.any(String),
      intent: '',
      error: 'Intent must not be empty',
    })
    expect(new Date(entry.timestamp).getTime()).not.toBeNaN()
  })
})
