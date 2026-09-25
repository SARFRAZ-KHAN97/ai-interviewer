import { createServer } from 'node:http'

import app from './app.js'
import { connectDB } from './config/db.js'
import { env } from './config/env.js'

const server = createServer(app)

connectDB()
  .then(() => {
    server.listen(env.PORT, () => {
      console.log(`Server listening on http://localhost:${env.PORT}`)
    })
  })
  .catch((err) => {
    console.error(`Failed to connect to MongoDB: ${err.message}`)
    process.exit(1)
  })
