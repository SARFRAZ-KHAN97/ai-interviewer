import { get, post } from './api'

export const register = (payload) => post('/auth/register', payload)
export const login = (payload) => post('/auth/login', payload)
export const logout = () => post('/auth/logout')
export const me = () => get('/auth/me')
