import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'

// caminho absoluto da pasta public/, funciona de qualquer lugar onde o chegou for rodado
const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url))

// 10 GB por arquivo: o padrão do multipart é 1 MB, o que barraria quase qualquer foto
const MAX_FILE_SIZE = 10 * 1024 ** 3

/**
 * cria a instância do servidor com os plugins registrados
 * @param {{ port: number, dir: string, token: string }} options
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
export async function createServer({ port, dir, token }) {
  const app = Fastify({ logger: false })

  await app.register(multipart, {
    limits: { fileSize: MAX_FILE_SIZE },
  })

  await app.register(fastifyStatic, {
    root: PUBLIC_DIR,
  })

  return app
}
