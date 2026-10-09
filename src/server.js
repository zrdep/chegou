import { createReadStream, existsSync } from 'node:fs'
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
 * @param {{ port: number, dir: string, token: string, onFile?: function, shareManager?: import('./share.js').createShareManager, onDownload?: function }} options
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
export async function createServer({ port, dir, token, onFile, shareManager, onDownload }) {
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

  // upload: celular -> PC
  app.post('/upload', {
    onRequest: createTokenGuard(token),
    handler: createUploadHandler(dir, { onFile }),
  })

  // lista de itens compartilhados do PC pro celular
  app.get('/api/shared', {
    onRequest: createTokenGuard(token),
    handler: async () => {
      const items = shareManager ? shareManager.getPublicItems(token) : []
      return { items }
    },
  })

  // eventos em tempo real (SSE): avisa o celular na hora que o PC compartilha algo novo
  app.get('/events', {
    onRequest: createTokenGuard(token),
    handler: (request, reply) => {
      // a partir daqui a conexão é nossa: o fastify não tenta fechar nem responder
      reply.hijack()
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        // proxies (e o túnel do Cloudflare) não podem segurar os eventos
        'X-Accel-Buffering': 'no',
      })
      request.raw.socket?.setNoDelay?.(true)

      // se cair, o navegador tenta de novo em 2 s
      reply.raw.write('retry: 2000\n\n')

      // envia os itens que já existem de início
      const initial = shareManager ? shareManager.getPublicItems(token) : []
      reply.raw.write(`event: init\ndata: ${JSON.stringify(initial)}\n\n`)

      const onNewItem = (event, item) => {
        const publicItem = shareManager.toPublic(item, token)
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(publicItem)}\n\n`)
      }

      shareManager?.subscribe(onNewItem)

      // "batimento" a cada 15 s: impede que roteador, celular ou Cloudflare
      // derrubem a conexão parada (o Cloudflare corta em ~100 s sem tráfego)
      const heartbeat = setInterval(() => reply.raw.write(': ping\n\n'), 15_000)

      request.raw.on('close', () => {
        clearInterval(heartbeat)
        shareManager?.unsubscribe(onNewItem)
      })
    },
  })

  // download de arquivo do PC pelo celular
  app.get('/download/:id', {
    onRequest: createTokenGuard(token),
    handler: async (request, reply) => {
      const { id } = request.params
      const item = shareManager?.getItem(id)

      if (!item || item.type !== 'file' || !existsSync(item.path)) {
        return reply.code(404).send({ error: 'arquivo não encontrado' })
      }

      onDownload?.({ name: item.name, size: item.size })

      const encoded = encodeURIComponent(item.name)
      reply.header('Content-Disposition', `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`)
      reply.header('Content-Length', item.size)
      reply.type('application/octet-stream')

      return reply.send(createReadStream(item.path))
    },
  })

  // compartilhar texto pelo navegador
  app.post('/api/share', {
    onRequest: createTokenGuard(token),
    handler: async (request, reply) => {
      const body = request.body || {}
      const text = body.text
      if (!text) return reply.code(400).send({ error: 'texto obrigatório' })
      const item = shareManager.addText(text)
      return { item: shareManager.toPublic(item, token) }
    },
  })

  return app
}

