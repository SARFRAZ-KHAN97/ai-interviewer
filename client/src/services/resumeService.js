import { del, get, post } from './api'

export const list = () => get('/resumes')

export const upload = (file) => {
  const form = new FormData()
  form.append('resume', file)
  return post('/resumes', form)
}

export const remove = (id) => del(`/resumes/${id}`)
