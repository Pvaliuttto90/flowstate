import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import app from '../app.js'

vi.mock('../ai.js', () => ({
  generateSpec: vi.fn().mockResolvedValue({
    acceptanceCriteria: ['criterion'],
    suggestedTests: ['test'],
  }),
}))

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

  it('logs code truncated to 200 chars on success', async () => {
    const code = 'x'.repeat(300)

    await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'Add a login page', code }),
    })

    expect(spy).toHaveBeenCalledOnce()
    const entry = JSON.parse(spy.mock.calls[0][0])
    expect(entry).toMatchObject({
      level: 'info',
      intent: 'Add a login page',
      code: 'x'.repeat(200),
      specId: expect.any(String),
      status: 'pending',
    })
  })

  it('logs short code without truncation on success', async () => {
    const code = 'const x = 1'

    await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'Add a login page', code }),
    })

    const entry = JSON.parse(spy.mock.calls[0][0])
    expect(entry.code).toBe(code)
  })

  it('logs code context on error', async () => {
    const code = 'const x = 1'

    await app.request('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: '', code }),
    })

    expect(spy).toHaveBeenCalledOnce()
    const entry = JSON.parse(spy.mock.calls[0][0])
    expect(entry).toMatchObject({
      level: 'error',
      intent: '',
      code,
      error: 'Intent must not be empty',
    })
  })
})
