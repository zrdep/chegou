// o fluxo do chegou, do comando até o ctrl+c:
//   opções -> rede -> modo (local/túnel) -> servidor -> túnel -> banner -> terminal interativo

import { mkdirSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import pc from 'picocolors'
import { fail, parseArgs } from './cli/args.js'
import { watchIdle } from './cli/idle.js'
import { chooseMode } from './cli/prompt.js'
import { printBanner, printDownloaded, printError, printFile, printGoodbye, printShared, printWarning } from './cli/ui.js'
import { TOKEN_BYTES } from './config.js'
import { t } from './i18n/index.js'
import { findFreePort, getLocalIP } from './net/network.js'
import { openTunnel } from './net/tunnel.js'
import { createServer } from './server/index.js'
import { createShareManager } from './server/share.js'
import { generateToken } from './server/token.js'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

export async function run(argv = process.argv.slice(2)) {
  // 1. opções e pasta de destino
  const options = parseArgs(argv)

  try {
    mkdirSync(options.dir, { recursive: true })
  } catch (err) {
    fail(t('errors.mkdir', { dir: options.dir, code: err.code }))
  }

  // 2. rede local e modo de conexão (a flag manda; sem flag, pergunta se tiver alguém no terminal)
  const ip = getLocalIP()
  let mode = options.mode
  if (!mode) {
    mode = process.stdin.isTTY && process.stdout.isTTY ? await chooseMode({ hasLan: Boolean(ip) }) : 'local'
  }

  const token = generateToken(TOKEN_BYTES[mode])

  let port
  try {
    port = await findFreePort(options.port)
  } catch (err) {
    fail(err.message)
  }

  // 3. o que o PC já deixa pronto pro celular (arquivos, pastas ou links do comando)
  const shareManager = createShareManager()
  for (const item of options.items) {
    try {
      shareManager.addArg(item).errors.forEach(printWarning)
    } catch (err) {
      printWarning(err.message)
    }
  }

  // 4. servidor
  const app = await createServer({
    dir: options.dir,
    token,
    shareManager,
    onFile: printFile,
    onDownload: printDownloaded,
  })

  let tunnel = null
  let closing = false

  const idle = watchIdle(app, { minutes: options.timeout, onIdle: () => shutdown('timeout') })

  /** @param {'ctrl+c' | 'timeout'} reason */
  async function shutdown(reason) {
    if (closing) return
    closing = true
    idle.stop()
    printGoodbye({ reason, minutes: options.timeout })
    await tunnel?.close()
    await app.close()
    process.exit(0)
  }

  try {
    await app.listen({ port, host: '0.0.0.0' })
  } catch (err) {
    fail(t('errors.listen', { reason: err.code ?? err.message }), false)
  }

  // 5. túnel Cloudflare (se escolheu)
  let relayUrl = null
  if (mode === 'tunnel') {
    const status = (message) => process.stdout.write(`\r\x1b[2K  ${pc.cyan('●')} ${pc.dim(message)}`)
    try {
      tunnel = await openTunnel(port, { onStatus: status })
      relayUrl = tunnel.url
      process.stdout.write('\r\x1b[2K')
    } catch (err) {
      process.stdout.write('\r\x1b[2K')
      if (!ip) fail(t('errors.tunnelNoLan', { reason: err.message }), false)
      printWarning(t('errors.tunnelFallback', { reason: err.message }))
      mode = 'local'
    }
  }

  // 6. banner com o QR
  printBanner({ ip, port, preferredPort: options.port, dir: options.dir, token, version, timeout: options.timeout, relayUrl })
  idle.reset()
  shareManager.getAll().forEach(printShared)

  // 7. terminal interativo: arrastar arquivos/pastas, colar link ou "q" pra sair
  if (process.stdin.isTTY || !process.env.CI) {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false })
    rl.on('line', onLine)
  }

  function onLine(line) {
    const input = line.trim()
    if (!input) return
    if (input.toLowerCase() === 'q') return shutdown('ctrl+c')

    try {
      const { added, errors } = shareManager.addInput(input)
      added.forEach(printShared)
      errors.forEach(printWarning)
      idle.reset()
    } catch (err) {
      printError(err.message)
    }
  }

  process.on('SIGINT', () => shutdown('ctrl+c'))
}
