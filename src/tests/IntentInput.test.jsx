import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import IntentInput from '../components/IntentInput.jsx'

const mockSpec = {
  id: 'abc-123',
  intent: 'Add a login page',
  status: 'pending',
  createdAt: new Date().toISOString(),
}

describe('IntentInput', () => {
  let mockFetch

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a text input and submit button', () => {
    render(<IntentInput />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('POSTs to /intent and displays the spec id and status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSpec,
    })

    const user = userEvent.setup()
    render(<IntentInput />)

    await user.type(screen.getByRole('textbox'), 'Add a login page')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(mockFetch).toHaveBeenCalledWith('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'Add a login page' }),
    })

    await waitFor(() => {
      expect(screen.getByText('abc-123')).toBeInTheDocument()
      expect(screen.getByText('pending')).toBeInTheDocument()
    })
  })
})
