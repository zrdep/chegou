// --timeout: desliga sozinho depois de X minutos SEM uso
//
// cada requisição zera o relógio e nunca desliga no meio de um envio.
// o /events (conexão sempre aberta com o celular) não conta como uso.

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ minutes: number, onIdle: () => void }} options
 * @returns {{ reset: () => void, stop: () => void }}
 */
export function watchIdle(app, { minutes, onIdle }) {
  if (!minutes) return { reset() {}, stop() {} }

  let timer = null
  let inFlight = 0
  const counted = new WeakSet()

  const reset = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      // ainda tem upload/download rolando: espera mais um pouco
      if (inFlight > 0) return reset()
      onIdle()
    }, minutes * 60_000)
  }

  const finish = (request) => {
    if (!counted.has(request)) return
    counted.delete(request)
    inFlight--
    reset()
  }

  app.addHook('onRequest', async (request) => {
    if (request.url.startsWith('/events')) return
    counted.add(request)
    inFlight++
    reset()
  })
  app.addHook('onResponse', async (request) => finish(request))
  app.addHook('onRequestAbort', async (request) => finish(request))

  return { reset, stop: () => clearTimeout(timer) }
}
