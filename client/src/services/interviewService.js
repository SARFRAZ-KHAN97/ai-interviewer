import { del, get as httpGet, post } from './api'

export const create = (payload) => post('/interviews', payload)
export const list = () => httpGet('/interviews')
export const get = (id) => httpGet(`/interviews/${id}`)
export const remove = (id) => del(`/interviews/${id}`)
