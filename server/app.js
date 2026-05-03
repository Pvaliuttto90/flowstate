import { Hono } from 'hono'
import { createSpec } from './intent.js'

const app = new Hono()

app.get('/', (c) => c.json({ status: 'FlowState API running' }))

app.post('/intent', async (c) => {
  const { intent } = await c.req.json()
  try {
    const spec = createSpec(intent)
    return c.json(spec, 201)
  } catch (err) {
    return c.json({ error: err.message }, 400)
  }
})

export default app
