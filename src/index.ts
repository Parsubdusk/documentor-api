// server.js
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'

const app = new Hono()

// Serve any file from the public directory
app.use('/public/*', serveStatic({ root: './' }))

// Serve the references page directly
app.get('/references', serveStatic({ path: './public/references.html' }))

// Other test routes
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/2', (c) => {
  return c.text('Great!')
})

const port = 3000
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})
