import { Hono } from 'hono'
import { createSpec } from './intent.js'
import { log } from './logger.js'

const app = new Hono()

app.get('/', (c) => c.json({ status: 'FlowState API running' }))

app.post('/intent', async (c) => {
  const { intent } = await c.req.json()
  try {
    const spec = createSpec(intent)
    log({ level: 'info', intent, specId: spec.id, status: spec.status })
    return c.json(spec, 201)
  } catch (err) {
    log({ level: 'error', intent, error: err.message })
    return c.json({ error: err.message }, 400)
  }
})

export default app
