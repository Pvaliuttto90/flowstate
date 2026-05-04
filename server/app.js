import { Hono } from 'hono'
import { createClerkClient } from '@clerk/backend'
import { createSpec } from './intent.js'
import { generateSpec } from './ai.js'
import { getSpec, saveGeneratedTests } from './spec.js'
import { generateTests } from './generate-tests.js'
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

  const { intent, code } = await c.req.json()
  const truncated = code !== undefined ? { code: code.slice(0, 200) } : {}
  try {
    const spec = await createSpec(intent, { userId })
    const aiDetails = await generateSpec(intent)
    log({ level: 'info', intent, ...truncated, specId: spec.id, status: spec.status })
    return c.json({ ...spec, ...aiDetails }, 201)
  } catch (err) {
    log({ level: 'error', intent, ...truncated, error: err.message })
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

export default app
