import { Hono } from 'hono'
import { createSpec } from './intent.js'
import { generateSpec } from './ai.js'
import { log } from './logger.js'

const app = new Hono()

app.get('/', (c) => c.json({ status: 'FlowState API running' }))

app.post('/intent', async (c) => {
  const { intent, code } = await c.req.json()
  const truncated = code !== undefined ? { code: code.slice(0, 200) } : {}
  try {
    const spec = createSpec(intent)
    const aiDetails = await generateSpec(intent)
    log({ level: 'info', intent, ...truncated, specId: spec.id, status: spec.status })
    return c.json({ ...spec, ...aiDetails }, 201)
  } catch (err) {
    log({ level: 'error', intent, ...truncated, error: err.message })
    return c.json({ error: err.message }, 400)
  }
})

export default app
