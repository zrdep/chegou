import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { createTokenGuard } from './token.js'
import { createUploadHandler } from './upload.js'

// caminho absoluto da pasta public/, funciona de qualquer lugar onde o chegou for rodado
const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url))

// 10 GB por arquivo: o padrão do multipart é 1 MB, o que barraria quase qualquer foto
const MAX_FILE_SIZE = 10 * 1024 ** 3

/**
 * cria a instância do servidor com os plugins registrados
 * @param {{ port: number, dir: string, token: string, onFile?: function }} options
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
export async function createServer({ port, dir, token, onFile }) {
  const app = Fastify({ logger: false })

  await app.register(multipart, {
    limits: { fileSize: MAX_FILE_SIZE },
  })

  await app.register(fastifyStatic, {
    root: PUBLIC_DIR,
  })

  // página de envio: liberada, o token vem na própria url (?t=...)
  app.get('/', (request, reply) => {
    return reply.sendFile('index.html')
  })

  // upload: só passa quem tem o token certo
  app.post('/upload', {
    onRequest: createTokenGuard(token),
    handler: createUploadHandler(dir, { onFile }),
  })

  return app
}
