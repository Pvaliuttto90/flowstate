import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/', (c) => c.json({ status: 'FlowState API running' }))

serve({ fetch: app.fetch, port: 3001 }, () => {
  console.log('Server running on http://localhost:3001')
})