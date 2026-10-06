import { randomBytes } from 'node:crypto'

export function generateToken() {
  return randomBytes(4).toString('hex')
}