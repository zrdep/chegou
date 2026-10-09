import { randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * token aleatório pra sessão
 * @param {number} bytes 4 na rede local; mais no túnel, onde a url é pública
 * @returns {string}
 */
export function generateToken(bytes = 4) {
  return randomBytes(bytes).toString('hex')
}

/**
 * cria um hook do fastify que bloqueia requisições sem o token certo
 * @param {string} token
 * @returns {function}
 */
export function createTokenGuard(token) {
  const expected = Buffer.from(token)

  return async (request, reply) => {
    const received = Buffer.from(String(request.query.t ?? ''))

    const valid =
      received.length === expected.length &&
      timingSafeEqual(received, expected)

    if (!valid) {
      return reply.code(401).send({ error: 'unauthorized' })
    }
  }
}