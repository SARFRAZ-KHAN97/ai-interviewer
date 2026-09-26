import { parseWithSchema } from '../utils/validation.js'

export const validate = (schema) => (req, res, next) => {
  try {
    req.body = parseWithSchema(schema, req.body)
    next()
  } catch (err) {
    next(err)
  }
}
