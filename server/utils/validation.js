import { AppError } from './AppError.js'

export const parseWithSchema = (schema, data) => {
  const result = schema.safeParse(data)

  if (!result.success) {
    const error = AppError.badRequest('Validation failed', 'VALIDATION_ERROR')
    error.details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    throw error
  }

  return result.data
}
