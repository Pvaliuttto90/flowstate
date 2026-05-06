import { Hono } from 'hono'
import { createClerkClient } from '@clerk/backend'
import { createSpec } from './intent.js'
import { generateSpec } from './ai.js'
import { getSpec, saveGeneratedTests, saveGeneratedCode, savePRSummary } from './spec.js'
import { generateTests } from './generate-tests.js'
import { generateCode } from './generate-code.js'
import { generatePR } from './generate-pr.js'
import { log } from './logger.js'

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

const app = new Hono()

app.get('/', (c) => c.json({ status: 'FlowState API running' }))

app.post('/intent', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  let userId
  try {
    const payload = await clerkClient.verifyToken(token)
    userId = payload.sub
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { solution, outcome, opportunity, hypothesis, successMetric, code } = await c.req.json()
  const truncated = code !== undefined ? { code: code.slice(0, 200) } : {}
  try {
    const spec = await createSpec({ solution, outcome, opportunity, hypothesis, successMetric }, { userId })
    const aiDetails = await generateSpec(outcome, opportunity, solution)
    log({ level: 'info', solution, ...truncated, specId: spec.id, status: spec.status })
    return c.json({ ...spec, ...aiDetails }, 201)
  } catch (err) {
    log({ level: 'error', solution, ...truncated, error: err.message })
    return c.json({ error: err.message }, 400)
  }
})

app.post('/tests/generate', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    await clerkClient.verifyToken(token)
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { specId } = await c.req.json()
  if (!specId) return c.json({ error: 'specId is required' }, 400)

  const spec = await getSpec(specId)
  if (!spec) return c.json({ error: 'Spec not found' }, 404)

  if (!spec.suggestedTests?.length) {
    return c.json({ error: 'Spec has no suggested tests' }, 400)
  }

  try {
    const testStubs = await generateTests(spec.suggestedTests)
    await saveGeneratedTests(specId, testStubs)
    log({ level: 'info', specId, action: 'generate-tests' })
    return c.json({ specId, testStubs }, 200)
  } catch (err) {
    log({ level: 'error', specId, action: 'generate-tests', error: err.message })
    return c.json({ error: err.message }, 500)
  }
})

app.post('/code/generate', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    await clerkClient.verifyToken(token)
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { specId } = await c.req.json()
  if (!specId) return c.json({ error: 'specId is required' }, 400)

  const spec = await getSpec(specId)
  if (!spec) return c.json({ error: 'Spec not found' }, 404)

  if (!spec.generatedTests) {
    return c.json({ error: 'Tests have not been generated for this spec' }, 400)
  }

  try {
    const code = await generateCode(spec.solution, spec.acceptanceCriteria, spec.generatedTests)
    await saveGeneratedCode(specId, code)
    log({ level: 'info', specId, action: 'generate-code' })
    return c.json({ specId, code }, 200)
  } catch (err) {
    log({ level: 'error', specId, action: 'generate-code', error: err.message })
    return c.json({ error: err.message }, 500)
  }
})

app.post('/pr/summarize', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    await clerkClient.verifyToken(token)
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { specId } = await c.req.json()
  if (!specId) return c.json({ error: 'specId is required' }, 400)

  const spec = await getSpec(specId)
  if (!spec) return c.json({ error: 'Spec not found' }, 404)

  if (!spec.generatedCode) {
    return c.json({ error: 'Code has not been generated for this spec' }, 400)
  }

  try {
    const prSummary = await generatePR(spec.solution, spec.acceptanceCriteria, spec.generatedTests, spec.generatedCode)
    await savePRSummary(specId, prSummary)
    log({ level: 'info', specId, action: 'pr-summarize' })
    return c.json({ specId, prSummary }, 200)
  } catch (err) {
    log({ level: 'error', specId, action: 'pr-summarize', error: err.message })
    return c.json({ error: err.message }, 500)
  }
})

export default app
