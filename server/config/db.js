import mongoose from 'mongoose'

import { env } from './env.js'

mongoose.connection.on('connected', () => console.log('MongoDB connected'))
mongoose.connection.on('error', (err) => console.error(`MongoDB error: ${err.message}`))
mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'))

export const connectDB = async () => {
  await mongoose.connect(env.MONGODB_URI)
}

export const disconnectDB = async () => {
  await mongoose.disconnect()
}
