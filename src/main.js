// o fluxo do chegou, do comando até o ctrl+c:
//   opções -> rede -> modo (local/túnel) -> servidor -> túnel -> banner -> terminal interativo

import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import pc from 'picocolors'
import { fail, parseArgs } from './cli/args.js'
import { watchIdle } from './cli/idle.js'
import { revealFile } from './cli/open.js'
import { chooseMode } from './cli/prompt.js'
import { loadSettings, saveSettings } from './cli/settings.js'
import { checkForUpdate } from './cli/update.js'
import { printBanner, printDownloaded, printError, printFile, printGoodbye, printOpened, printOpenSetting, printProblem, printShared, printUpdate, printWarning } from './cli/ui.js'
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

  // já começa a perguntar pro npm se tem versão nova (em paralelo, sem esperar)
  const update = checkForUpdate(version)

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

  // 4. servidor; no primeiro arquivo que chega, abre a pasta com ele selecionado
  //    (liga/desliga com --open, e a escolha fica salva)
  const settings = loadSettings()
  if (options.open !== undefined) {
    settings.openFolder = options.open === 'toggle' ? !settings.openFolder : options.open
    printOpenSetting({ enabled: settings.openFolder, saved: saveSettings(settings) })
  }

  let opened = false
  function onFile(file) {
    printFile(file)
    if (settings.openFolder && !opened) {
      opened = true
      revealFile(join(options.dir, file.name))
      printOpened()
    }
  }

  // token errado aparece no máximo 1x a cada 10 s por aparelho (sem encher a tela)
  const lastUnauthorized = new Map()
  function onProblem(problem) {
    if (problem.kind === 'unauthorized') {
      const last = lastUnauthorized.get(problem.ip) ?? 0
      if (Date.now() - last < 10_000) return
      lastUnauthorized.set(problem.ip, Date.now())
    }
    printProblem(problem)
  }

  const app = await createServer({
    dir: options.dir,
    token,
    shareManager,
    onFile,
    onDownload: printDownloaded,
    onProblem,
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
  update.then((info) => info && !closing && printUpdate(info))

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
