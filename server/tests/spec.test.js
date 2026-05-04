import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockDbWhere = vi.hoisted(() => vi.fn())
const mockDbFrom = vi.hoisted(() => vi.fn())
const mockDbSelect = vi.hoisted(() => vi.fn())
const mockDbUpdateSet = vi.hoisted(() => vi.fn())
const mockDbUpdateWhere = vi.hoisted(() => vi.fn())
const mockDbUpdateReturning = vi.hoisted(() => vi.fn())
const mockDbUpdate = vi.hoisted(() => vi.fn())

vi.mock('../db/index.js', () => ({
  db: {
    select: mockDbSelect,
    update: mockDbUpdate,
  },
  specs: {},
}))

import { getSpec, saveGeneratedTests, saveGeneratedCode, savePRSummary } from '../spec.js'

const SPEC = {
  id: 'spec-uuid',
  intent: 'Add login page',
  type: 'text',
  status: 'pending',
  acceptanceCriteria: [],
  suggestedTests: ['Test login'],
  generatedTests: null,
  userId: 'user_test',
  createdAt: new Date('2026-05-04'),
}

describe('getSpec', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbSelect.mockReturnValue({ from: mockDbFrom })
    mockDbFrom.mockReturnValue({ where: mockDbWhere })
  })

  it('returns the spec row when found', async () => {
    mockDbWhere.mockResolvedValue([SPEC])

    const result = await getSpec('spec-uuid')

    expect(result).toMatchObject({ id: 'spec-uuid', intent: 'Add login page' })
  })

  it('returns null when spec is not found', async () => {
    mockDbWhere.mockResolvedValue([])

    const result = await getSpec('nonexistent')

    expect(result).toBeNull()
  })
})

describe('saveGeneratedTests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbUpdate.mockReturnValue({ set: mockDbUpdateSet })
    mockDbUpdateSet.mockReturnValue({ where: mockDbUpdateWhere })
    mockDbUpdateWhere.mockReturnValue({ returning: mockDbUpdateReturning })
  })

  it('saves and returns the updated spec row', async () => {
    mockDbUpdateReturning.mockResolvedValue([{ ...SPEC, generatedTests: 'stub content' }])

    const result = await saveGeneratedTests('spec-uuid', 'stub content')

    expect(result).toMatchObject({ id: 'spec-uuid', generatedTests: 'stub content' })
  })
})

describe('saveGeneratedCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbUpdate.mockReturnValue({ set: mockDbUpdateSet })
    mockDbUpdateSet.mockReturnValue({ where: mockDbUpdateWhere })
    mockDbUpdateWhere.mockReturnValue({ returning: mockDbUpdateReturning })
  })

  it('saves and returns the updated spec row', async () => {
    mockDbUpdateReturning.mockResolvedValue([{ ...SPEC, generatedCode: 'export function x() {}' }])

    const result = await saveGeneratedCode('spec-uuid', 'export function x() {}')

    expect(result).toMatchObject({ id: 'spec-uuid', generatedCode: 'export function x() {}' })
  })
})

describe('savePRSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbUpdate.mockReturnValue({ set: mockDbUpdateSet })
    mockDbUpdateSet.mockReturnValue({ where: mockDbUpdateWhere })
    mockDbUpdateWhere.mockReturnValue({ returning: mockDbUpdateReturning })
  })

  it('saves and returns the updated spec row', async () => {
    const prSummary = { title: 'Add login', body: 'Implements login flow' }
    mockDbUpdateReturning.mockResolvedValue([{ ...SPEC, prSummary }])

    const result = await savePRSummary('spec-uuid', prSummary)

    expect(result).toMatchObject({ id: 'spec-uuid', prSummary })
  })
})
